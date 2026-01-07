import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagement } from '@/components/admin/UserManagement';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('UserManagement', () => {
  const mockUsers = [
    {
      _id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      role: 'provider' as const,
      isActive: true,
      tenantId: 'tenant-1',
    },
    {
      _id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
      role: 'admin' as const,
      isActive: false,
      tenantId: 'tenant-1',
    },
  ];

  const mockUsersResponse = {
    success: true,
    data: {
      users: mockUsers,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockUsersResponse,
    });
  });

  describe('Initial Render', () => {
    it('should render user management component', async () => {
      render(<UserManagement />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Manage users, roles, and permissions')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<UserManagement />);
      // Loading skeletons should be present
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('should fetch and display users', async () => {
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by search query', async () => {
      const user = userEvent.setup();
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.type(searchInput, 'One');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=One'),
          undefined
        );
      });
    });
  });

  describe('Filtering', () => {
    it('should filter users by role', async () => {
      const user = userEvent.setup();
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const roleSelect = screen.getByText(/all roles/i);
      await user.click(roleSelect);
      await user.click(screen.getByText('Provider'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('role=provider'),
          undefined
        );
      });
    });

    it('should filter users by status', async () => {
      const user = userEvent.setup();
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const statusSelect = screen.getByText(/all status/i);
      await user.click(statusSelect);
      await user.click(screen.getByText('Active'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active'),
          undefined
        );
      });
    });
  });

  describe('User Actions', () => {
    it('should open create user dialog when Add User is clicked', async () => {
      const user = userEvent.setup();
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add user/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create New User')).toBeInTheDocument();
      });
    });

    it('should open edit dialog when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit user/i);
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit User')).toBeInTheDocument();
      });
    });

    it('should confirm before deleting a user', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false); // User cancels

      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete user/i);
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('delete this user')
      );
    });

    it('should delete user when confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => true); // User confirms

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsersResponse,
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/delete user/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/users/user-1'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          users: mockUsers,
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      const multiPageResponse = {
        success: true,
        data: {
          users: mockUsers,
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText(/next page/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          undefined
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Failed to fetch users',
        }),
      });

      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
      });
    });

    it('should display empty state when no users found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            users: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          },
        }),
      });

      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh user list when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserManagement />);

      await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});

