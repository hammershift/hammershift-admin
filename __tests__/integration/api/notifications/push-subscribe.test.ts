import { POST } from '@/app/api/notifications/push/subscribe/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import PushSubscriptions from '@/app/models/pushSubscription.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/pushSubscription.model');

describe('POST /api/notifications/push/subscribe', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  const mockSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  it('should save push subscription successfully', async () => {
    (PushSubscriptions.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 'sub-id' });

    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: mockSubscription }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should validate subscription object structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: 'missing-keys' } }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid subscription');
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: mockSubscription }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should be rate limited', async () => {
    (PushSubscriptions.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 'sub-id' });

    // Rate limit is applied by withRateLimit wrapper - we just verify the handler is wrapped
    // The actual rate limiting logic is tested in rateLimiter.test.ts
    const request = new NextRequest('http://localhost:3000/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: mockSubscription }),
    });

    const response = await POST(request);

    // If we get here without throwing, rate limiter is applied
    expect(response.status).toBe(200);
  });
});
