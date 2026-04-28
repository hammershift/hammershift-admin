import { POST } from '@/app/api/admin/polygon-markets/create/route';
import { NextRequest } from 'next/server';
import PolygonMarket from '@/app/models/PolygonMarket.model';
import Auctions from '@/app/models/auction.model';
import { getServerSession } from 'next-auth';
import { createAuditLog } from '@/app/lib/auditLogger';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/app/models/PolygonMarket.model');
jest.mock('@/app/models/auction.model');
jest.mock('@/app/lib/auditLogger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
  AuditActions: {},
  AuditResources: {},
}));

describe('POST /api/admin/polygon-markets/create', () => {
  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@test.com',
      role: 'admin',
    },
  };

  const mockUserSession = {
    user: {
      id: 'user-456',
      email: 'user@test.com',
      role: 'user',
    },
  };

  const mockOwnerSession = {
    user: {
      id: 'owner-789',
      email: 'owner@test.com',
      role: 'owner',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject non-admin users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockUserSession);

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Admin');
    });

    it('should accept owner role (passes authz, fails at validation)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockOwnerSession);

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      // Owner is authorized — the request progresses past authz and hits
      // body validation, which rejects with 400 because the body is empty.
      expect(response.status).toBe(400);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
    });

    it('should reject missing auctionId', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Will this car sell over $100k?',
          endDate: new Date('2025-12-31'),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should reject missing question', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'auction-123',
          endDate: new Date('2025-12-31'),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should reject question longer than 200 characters', async () => {
      const longQuestion = 'a'.repeat(201);

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'auction-123',
          question: longQuestion,
          endDate: new Date('2025-12-31'),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('200');
    });

    it('should reject missing endDate', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'auction-123',
          question: 'Will this car sell over $100k?',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should reject endDate after auction end', async () => {
      const auctionEndDate = new Date('2025-12-31');
      const marketEndDate = new Date('2026-01-01'); // After auction

      (Auctions.findById as jest.Mock).mockResolvedValue({
        _id: 'auction-123',
        sort: {
          deadline: auctionEndDate,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'auction-123',
          question: 'Will this car sell over $100k?',
          endDate: marketEndDate.toISOString(),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('before auction');
    });

    it('should reject if auction not found', async () => {
      (Auctions.findById as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'nonexistent',
          question: 'Will this car sell over $100k?',
          endDate: new Date('2025-12-31').toISOString(),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Auction not found');
    });
  });

  describe('Market Creation', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
    });

    it('should create market successfully', async () => {
      const auctionEndDate = new Date('2025-12-31');
      const marketEndDate = new Date('2025-12-30'); // Before auction

      (Auctions.findById as jest.Mock).mockResolvedValue({
        _id: 'auction-123',
        sort: { deadline: auctionEndDate },
        avg_predicted_price: 100000,
      });

      (PolygonMarket.create as jest.Mock).mockResolvedValue({
        _id: 'market-456',
        auctionId: 'auction-123',
        contractAddress: '0xMOCK',
        yesTokenId: 'token-yes',
        noTokenId: 'token-no',
        status: 'PENDING',
        avg_predicted_price: 100000,
        adminId: 'admin-123',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'auction-123',
          question: 'Will this car sell over $100k?',
          endDate: marketEndDate.toISOString(),
          initialLiquidity: 1000,
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.marketId).toBe('market-456');
      expect(PolygonMarket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auctionId: 'auction-123',
          adminId: 'admin-123',
        })
      );
    });

    it('should handle duplicate market creation', async () => {
      const auctionEndDate = new Date('2025-12-31');
      const marketEndDate = new Date('2025-12-30');

      (Auctions.findById as jest.Mock).mockResolvedValue({
        _id: 'auction-123',
        sort: { deadline: auctionEndDate },
      });

      (PolygonMarket.create as jest.Mock).mockRejectedValue({
        code: 11000, // MongoDB duplicate key error
      });

      const req = new NextRequest('http://localhost:3000/api/admin/polygon-markets/create', {
        method: 'POST',
        body: JSON.stringify({
          auctionId: 'auction-123',
          question: 'Will this car sell over $100k?',
          endDate: marketEndDate.toISOString(),
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });
  });
});
