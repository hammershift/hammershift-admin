/**
 * Integration Tests: Cron Jobs
 *
 * Tests for all 5 cron job endpoints with mocked dependencies
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Users from '@/app/models/user.model';
import Auctions from '@/app/models/auction.model';
import Predictions from '@/app/models/prediction.model';

// Mock fetch for internal API calls
global.fetch = jest.fn();

// Mock external integrations
jest.mock('@/app/lib/customerio', () => ({
  identifyUser: jest.fn().mockResolvedValue(undefined),
  trackCustomerIOEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/lib/scoringEngine', () => ({
  scoreAuctionPredictions: jest.fn().mockResolvedValue(5),
}));

describe('Cron Jobs Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status with cron authentication', async () => {
      const { NextRequest } = await import('next/server');
      const { GET } = await import('@/app/api/cron/health/route');

      // CRON_SECRET not set → verifyCronRequest returns true (dev mode)
      const req = new NextRequest('http://localhost:3000/api/cron/health');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.cron_jobs).toHaveLength(6);
      expect(data.cron_jobs[0].name).toBe('leaderboard-refresh');
    });
  });

  describe('Leaderboard Refresh', () => {
    it('should call refresh endpoint for all periods', async () => {
      process.env.CRON_SECRET = 'test-secret';
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

      // Mock fetch responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Leaderboard refreshed',
          users_ranked: 10,
        }),
      });

      const { GET } = await import('@/app/api/cron/leaderboard-refresh/route');

      const req = new Request('http://localhost:3000/api/cron/leaderboard-refresh', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(3);
      expect(data.results.every((r: any) => r.success)).toBe(true);

      // Verify fetch called 3 times (weekly, monthly, alltime)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      process.env.CRON_SECRET = 'test-secret';
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

      // Mock fetch to fail for one period
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Success' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Success' }),
        });

      const { GET } = await import('@/app/api/cron/leaderboard-refresh/route');

      const req = new Request('http://localhost:3000/api/cron/leaderboard-refresh', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status
      expect(data.results.filter((r: any) => r.success)).toHaveLength(2);
      expect(data.results.filter((r: any) => !r.success)).toHaveLength(1);
    });
  });

  describe('Weekly Digest', () => {
    it('should find active users and trigger digest events', async () => {
      process.env.CRON_SECRET = 'test-secret';

      // Create test users
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const users = await Users.create([
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
          fullName: 'User One',
          email: 'user1@test.com',
          role: 'USER',
          last_prediction_at: new Date(),
          email_preferences: { digests: true, marketing: true, tournaments: true, results: true },
          isActive: true,
          isBanned: false,
          total_points: 100,
          current_streak: 5,
          rank_title: 'Rising Star' as const,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'user2',
          fullName: 'User Two',
          email: 'user2@test.com',
          role: 'USER',
          last_prediction_at: thirtyDaysAgo,
          email_preferences: { digests: false, marketing: true, tournaments: true, results: true },
          isActive: true,
          isBanned: false,
        },
      ]);

      const { GET } = await import('@/app/api/cron/weekly-digest/route');
      const customerio = await import('@/app/lib/customerio');

      const req = new Request('http://localhost:3000/api/cron/weekly-digest', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users_found).toBe(1); // Only user1 qualifies
      expect(data.triggered).toBe(1);

      // Verify Customer.io calls
      expect(customerio.identifyUser).toHaveBeenCalledTimes(1);
      expect(customerio.trackCustomerIOEvent).toHaveBeenCalledWith(
        users[0]._id.toString(),
        'weekly_digest_triggered',
        expect.any(Object)
      );
    });
  });

  describe('Inactive Users', () => {
    it('should detect users inactive for 7 and 14 days', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const now = Date.now();
      const d7 = new Date(now - 7.5 * 24 * 60 * 60 * 1000); // 7.5 days ago
      const d14 = new Date(now - 14.5 * 24 * 60 * 60 * 1000); // 14.5 days ago

      await Users.create([
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'inactive7',
          fullName: 'Inactive 7',
          email: 'inactive7@test.com',
          role: 'USER',
          last_prediction_at: d7,
          isActive: true,
          isBanned: false,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'inactive14',
          fullName: 'Inactive 14',
          email: 'inactive14@test.com',
          role: 'USER',
          last_prediction_at: d14,
          isActive: true,
          isBanned: false,
        },
      ]);

      const { GET } = await import('@/app/api/cron/inactive-users/route');
      const customerio = await import('@/app/lib/customerio');

      const req = new Request('http://localhost:3000/api/cron/inactive-users', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.d7_inactive).toBe(1);
      expect(data.d14_inactive).toBe(1);
      expect(data.total_triggered).toBe(2);

      expect(customerio.trackCustomerIOEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Stale Auctions', () => {
    it('should score ended auctions with hammer price', async () => {
      process.env.CRON_SECRET = 'test-secret';

      // Create ended auction with hammer price
      const auction = await Auctions.create({
        _id: new mongoose.Types.ObjectId(),
        auction_id: 'test-auction-1',
        title: 'Test Auction',
        website: 'test.com',
        image: 'image.jpg',
        page_url: 'https://test.com/auction',
        isActive: true,
        ended: false,
        attributes: [{ key: 'hammer_price', value: 50000, _id: new mongoose.Types.ObjectId() }],
        sort: {
          deadline: new Date(Date.now() - 1000), // Ended 1 second ago
          price: 50000,
          bids: 10,
        },
      });

      // Create predictions
      const userId = new mongoose.Types.ObjectId();
      await Predictions.create([
        {
          auction_id: auction._id,
          predictedPrice: 48000,
          predictionType: 'standard',
          isActive: true,
          refunded: false,
          user: {
            userId,
            fullName: 'Test User',
            username: 'testuser',
            role: 'USER',
          },
        },
      ]);

      const { GET } = await import('@/app/api/cron/stale-auctions/route');
      const scoringEngine = await import('@/app/lib/scoringEngine');

      const req = new Request('http://localhost:3000/api/cron/stale-auctions', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auctions_closed).toBeGreaterThan(0);

      // Verify scoring engine called
      expect(scoringEngine.scoreAuctionPredictions).toHaveBeenCalled();
    });

    it('should mark unsuccessful auctions after 48h without hammer price', async () => {
      process.env.CRON_SECRET = 'test-secret';

      // Create auction ended 49h ago without hammer price
      await Auctions.create({
        _id: new mongoose.Types.ObjectId(),
        auction_id: 'test-auction-2',
        title: 'Unsuccessful Auction',
        website: 'test.com',
        image: 'image.jpg',
        page_url: 'https://test.com/auction',
        isActive: true,
        ended: false,
        attributes: [],
        sort: {
          deadline: new Date(Date.now() - 49 * 60 * 60 * 1000),
          price: 0,
          bids: 0,
        },
      });

      const { GET } = await import('@/app/api/cron/stale-auctions/route');

      const req = new Request('http://localhost:3000/api/cron/stale-auctions', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auctions_unsuccessful).toBeGreaterThan(0);
    });
  });

  describe('Idempotency', () => {
    it('should handle running the same cron job twice safely', async () => {
      process.env.CRON_SECRET = 'test-secret';

      const { GET } = await import('@/app/api/cron/inactive-users/route');

      const req = new Request('http://localhost:3000/api/cron/inactive-users', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      // Run twice
      const response1 = await GET(req as any);
      const response2 = await GET(req as any);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should succeed without errors
      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1).toBeDefined();
      expect(data2).toBeDefined();
    });
  });
});
