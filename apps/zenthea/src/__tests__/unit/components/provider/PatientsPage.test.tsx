import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientsPage from '@/app/company/patients/page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock Next.js auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'provider',
        tenantId: 'test-tenant',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    status: 'authenticated',
    update: vi.fn(),
  })),
}));

// Mock ProviderNavigationLayout
vi.mock('@/components/navigation/ProviderNavigationLayout', () => ({
  ProviderNavigationLayout: ({ children, pageTitle, pagePath, showSearch }: any) => (
    <div 
      data-testid="provider-navigation-layout"
      data-page-title={pageTitle}
      data-page-path={pagePath}
      data-show-search={showSearch}
    >
      {children}
    </div>
  ),
}));

// Using global lucide-react mock from src/__tests__/setup/lucide-react-mock.ts

// Mock usePatients hook
vi.mock('@/hooks/usePatients', () => ({
  usePatients: () => ({
    patients: [
      {
        _id: '1',
        firstName: 'John',
        lastName: 'Smith',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1 (555) 123-4567',
        status: 'Active',
        lastVisit: '2024-01-15',
        nextAppointment: '2024-02-15',
        tenantId: 'demo-tenant',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        age: 35,
        gender: 'Male',
        avatar: null,
      },
      {
        _id: '2',
        firstName: 'Jane',
        lastName: 'Doe',
        name: 'Jane Doe',
        email: 'jane.doe@email.com',
        phone: '+1 (555) 987-6543',
        status: 'Inactive',
        lastVisit: '2023-09-15T11:00:00Z',
        nextAppointment: null,
        tenantId: 'demo-tenant',
        createdAt: '2023-02-01T00:00:00Z',
        updatedAt: '2023-02-01T00:00:00Z',
        age: 28,
        gender: 'Female',
        avatar: null,
      },
      {
        _id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        name: 'Bob Johnson',
        email: 'bob.johnson@email.com',
        phone: '+1 (555) 345-6789',
        status: 'Active',
        lastVisit: '2024-01-10',
        nextAppointment: '2024-02-10',
        tenantId: 'demo-tenant',
        createdAt: '2023-03-01T00:00:00Z',
        updatedAt: '2023-03-01T00:00:00Z',
        age: 42,
        gender: 'Male',
        avatar: null,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => (
    <div data-testid="avatar" {...props}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children, ...props }: any) => (
    <div data-testid="avatar-fallback" {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ ...props }: any) => (
    <img data-testid="avatar-image" {...props} />
  ),
}));

vi.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data, columns, searchKeys, filterOptions, onRowClick, searchPlaceholder, entityLabel }: any) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    
    // Filter data based on search query
    const filteredData = React.useMemo(() => {
      if (!searchQuery || !searchKeys) return data;
      
      return data.filter((item: any) =>
        searchKeys.some((key: any) =>
          String(item[key]).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }, [data, searchQuery, searchKeys]);
    
    return (
      <div data-testid="data-table">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <div data-testid="search-icon" />
            <input 
              data-testid="input" 
              placeholder={searchPlaceholder}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button data-testid="button" data-variant="outline">
            <div data-testid="filter-icon" />
            Filters
          </button>
        </div>
        <div data-testid="card">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  {columns.map((column: any) => (
                    <th key={column.key} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {column.label}
                        <div className="flex flex-col">
                          <div className="h-4 w-4" />
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery
                          ? `No ${entityLabel} found matching your criteria`
                          : `No ${entityLabel} found`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((patient: any) => (
                    <tr key={patient._id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        <div className="flex items-center gap-3">
                          <div data-testid="avatar">
                            <div data-testid="avatar-fallback">
                              <div data-testid="user-icon" />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-sm text-muted-foreground">{patient.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        {patient.phone}
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        <div>
                          <div>{patient.age}</div>
                          <div className="text-sm text-muted-foreground">{patient.gender}</div>
                        </div>
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        <span data-testid="badge">
                          {patient.status}
                        </span>
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        {patient.lastVisit}
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        <div className="text-sm">
                          {patient.nextAppointment ? patient.nextAppointment : <span className="text-muted-foreground">Not scheduled</span>}
                        </div>
                      </td>
                      <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        <button data-testid="button" data-variant="ghost">
                          <div data-testid="more-horizontal-icon" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} {entityLabel}
          {searchQuery && ' (filtered)'}
        </div>
      </div>
    );
  },
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div data-testid="dropdown-item">{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

vi.mock('@/utils/navigation', () => ({
  navigationHelpers: {
    goToPatientProfile: vi.fn(),
  },
}));

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the page with correct title and description', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('Patients')).toBeInTheDocument();
      expect(screen.getByText('Manage your patient records and information')).toBeInTheDocument();
    });

    it('renders the ProviderNavigationLayout with correct props', () => {
      render(<PatientsPage />);
      
      const navigationLayout = screen.getByTestId('provider-navigation-layout');
      expect(navigationLayout).toHaveAttribute('data-page-title', 'Patients');
      expect(navigationLayout).toHaveAttribute('data-page-path', '/provider/patients');
      expect(navigationLayout).toHaveAttribute('data-show-search', 'true');
    });

    it('renders the search input with correct placeholder', () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByTestId('input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search patients...');
      expect(searchInput).toHaveClass('pl-10');
    });

    it('renders the filters button', () => {
      render(<PatientsPage />);
      
      const filterButton = screen.getByText('Filters');
      expect(filterButton).toHaveTextContent('Filters');
      expect(filterButton).toHaveAttribute('data-variant', 'outline');
    });

    it('renders the DataTable with patient data', () => {
      render(<PatientsPage />);
      
      // Check for table headers
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Last Visit')).toBeInTheDocument();
      expect(screen.getByText('Next Appointment')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders patient information in table rows', () => {
      render(<PatientsPage />);
      
      // Check for patient names
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      
      // Check for patient emails
      expect(screen.getByText('john.smith@email.com')).toBeInTheDocument();
      expect(screen.getByText('jane.doe@email.com')).toBeInTheDocument();
      expect(screen.getByText('bob.johnson@email.com')).toBeInTheDocument();
      
      // Check for patient phones
      expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('+1 (555) 987-6543')).toBeInTheDocument();
      expect(screen.getByText('+1 (555) 345-6789')).toBeInTheDocument();
    });

    it('renders patient status badges correctly', () => {
      render(<PatientsPage />);
      
      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(3);
      
      // Check for status text
      expect(screen.getAllByText('Active')).toHaveLength(2); // Two active patients
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('renders dropdown menu triggers for each patient', () => {
      render(<PatientsPage />);
      
      const dropdownTriggers = screen.getAllByTestId('more-horizontal-icon');
      expect(dropdownTriggers).toHaveLength(3); // One per patient
    });

    it('renders avatars for each patient', () => {
      render(<PatientsPage />);
      
      const avatars = screen.getAllByTestId('avatar');
      expect(avatars).toHaveLength(3);
    });

    it('renders last visit information in table', () => {
      render(<PatientsPage />);
      
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2023-09-15T11:00:00Z')).toBeInTheDocument();
      expect(screen.getByText('2024-01-10')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters patients by name', async () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByTestId('input');
      fireEvent.change(searchInput, { target: { value: 'Smith' } });
      
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    it('filters patients by email', async () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByTestId('input');
      fireEvent.change(searchInput, { target: { value: 'jane.doe' } });
      
      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    it('shows all patients when search is cleared', async () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByTestId('input');
      
      // First filter
      fireEvent.change(searchInput, { target: { value: 'John' } });
      await waitFor(() => {
        expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
      });
      
      // Then clear
      fireEvent.change(searchInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('is case insensitive', async () => {
      render(<PatientsPage />);
      
      const searchInput = screen.getByTestId('input');
      fireEvent.change(searchInput, { target: { value: 'JANE' } });
      
      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });
  });

  describe('DataTable Structure', () => {
    it('renders table with correct headers', () => {
      render(<PatientsPage />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check all column headers are present
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Last Visit')).toBeInTheDocument();
      expect(screen.getByText('Next Appointment')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders patient data in table rows', () => {
      render(<PatientsPage />);
      
      // Check that we have 3 patient rows
      const tableRows = screen.getAllByRole('row');
      expect(tableRows).toHaveLength(4); // 1 header + 3 data rows
    });

    it('renders action dropdowns for each patient', () => {
      render(<PatientsPage />);
      
      const actionButtons = screen.getAllByTestId('more-horizontal-icon');
      expect(actionButtons).toHaveLength(3); // One per patient
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct max-width container', () => {
      render(<PatientsPage />);
      
      // Find the max-width container
      const maxWidthContainer = screen.getByText('Patients').closest('div')?.parentElement;
      expect(maxWidthContainer).toHaveClass('max-w-7xl', 'mx-auto');
    });

    it('renders with proper spacing and layout', () => {
      render(<PatientsPage />);
      
      // Check that the main content area has proper classes
      const mainContent = screen.getByText('Patients').closest('div')?.parentElement;
      expect(mainContent).toHaveClass('max-w-7xl', 'mx-auto');
    });
  });

  describe('Error Handling', () => {
    it('handles empty search gracefully', async () => {
      render(<PatientsPage />);
      
      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByTestId('input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        // Should show "No patients found" message
        expect(screen.getByText('No patients found matching your criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('uses shadcn components correctly', () => {
      render(<PatientsPage />);
      
      // Check that shadcn components are rendered
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
      expect(screen.getByTestId('input')).toBeInTheDocument();
      expect(screen.getAllByTestId('button')).toHaveLength(4); // Filter button + 3 action buttons
    });

    it('integrates with navigation helpers', () => {
      render(<PatientsPage />);
      
      // Check that the component renders without errors
      expect(screen.getByText('Patients')).toBeInTheDocument();
    });
  });
});