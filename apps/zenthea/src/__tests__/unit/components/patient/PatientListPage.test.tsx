import React from 'react';
import { render, screen } from '@/__tests__/utils/test-wrapper';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PatientsPage from '@/app/company/patients/page';

// Mock the usePatients hook
vi.mock('@/hooks/usePatients', () => ({
  usePatients: vi.fn(() => ({
    patients: [
      {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-03-15').getTime(),
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        insurance: {
          provider: 'Blue Cross',
          policyNumber: 'BC123456',
          groupNumber: 'GRP001'
        },
        tenantId: 'demo-tenant-1',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        name: 'John Doe',
        age: 39,
        status: 'Active',
        lastVisit: '2024-01-15',
        nextAppointment: '2024-02-15',
        avatar: undefined,
        gender: 'Male'
      },
      {
        _id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1990-07-22').getTime(),
        email: 'jane.smith@email.com',
        phone: '(555) 234-5678',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210'
        },
        insurance: {
          provider: 'Aetna',
          policyNumber: 'AET789012',
          groupNumber: 'GRP002'
        },
        tenantId: 'demo-tenant-1',
        createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        name: 'Jane Smith',
        age: 34,
        status: 'Active',
        lastVisit: '2024-01-10',
        nextAppointment: undefined,
        avatar: undefined,
        gender: 'Female'
      },
      {
        _id: '3',
        firstName: 'Emily',
        lastName: 'Johnson',
        dateOfBirth: new Date('1988-12-05').getTime(),
        email: 'emily.johnson@email.com',
        phone: '(555) 345-6789',
        address: {
          street: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601'
        },
        insurance: {
          provider: 'Cigna',
          policyNumber: 'CIG345678',
          groupNumber: 'GRP003'
        },
        tenantId: 'demo-tenant-1',
        createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        name: 'Emily Johnson',
        age: 35,
        status: 'Active',
        lastVisit: '2024-01-20',
        nextAppointment: '2024-03-01',
        avatar: undefined,
        gender: 'Female'
      }
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock navigation utilities
vi.mock('@/utils/navigation', () => ({
  navigationHelpers: {
    goToPatientProfile: vi.fn(),
    getPageTitle: vi.fn(() => 'Patients'),
    generateBreadcrumbItems: vi.fn(() => []),
    isActiveRoute: vi.fn(() => false),
  },
  getPageTitle: vi.fn(() => 'Patients'),
  generateBreadcrumbItems: vi.fn(() => []),
}));

// Mock lucide-react icons - comprehensive mock for all icons used in the app
vi.mock('lucide-react', () => ({
  User: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Phone: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Mail: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Calendar: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  MoreHorizontal: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Loader2: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Search: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Settings: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  AlertTriangle: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Users: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  // Additional icons used in navigation and other components
  Filter: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronDown: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronUp: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronLeft: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  ChevronRight: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  X: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Clock: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Star: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Forward: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Reply: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  MessageSquare: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Archive: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Trash2: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  CheckCircle: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Sparkles: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Plus: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  CheckSquare: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
  Square: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
      CreditCard: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
      RefreshCw: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
      LogOut: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
      Check: () => <svg data-testid="lucide-icon"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>,
    }));

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the patients page with correct heading', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('Patients')).toBeInTheDocument();
      expect(screen.getByText('Manage your patient records and information')).toBeInTheDocument();
    });

    it('renders the data table', () => {
      render(<PatientsPage />);
      
      // Look for the table element instead of a specific test ID
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('displays patient data correctly', () => {
      render(<PatientsPage />);
      
      // Check for patient names
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Emily Johnson')).toBeInTheDocument();
    });

    it('displays patient contact information', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('john.doe@email.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@email.com')).toBeInTheDocument();
      expect(screen.getByText('emily.johnson@email.com')).toBeInTheDocument();
    });

    it('displays patient phone numbers', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('(555) 234-5678')).toBeInTheDocument();
      expect(screen.getByText('(555) 345-6789')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('renders search input with correct placeholder', () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('allows typing in search input', async () => {
      const user = userEvent.setup();
      render(<PatientsPage />);
      
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      await user.type(searchInput, 'John');
      
      expect(searchInput).toHaveValue('John');
    });
  });

  describe('Filter Functionality', () => {
    it('renders filter button', () => {
      render(<PatientsPage />);
      
      const filterButton = screen.getByText('Filters');
      expect(filterButton).toBeInTheDocument();
    });

    it('allows clicking filter button', async () => {
      const user = userEvent.setup();
      render(<PatientsPage />);
      
      const filterButton = screen.getByText('Filters');
      await user.click(filterButton);
      
      // Filter button should still be visible after click
      expect(filterButton).toBeInTheDocument();
    });
  });

  describe('Patient Actions', () => {
    it('renders action buttons for each patient', () => {
      render(<PatientsPage />);
      
      // Look for the MoreHorizontal icons (action buttons)
      const actionButtons = screen.getAllByTestId('lucide-icon');
      expect(actionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    it('shows patient status badges', () => {
      render(<PatientsPage />);
      
      // All patients in our mock data are 'Active'
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    it('displays patient ages', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('39')).toBeInTheDocument(); // John Doe's age
      expect(screen.getByText('34')).toBeInTheDocument(); // Jane Smith's age
      expect(screen.getByText('35')).toBeInTheDocument(); // Emily Johnson's age
    });

    it('displays last visit dates', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2024-01-10')).toBeInTheDocument();
      expect(screen.getByText('2024-01-20')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has proper component structure', () => {
      render(<PatientsPage />);
      
      // Look for the table element instead of a specific test ID
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('renders patient rows with proper structure', () => {
      render(<PatientsPage />);
      
      // Check that patient data is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Emily Johnson')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<PatientsPage />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Patients');
    });

    it('has accessible search input', () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('has accessible filter button', () => {
      render(<PatientsPage />);
      
      const filterButton = screen.getByText('Filters');
      expect(filterButton).toBeInTheDocument();
    });
  });
});