import { PATCH } from '@/app/api/wallet/preferred-method/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');

describe('PATCH /api/wallet/preferred-method', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should update preferred payment method', async () => {
    const mockUser = {
      _id: mockSession.user.id,
      preferred_payment_method: 'card',
      save: jest.fn().mockResolvedValue(undefined),
    };

    (Users.findById as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/wallet/preferred-method', {
      method: 'PATCH',
      body: JSON.stringify({ method: 'ach' }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUser.preferred_payment_method).toBe('ach');
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('should validate method value', async () => {
    (Users.findById as jest.Mock).mockResolvedValue({ _id: mockSession.user.id });

    const request = new NextRequest('http://localhost:3000/api/wallet/preferred-method', {
      method: 'PATCH',
      body: JSON.stringify({ method: 'bitcoin' }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid method');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wallet/preferred-method', {
      method: 'PATCH',
      body: JSON.stringify({ method: 'ach' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });
});
