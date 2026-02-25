import { GET } from '@/app/api/wallet/ach-status/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import ACHAccounts from '@/app/models/achAccount.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/achAccount.model');
jest.mock('@/app/models/user.model');

describe('GET /api/wallet/ach-status', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return ACH status when account is linked', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      preferred_payment_method: 'ach',
    };

    const mockAccount = {
      account_number_last4: '3210',
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (ACHAccounts.findOne as jest.Mock).mockResolvedValue(mockAccount);

    const request = new NextRequest('http://localhost:3000/api/wallet/ach-status');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLinked).toBe(true);
    expect(data.lastFour).toBe('3210');
    expect(data.preferredMethod).toBe('ach');
  });

  it('should return unlinked status when no ACH account exists', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      preferred_payment_method: 'card',
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (ACHAccounts.findOne as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/ach-status');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLinked).toBe(false);
    expect(data.lastFour).toBeNull();
    expect(data.preferredMethod).toBe('card');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/ach-status');

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
