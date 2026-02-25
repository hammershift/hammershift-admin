import { GET } from '@/app/api/tournaments/ladder/me/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');
jest.mock('@/app/models/prediction.model');

describe('GET /api/tournaments/ladder/me', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return rookie tier for 50 points', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      total_points: 50,
      ladder_tier: 'rookie',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Users.countDocuments as jest.Mock).mockResolvedValue(5); // 5 users with more points
    (Predictions.distinct as jest.Mock).mockResolvedValue(['t1', 't2']); // 2 tournaments in last 14 days

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('rookie');
    expect(data.points).toBe(50);
    expect(data.rank).toBe(6); // 5 + 1
    expect(data.nextTierThreshold).toBe(100); // silver threshold
    expect(data.qualificationWindow.completed).toBe(2);
  });

  it('should return silver tier for 150 points', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      total_points: 150,
      ladder_tier: 'silver',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Users.countDocuments as jest.Mock).mockResolvedValue(2);
    (Predictions.distinct as jest.Mock).mockResolvedValue(['t1']);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('silver');
    expect(data.points).toBe(150);
    expect(data.nextTierThreshold).toBe(300); // gold threshold
  });

  it('should return pro tier for 800 points', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      total_points: 800,
      ladder_tier: 'pro',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Users.countDocuments as jest.Mock).mockResolvedValue(0);
    (Predictions.distinct as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tier).toBe('pro');
    expect(data.points).toBe(800);
    expect(data.nextTierThreshold).toBe(750); // already max
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/tournaments/ladder/me');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
