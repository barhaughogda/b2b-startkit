import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientMessagesPage from '@/app/patient/messages/page';

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useMessageNotifications hook
vi.mock('@/lib/notifications', () => ({
  useMessageNotifications: () => ({
    notifyNewMessage: vi.fn(),
  }),
}));

// Mock FileAttachment component
vi.mock('@/components/patient/FileAttachment', () => ({
  FileAttachment: ({ attachments }: { attachments: any[] }) => (
    <div data-testid="file-attachment">
      {attachments.length > 0 && <div>Attachments: {attachments.length}</div>}
    </div>
  ),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PatientMessagesPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/patient/conversations') && !url.includes('/api/patient/conversations/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              threadId: 'thread-1',
              lastMessage: {
                content: 'Hello',
                fromUser: { id: '1', firstName: 'Dr.', lastName: 'Smith', role: 'Doctor' },
                createdAt: Date.now() - 100000,
                priority: 'normal',
              },
              unreadCount: 1,
              otherUser: { id: '1', firstName: 'Dr.', lastName: 'Smith', role: 'Doctor' },
            },
          ]),
        });
      }
      if (url.includes('/api/patient/conversations/thread-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              _id: 'msg-1',
              content: 'Hello',
              fromUser: { id: '1', firstName: 'Dr.', lastName: 'Smith', role: 'Doctor' },
              createdAt: Date.now() - 100000,
            },
          ]),
        });
      }
      if (url.includes('/api/patient/messages/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalSent: 5,
            totalReceived: 10,
            unreadCount: 1,
            urgentCount: 0,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('should render the messages page', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });
    expect(screen.getByText(/Secure messaging with your healthcare providers/i)).toBeInTheDocument();
  });

  it('should display search input', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search messages...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('should display filter controls', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Filter')).toBeInTheDocument();
      const statusFilter = screen.getByDisplayValue('All Status');
      expect(statusFilter).toBeInTheDocument();
    });
  });

  it('should display conversations list', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Conversations')).toBeInTheDocument();
    });
  });

  it('should display new message button', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new message/i })).toBeInTheDocument();
    });
  });

  it('should display empty state when no conversations', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/patient/conversations') && !url.includes('/api/patient/conversations/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/No conversations found/i)).toBeInTheDocument();
    });
  });

  it('should display quick stats', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  it('should display select conversation message when no thread selected', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Select a conversation/i)).toBeInTheDocument();
    });
  });

  it('should toggle archived view', async () => {
    render(<PatientMessagesPage />);
    
    await waitFor(() => {
      const archiveButton = screen.getByRole('button', { name: /show archived/i });
      expect(archiveButton).toBeInTheDocument();
    });
  });
});

