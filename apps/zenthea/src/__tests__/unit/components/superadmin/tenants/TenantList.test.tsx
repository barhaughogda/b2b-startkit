import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantList } from '@/components/superadmin/tenants/TenantList';

// Mock next/navigation
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock fetch
global.fetch = vi.fn();

const mockTenants = [
  {
    id: 'tenant-1',
    name: 'Test Clinic',
    type: 'clinic',
    status: 'active' as const,
    subscription: {
      plan: 'premium' as const,
      status: 'active' as const,
      maxUsers: 50,
      maxPatients: 500,
    },
    userCount: 10,
    patientCount: 100,
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now(),
    configCompleteness: 85,
  },
  {
    id: 'tenant-2',
    name: 'Demo Hospital',
    type: 'hospital',
    status: 'trial' as const,
    subscription: {
      plan: 'demo' as const,
      status: 'active' as const,
      maxUsers: 10,
      maxPatients: 100,
    },
    userCount: 5,
    patientCount: 25,
    createdAt: Date.now() - 172800000, // 2 days ago
    updatedAt: Date.now(),
    configCompleteness: 45,
  },
];

const mockTenantListResponse = {
  success: true,
  data: {
    tenants: mockTenants,
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
};

describe('TenantList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockTenantListResponse,
    });
  });

  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      render(<TenantList />);
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    it('should load and display tenants', async () => {
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
        expect(screen.getByText('Demo Hospital')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/superadmin/tenants')
      );
    });

    it('should display error when API fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to load tenants' }),
      });

      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter tenants by search query', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name/i);
      await user.type(searchInput, 'Demo');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Demo')
        );
      });
    });
  });

  describe('Filtering', () => {
    it('should filter tenants by status', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/status/i);
      await user.click(statusSelect);
      await user.click(screen.getByText('Active'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active')
        );
      });
    });

    it('should filter tenants by plan', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const planSelect = screen.getByLabelText(/plan/i);
      await user.click(planSelect);
      await user.click(screen.getByText('Premium'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('plan=premium')
        );
      });
    });

    it('should filter tenants by type', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const typeSelect = screen.getByLabelText(/type/i);
      await user.click(typeSelect);
      await user.click(screen.getByText('Clinic'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=clinic')
        );
      });
    });
  });

  describe('Sorting', () => {
    it('should sort tenants by name', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.click(sortSelect);
      await user.click(screen.getByText('Name'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=name')
        );
      });
    });

    it('should toggle sort order', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Ascending')).toBeInTheDocument();
      });

      const ascendingButton = screen.getByText('Ascending');
      await user.click(ascendingButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sortOrder=asc')
        );
      });
    });
  });

  describe('Tenant Display', () => {
    it('should display tenant information correctly', async () => {
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
        expect(screen.getByText('tenant-1')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('premium')).toBeInTheDocument();
      });
    });

    it('should display configuration completeness', async () => {
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('45%')).toBeInTheDocument();
      });
    });

    it('should display user and patient counts', async () => {
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText(/10 \/ 50/)).toBeInTheDocument(); // users
        expect(screen.getByText(/100 \/ 500/)).toBeInTheDocument(); // patients
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          tenants: mockTenants,
          total: 25,
          page: 1,
          limit: 20,
          totalPages: 2,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      const multiPageResponse = {
        success: true,
        data: {
          tenants: mockTenants,
          total: 25,
          page: 1,
          limit: 20,
          totalPages: 2,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });

    it('should navigate to previous page', async () => {
      const user = userEvent.setup();
      const multiPageResponse = {
        success: true,
        data: {
          tenants: mockTenants,
          total: 25,
          page: 2,
          limit: 20,
          totalPages: 2,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
      });

      const previousButton = screen.getByText('Previous');
      await user.click(previousButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1')
        );
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no tenants found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tenants: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          },
        }),
      });

      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('No tenants found')).toBeInTheDocument();
      });
    });
  });

  describe('Tenant Click Navigation', () => {
    it('should navigate to tenant details when row is clicked', async () => {
      const user = userEvent.setup();
      render(<TenantList />);

      await waitFor(() => {
        expect(screen.getByText('Test Clinic')).toBeInTheDocument();
      });

      // Find and click on a tenant row
      const tenantRow = screen.getByText('Test Clinic').closest('tr');
      expect(tenantRow).toBeInTheDocument();
      
      if (tenantRow) {
        await user.click(tenantRow);
        
        await waitFor(() => {
          expect(mockRouter.push).toHaveBeenCalledWith('/superadmin/tenants/tenant-1');
        });
      }
    });
  });
});

