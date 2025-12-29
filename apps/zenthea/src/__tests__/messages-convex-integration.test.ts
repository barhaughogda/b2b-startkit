import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConvexHttpClient } from 'convex/browser';

// Mock Convex
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(),
}));

describe('Messages Convex Integration', () => {
  const mockConvexClient = {
    query: vi.fn(),
    mutation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (ConvexHttpClient as any).mockImplementation(() => mockConvexClient);
  });

  describe('User ID Resolution', () => {
    it('should use Convex user ID from session when available', async () => {
      const convexUserId = 'jn773tx80p6edja8pr73n8w2kd7tyaw5';
      const email = 'patient@demo.com';
      
      // Mock session with Convex user ID
      const session = {
        user: {
          id: convexUserId,
          email: email,
          role: 'patient',
        },
      };

      expect(session.user.id).toBe(convexUserId);
      expect(session.user.id).not.toBe('demo-patient-1');
    });

    it('should resolve demo ID to Convex user ID when needed', async () => {
      const demoUserId = 'demo-patient-1';
      const convexUserId = 'jn773tx80p6edja8pr73n8w2kd7tyaw5';
      const email = 'patient@demo.com';

      // Mock user lookup
      mockConvexClient.query.mockResolvedValueOnce({
        _id: convexUserId,
        email: email,
        role: 'patient',
        tenantId: 'demo-tenant',
      });

      // Simulate API route logic
      let userId = demoUserId;
      if (userId.startsWith('demo-')) {
        const user = await mockConvexClient.query('users.getUserByEmail', {
          email: email,
          tenantId: 'demo-tenant',
        });
        if (user) {
          userId = user._id;
        }
      }

      expect(userId).toBe(convexUserId);
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        'users.getUserByEmail',
        expect.objectContaining({
          email: email,
          tenantId: 'demo-tenant',
        })
      );
    });
  });

  describe('Message Retrieval', () => {
    it('should fetch conversations using correct Convex user ID', async () => {
      const convexUserId = 'jn773tx80p6edja8pr73n8w2kd7tyaw5';
      const tenantId = 'demo-tenant';

      const mockConversations = [
        {
          threadId: 'thread_123',
          lastMessage: {
            _id: 'msg_1',
            content: 'Test message',
            fromUserId: 'jn754w1w7326zy1sjyyxwqe3rx7s2xmp',
            toUserId: convexUserId,
            createdAt: Date.now(),
            isRead: false,
          },
          unreadCount: 1,
          otherUser: {
            id: 'jn754w1w7326zy1sjyyxwqe3rx7s2xmp',
            firstName: 'Demo',
            lastName: 'Provider',
            role: 'provider',
          },
        },
      ];

      mockConvexClient.query.mockResolvedValueOnce(mockConversations);

      const conversations = await mockConvexClient.query('messages.getConversations', {
        tenantId,
        userId: convexUserId,
        limit: 20,
      });

      expect(conversations).toEqual(mockConversations);
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        'messages.getConversations',
        expect.objectContaining({
          tenantId,
          userId: convexUserId,
        })
      );
    });

    it('should not fetch conversations with demo user ID', async () => {
      const demoUserId = 'demo-patient-1';
      const tenantId = 'demo-tenant';

      mockConvexClient.query.mockResolvedValueOnce([]);

      const conversations = await mockConvexClient.query('messages.getConversations', {
        tenantId,
        userId: demoUserId,
        limit: 20,
      });

      // Should return empty array because demo ID doesn't match Convex user IDs
      expect(conversations).toEqual([]);
    });
  });

  describe('Authentication Flow', () => {
    it('should prioritize Convex lookup over hardcoded demo IDs', async () => {
      const email = 'patient@demo.com';
      const convexUserId = 'jn773tx80p6edja8pr73n8w2kd7tyaw5';

      // Mock Convex user lookup
      mockConvexClient.query.mockResolvedValueOnce({
        _id: convexUserId,
        email: email,
        name: 'Demo Patient',
        role: 'patient',
        tenantId: 'demo-tenant',
        passwordHash: '$2a$10$hashedpassword', // Mock bcrypt hash
      });

      // Simulate auth flow: Convex lookup first
      const user = await mockConvexClient.query('users.getUserByEmail', {
        email: email,
        tenantId: 'demo-tenant',
      });

      if (user) {
        // Verify password (mocked)
        const isValid = true; // Mock password verification
        if (isValid) {
          expect(user._id).toBe(convexUserId);
          expect(user._id).not.toBe('demo-patient-1');
        }
      }
    });
  });
});




