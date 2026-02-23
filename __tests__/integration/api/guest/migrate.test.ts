import { POST } from '@/app/api/guest/migrate/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Predictions from '@/app/models/prediction.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/prediction.model');
jest.mock('@/app/models/user.model');

describe('POST /api/guest/migrate', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
    // Mock user lookup
    (Users.findById as jest.Mock).mockResolvedValue({
      _id: mockSession.user.id,
      username: mockSession.user.username,
      fullName: 'Test User',
    });
  });

  it('should migrate guest predictions successfully', async () => {
    const mockAuctionId = '507f1f77bcf86cd799439012';

    // Mock no existing predictions
    (Predictions.findOne as jest.Mock).mockResolvedValue(null);
    (Predictions.create as jest.Mock).mockResolvedValue({ _id: 'new-prediction-id' });

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: mockAuctionId, predictedPrice: 50000 }
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(1);
    expect(data.skipped).toBe(0);
  });

  it('should skip duplicate predictions (idempotent)', async () => {
    const mockAuctionId = '507f1f77bcf86cd799439012';

    // Mock existing prediction
    (Predictions.findOne as jest.Mock).mockResolvedValue({ _id: 'existing-id' });

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: mockAuctionId, predictedPrice: 50000 }
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.migrated).toBe(0);
    expect(data.skipped).toBe(1);
  });

  it('should reject more than 3 predictions', async () => {
    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: '1', predictedPrice: 1 },
          { auctionId: '2', predictedPrice: 2 },
          { auctionId: '3', predictedPrice: 3 },
          { auctionId: '4', predictedPrice: 4 },
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Maximum 3 predictions');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({ predictions: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 404 when user not found', async () => {
    // Mock user not found
    (Users.findById as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/guest/migrate', {
      method: 'POST',
      body: JSON.stringify({
        predictions: [
          { auctionId: '507f1f77bcf86cd799439012', predictedPrice: 50000 }
        ]
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });
});
