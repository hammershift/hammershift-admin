import { POST } from '@/app/api/wallet/deposit/ach/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import ACHAccounts from '@/app/models/achAccount.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/achAccount.model');
jest.mock('@/app/models/walletTransaction.model');
jest.mock('@/app/models/user.model');

describe('POST /api/wallet/deposit/ach', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create ACH deposit successfully', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      deposit_count: 0,
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);
    (ACHAccounts.findOne as jest.Mock).mockResolvedValue(null);
    (ACHAccounts.create as jest.Mock).mockResolvedValue({ _id: 'ach-id' });
    (WalletTransactions.create as jest.Mock).mockResolvedValue({ _id: 'txn-id' });

    const request = new NextRequest('http://localhost:3000/api/wallet/deposit/ach', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000, // $100.00
        routingNumber: '123456789',
        accountNumber: '9876543210',
        accountType: 'checking',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transactionId).toBeDefined();
    expect(data.status).toBe('pending');
    expect(data.availableDate).toBeDefined();
    expect(mockUser.deposit_count).toBe(1);
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/deposit/ach', {
      method: 'POST',
      body: JSON.stringify({
        amount: 10000,
        routingNumber: '123456789',
        accountNumber: '9876543210',
        accountType: 'checking',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should validate amount is positive', async () => {
    (Users.findById as jest.Mock).mockResolvedValue({ _id: mockSession.user.id });

    const request = new NextRequest('http://localhost:3000/api/wallet/deposit/ach', {
      method: 'POST',
      body: JSON.stringify({
        amount: -1000,
        routingNumber: '123456789',
        accountNumber: '9876543210',
        accountType: 'checking',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('positive');
  });
});
