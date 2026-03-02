import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/webhooks/scraper/route';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../../helpers/testDb';
import PolygonMarketModel from '@/app/models/PolygonMarket.model';
import { Types } from 'mongoose';

describe('Scraper Webhook API', () => {
  const VALID_SECRET = 'test-scraper-secret-12345';
  const originalEnv = process.env;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    await resetTestDb();
    jest.clearAllMocks();
    // Set valid secret for tests
    process.env.SCRAPER_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    // Restore env after each test
    process.env = { ...originalEnv, SCRAPER_SECRET: VALID_SECRET };
  });

  describe('GET /api/webhooks/scraper', () => {
    it('should return health check response', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/scraper');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        message: 'Scraper oracle webhook endpoint',
        status: 'active',
        version: '1.0',
      });
    });
  });

  describe('POST /api/webhooks/scraper', () => {
    describe('Authentication', () => {
      it('should reject requests without signature header', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 100000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Missing webhook signature');
      });

      it('should reject requests with invalid signature', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': 'invalid-secret',
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 100000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Invalid webhook signature');
      });

      it('should return 500 if SCRAPER_SECRET is not configured', async () => {
        delete process.env.SCRAPER_SECRET;

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 100000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Server configuration error');
      });
    });

    describe('Validation', () => {
      it('should reject invalid hammer price (zero)', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 0,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid hammer price');
      });

      it('should reject invalid hammer price (negative)', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: -1000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid hammer price');
      });

      it('should return 404 if market not found', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'nonexistent-auction',
            hammerPrice: 100000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Market not found');
      });

      it('should reject if market already resolved', async () => {
        // Create a resolved market
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-12345',
          contractAddress: '0x123',
          yesTokenId: 'yes-token-1',
          noTokenId: 'no-token-1',
          status: 'RESOLVED',
          predictedPrice: 100000,
          hammerPrice: 120000,
          winningOutcome: 'YES',
          resolvedAt: new Date(),
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 130000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Market already resolved');

        // Verify market was not updated
        const unchangedMarket = await PolygonMarketModel.findById(market._id);
        expect(unchangedMarket?.hammerPrice).toBe(120000);
        expect(unchangedMarket?.winningOutcome).toBe('YES');
      });
    });

    describe('Market Resolution - YES wins', () => {
      it('should resolve market with YES outcome when hammer price exceeds predicted price', async () => {
        // Create an active market
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-12345-porsche',
          contractAddress: '0xABC123',
          yesTokenId: 'yes-token-1',
          noTokenId: 'no-token-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        const hammerPrice = 125000;
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
            'X-Oracle-Source': 'scraper',
            'X-Oracle-Version': '1.0',
          },
          body: JSON.stringify({
            auctionId: 'bat-12345-porsche',
            hammerPrice,
            source: 'verified',
            timestamp: Date.now(),
            metadata: {
              bids: 45,
              comments: 123,
              views: 5678,
            },
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.marketId).toBe(market._id.toString());
        expect(data.auctionId).toBe('bat-12345-porsche');
        expect(data.predictedPrice).toBe(100000);
        expect(data.hammerPrice).toBe(125000);
        expect(data.winningOutcome).toBe('YES');
        expect(data.resolvedAt).toBeDefined();

        // Verify database was updated
        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket).toBeDefined();
        expect(updatedMarket?.status).toBe('RESOLVED');
        expect(updatedMarket?.hammerPrice).toBe(125000);
        expect(updatedMarket?.winningOutcome).toBe('YES');
        expect(updatedMarket?.resolvedAt).toBeInstanceOf(Date);
      });

      it('should resolve market with YES outcome when hammer price is significantly higher', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-99999-ferrari',
          contractAddress: '0xDEF456',
          yesTokenId: 'yes-token-2',
          noTokenId: 'no-token-2',
          status: 'ACTIVE',
          predictedPrice: 50000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-99999-ferrari',
            hammerPrice: 200000, // 4x predicted
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.winningOutcome).toBe('YES');

        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket?.winningOutcome).toBe('YES');
      });
    });

    describe('Market Resolution - NO wins', () => {
      it('should resolve market with NO outcome when hammer price equals predicted price', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-55555-corvette',
          contractAddress: '0xGHI789',
          yesTokenId: 'yes-token-3',
          noTokenId: 'no-token-3',
          status: 'ACTIVE',
          predictedPrice: 75000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-55555-corvette',
            hammerPrice: 75000, // Exactly equal
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.winningOutcome).toBe('NO');

        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket?.status).toBe('RESOLVED');
        expect(updatedMarket?.hammerPrice).toBe(75000);
        expect(updatedMarket?.winningOutcome).toBe('NO');
      });

      it('should resolve market with NO outcome when hammer price is below predicted price', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-77777-mustang',
          contractAddress: '0xJKL012',
          yesTokenId: 'yes-token-4',
          noTokenId: 'no-token-4',
          status: 'ACTIVE',
          predictedPrice: 150000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-77777-mustang',
            hammerPrice: 120000, // Below predicted
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.winningOutcome).toBe('NO');

        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket?.winningOutcome).toBe('NO');
      });

      it('should resolve market with NO outcome when hammer price is significantly lower', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-88888-camaro',
          contractAddress: '0xMNO345',
          yesTokenId: 'yes-token-5',
          noTokenId: 'no-token-5',
          status: 'ACTIVE',
          predictedPrice: 200000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-88888-camaro',
            hammerPrice: 50000, // Much lower
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.winningOutcome).toBe('NO');
      });
    });

    describe('Edge Cases', () => {
      it('should handle PENDING market status', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-11111-pending',
          contractAddress: '0xPQR678',
          yesTokenId: 'yes-token-6',
          noTokenId: 'no-token-6',
          status: 'PENDING',
          predictedPrice: 80000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-11111-pending',
            hammerPrice: 90000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        // Should succeed - PENDING markets can be resolved
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.winningOutcome).toBe('YES');
      });

      it('should handle very small hammer prices', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-22222-cheap',
          contractAddress: '0xSTU901',
          yesTokenId: 'yes-token-7',
          noTokenId: 'no-token-7',
          status: 'ACTIVE',
          predictedPrice: 1000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-22222-cheap',
            hammerPrice: 1, // Very small but valid
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.hammerPrice).toBe(1);
        expect(data.winningOutcome).toBe('NO');
      });

      it('should handle very large hammer prices', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-33333-expensive',
          contractAddress: '0xVWX234',
          yesTokenId: 'yes-token-8',
          noTokenId: 'no-token-8',
          status: 'ACTIVE',
          predictedPrice: 1000000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-33333-expensive',
            hammerPrice: 25000000, // $25M
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.hammerPrice).toBe(25000000);
        expect(data.winningOutcome).toBe('YES');
      });
    });
  });
});
