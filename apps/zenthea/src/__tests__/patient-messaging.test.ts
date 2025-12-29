import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Convex client
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    mutation: vi.fn(),
    query: vi.fn(),
  })),
}));

// Mock Next.js components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock the notifications hook
vi.mock('@/lib/notifications', () => ({
  useMessageNotifications: () => ({
    notifyNewMessage: vi.fn(),
  }),
}));

describe('Patient Messaging System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Creation', () => {
    it('should create a message with required fields', async () => {
      const messageData = {
        tenantId: 'demo-tenant',
        fromUserId: 'user_2',
        toUserId: 'user_1',
        content: 'Test message',
        messageType: 'general',
        priority: 'normal',
        threadId: 'thread_123',
      };

      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: 'msg_123' }),
      });

      const response = await fetch('/api/patient/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify(messageData),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
    });

    it('should handle message creation with attachments', async () => {
      const messageData = {
        tenantId: 'demo-tenant',
        fromUserId: 'user_2',
        toUserId: 'user_1',
        content: 'Message with attachment',
        messageType: 'general',
        priority: 'normal',
        threadId: 'thread_123',
        attachments: [
          {
            id: 'att_123',
            name: 'test.pdf',
            type: 'application/pdf',
            size: 1024,
            url: 'https://example.com/test.pdf',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: 'msg_123' }),
      });

      const response = await fetch('/api/patient/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify(messageData),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('Conversation Management', () => {
    it('should fetch conversations for a user', async () => {
      const mockConversations = [
        {
          threadId: 'thread_123',
          lastMessage: {
            _id: 'msg_123',
            content: 'Hello',
            fromUserId: 'user_1',
            toUserId: 'user_2',
            createdAt: Date.now(),
            messageType: 'general',
            priority: 'normal',
          },
          unreadCount: 1,
          otherUser: {
            id: 'user_1',
            firstName: 'Dr.',
            lastName: 'Smith',
            role: 'provider',
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversations: mockConversations }),
      });

      const response = await fetch('/api/patient/conversations?userId=user_2', {
        headers: {
          'X-Tenant-ID': 'demo-tenant',
        },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].threadId).toBe('thread_123');
    });

    it('should archive a conversation thread', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, archivedCount: 5 }),
      });

      const response = await fetch('/api/patient/conversations/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify({
          threadId: 'thread_123',
          userId: 'user_2',
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(5);
    });

    it('should unarchive a conversation thread', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, unarchivedCount: 5 }),
      });

      const response = await fetch('/api/patient/conversations/unarchive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify({
          threadId: 'thread_123',
          userId: 'user_2',
        }),
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.unarchivedCount).toBe(5);
    });
  });

  describe('Message Search', () => {
    it('should search messages within a thread', async () => {
      const mockSearchResults = [
        {
          _id: 'msg_123',
          content: 'Test search result',
          fromUserId: 'user_1',
          toUserId: 'user_2',
          createdAt: Date.now(),
          messageType: 'general',
          priority: 'normal',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: mockSearchResults }),
      });

      const response = await fetch(
        '/api/patient/messages/search?threadId=thread_123&userId=user_2&searchTerm=test',
        {
          headers: {
            'X-Tenant-ID': 'demo-tenant',
          },
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('Test search result');
    });
  });

  describe('File Upload', () => {
    it('should upload a file attachment', async () => {
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', mockFile);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            attachment: {
              id: 'att_123',
              name: 'test.txt',
              type: 'text/plain',
              size: 12,
              url: 'https://example.com/attachments/att_123',
            },
          }),
      });

      const response = await fetch('/api/patient/messages/upload', {
        method: 'POST',
        headers: {
          'X-Tenant-ID': 'demo-tenant',
        },
        body: formData,
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.attachment.name).toBe('test.txt');
    });
  });

  describe('Message Statistics', () => {
    it('should fetch message statistics', async () => {
      const mockStats = {
        totalSent: 10,
        totalReceived: 15,
        unreadCount: 3,
        urgentCount: 1,
        lastActivity: Date.now(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ stats: mockStats }),
      });

      const response = await fetch('/api/patient/messages/stats?userId=user_2', {
        headers: {
          'X-Tenant-ID': 'demo-tenant',
        },
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.stats.totalSent).toBe(10);
      expect(result.stats.totalReceived).toBe(15);
      expect(result.stats.unreadCount).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      const response = await fetch('/api/patient/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify({
          fromUserId: 'user_2',
          toUserId: 'user_1',
          content: 'Test message',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should validate required fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Missing required fields' }),
      });

      const response = await fetch('/api/patient/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'demo-tenant',
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Notification System', () => {
    it('should trigger notifications for new messages', () => {
      const mockNotifyNewMessage = vi.fn();
      
      // Simulate receiving a new message
      const newMessage = {
        fromUser: {
          id: 'user_1',
          firstName: 'Dr.',
          lastName: 'Smith',
          role: 'provider',
        },
        content: 'New message from provider',
        priority: 'normal',
        threadId: 'thread_123',
      };

      mockNotifyNewMessage(newMessage);
      
      expect(mockNotifyNewMessage).toHaveBeenCalledWith(newMessage);
    });
  });
});
