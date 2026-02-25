import { GET } from '@/app/api/analytics/funnel/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import Predictions from '@/app/models/prediction.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import UserEvents from '@/app/models/userEvent.model';
import Tournaments from '@/app/models/tournament.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');
jest.mock('@/app/models/prediction.model');
jest.mock('@/app/models/walletTransaction.model');
jest.mock('@/app/models/userEvent.model');
jest.mock('@/app/models/tournament.model');

describe('GET /api/analytics/funnel', () => {
  const mockAdminSession = {
    user: { id: 'admin-id', username: 'admin', role: 'ADMIN' },
  };

  const mockUserSession = {
    user: { id: 'user-id', username: 'user', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return funnel metrics for admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);

    // Mock count queries
    (Users.countDocuments as jest.Mock).mockResolvedValue(100);
    (Predictions.distinct as jest.Mock).mockResolvedValue(new Array(75)); // 75 users with picks
    (WalletTransactions.distinct as jest.Mock).mockResolvedValue(new Array(30)); // 30 users deposited
    (UserEvents.distinct as jest.Mock)
      .mockResolvedValueOnce(new Array(50)) // 50 WAU (first call)
      .mockResolvedValueOnce(new Array(40)); // 40 users who joined tournaments (second call)
    (UserEvents.countDocuments as jest.Mock).mockResolvedValue(100); // 100 tournament joins
    (Tournaments.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { users: [1, 2, 3], maxUsers: 10 }, // 30% fill
        { users: [1, 2], maxUsers: 10 }, // 20% fill
      ]),
    });

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=7d');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.signupToFirstPick).toBe(75); // 75/100 * 100
    expect(data.pickToDeposit).toBe(40); // 30/75 * 100
    expect(data.weeklyActiveUsers).toBe(50);
    expect(data.entriesPerUserPerWeek).toBe(2.5); // 100/40
    expect(data.depositConversionByRail).toBeDefined();
    expect(data.tournamentFillRate).toBe(25); // (30+20)/2
    expect(data.tierChurnRate).toEqual({
      rookie: 0,
      silver: 0,
      gold: 0,
      pro: 0,
    });
  });

  it('should reject non-admin users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockUserSession);

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=7d');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Admin access required');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=7d');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should validate period parameter', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);

    const request = new NextRequest('http://localhost:3000/api/analytics/funnel?period=invalid');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid period');
  });
});
