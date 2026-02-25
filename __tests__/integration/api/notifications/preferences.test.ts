import { GET, PATCH } from '@/app/api/notifications/preferences/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';

jest.mock('next-auth');
jest.mock('@/app/lib/mongoose');
jest.mock('@/app/models/user.model');

describe('Notification Preferences API', () => {
  const mockSession = {
    user: { id: '507f1f77bcf86cd799439011', username: 'testuser', role: 'USER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectToDB as jest.Mock).mockResolvedValue(undefined);
  });

  describe('GET /api/notifications/preferences', () => {
    it('should return notification preferences', async () => {
      const mockUser = {
        _id: mockSession.user.id,
        notification_preferences: {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        },
        phone: '+1234567890',
      };

      (Users.findById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.email_30min).toBe(true);
      expect(data.email_rank_drop).toBe(true);
      expect(data.push_30min).toBe(false);
      expect(data.sms_30min).toBe(false);
      expect(data.phone).toBe('+1234567890');
    });

    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const mockUser = {
        _id: mockSession.user.id,
        notification_preferences: {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        },
        phone: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (Users.findById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          push_30min: true,
          phone: '+1234567890',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.notification_preferences.push_30min).toBe(true);
      expect(mockUser.phone).toBe('+1234567890');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should allow partial updates', async () => {
      const mockUser = {
        _id: mockSession.user.id,
        notification_preferences: {
          email_30min: true,
          email_rank_drop: true,
          push_30min: false,
          sms_30min: false,
        },
        save: jest.fn().mockResolvedValue(undefined),
      };

      (Users.findById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ sms_30min: true }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.notification_preferences.email_30min).toBe(true); // unchanged
      expect(mockUser.notification_preferences.sms_30min).toBe(true); // changed
    });

    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ push_30min: true }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });
  });
});
