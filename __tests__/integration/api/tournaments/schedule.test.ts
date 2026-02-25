import { GET } from '@/app/api/tournaments/schedule/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Tournaments from '@/app/models/tournament.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/tournament.model');
jest.mock('@/app/models/user.model');

describe('GET /api/tournaments/schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return tournaments with eligibility for authenticated user', async () => {
    const mockSession = {
      user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
    };

    const mockUser = {
      _id: mockSession.user.id,
      ladder_tier: 'silver',
    };

    const mockTournaments = [
      {
        _id: 't1',
        tier: 'rookie',
        type: 'qualifier',
        startTime: new Date('2026-03-01'),
        prizePool: 1000,
        users: ['u1', 'u2'],
        maxUsers: 10,
        buyInFee: 500,
      },
      {
        _id: 't2',
        tier: 'gold',
        type: 'final',
        startTime: new Date('2026-03-02'),
        prizePool: 5000,
        users: [],
        maxUsers: 20,
        buyInFee: 1000,
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTournaments),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].isEligible).toBe(true); // silver >= rookie
    expect(data[1].isEligible).toBe(false); // silver < gold
  });

  it('should return tournaments without eligibility for unauthenticated users', async () => {
    const mockTournaments = [
      {
        _id: 't1',
        tier: 'rookie',
        type: 'qualifier',
        startTime: new Date('2026-03-01'),
        prizePool: 1000,
        users: [],
        maxUsers: 10,
        buyInFee: 0,
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValue(null);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTournaments),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].isEligible).toBe(false); // no session
  });

  it('should return empty array when no active tournaments', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should mark all users eligible for tournaments with no tier requirement', async () => {
    const mockSession = {
      user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
    };

    const mockUser = {
      _id: mockSession.user.id,
      ladder_tier: 'rookie',
    };

    const mockTournaments = [
      {
        _id: 't1',
        tier: null, // No tier requirement
        type: 'open',
        startTime: new Date('2026-03-01'),
        prizePool: 1000,
        users: [],
        maxUsers: 100,
        buyInFee: 0,
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTournaments),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0].isEligible).toBe(true); // null tier = everyone eligible
  });

  it('should validate complete tier hierarchy: rookie < silver < gold < pro', async () => {
    const mockSession = {
      user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
    };

    const mockUser = {
      _id: mockSession.user.id,
      ladder_tier: 'gold',
    };

    const mockTournaments = [
      {
        _id: 't1',
        tier: 'rookie',
        type: 'qualifier',
        startTime: new Date('2026-03-01'),
        prizePool: 1000,
        users: [],
        maxUsers: 10,
        buyInFee: 100,
      },
      {
        _id: 't2',
        tier: 'silver',
        type: 'qualifier',
        startTime: new Date('2026-03-02'),
        prizePool: 2000,
        users: [],
        maxUsers: 10,
        buyInFee: 200,
      },
      {
        _id: 't3',
        tier: 'gold',
        type: 'final',
        startTime: new Date('2026-03-03'),
        prizePool: 5000,
        users: [],
        maxUsers: 20,
        buyInFee: 500,
      },
      {
        _id: 't4',
        tier: 'pro',
        type: 'championship',
        startTime: new Date('2026-03-04'),
        prizePool: 10000,
        users: [],
        maxUsers: 20,
        buyInFee: 1000,
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (Tournaments.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTournaments),
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/tournaments/schedule');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(4);
    // Gold user should be eligible for rookie, silver, and gold, but NOT pro
    expect(data[0].isEligible).toBe(true);  // gold >= rookie
    expect(data[1].isEligible).toBe(true);  // gold >= silver
    expect(data[2].isEligible).toBe(true);  // gold >= gold
    expect(data[3].isEligible).toBe(false); // gold < pro
  });
});
