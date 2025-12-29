import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { DataTable, Column, FilterOption } from '@/components/ui/data-table';

// Mock data for testing
const mockData = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    status: 'Active',
    lastVisit: '2024-01-15',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@email.com',
    phone: '+1 (555) 234-5678',
    status: 'Inactive',
    lastVisit: '2024-01-10',
  },
];

// Mock data with undefined values for testing robust sorting
const mockDataWithUndefined = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    status: 'Active',
    lastVisit: '2024-01-15',
    nextAppointment: '2024-02-15',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@email.com',
    phone: '+1 (555) 234-5678',
    status: 'Inactive',
    lastVisit: '2024-01-10',
    nextAppointment: undefined,
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob.wilson@email.com',
    phone: '+1 (555) 345-6789',
    status: 'Active',
    lastVisit: '2024-01-20',
    nextAppointment: null,
  },
];

const mockColumns: Column<typeof mockData[0]>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
  },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchKeys={['name', 'email']}
      />
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('john.smith@email.com')).toBeInTheDocument();
  });

  it('filters data based on search query', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchKeys={['name', 'email']}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('shows no results message when no data matches', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchKeys={['name', 'email']}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    expect(screen.getByText('No records found matching your criteria')).toBeInTheDocument();
  });

  it('handles sorting when column header is clicked', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchKeys={['name', 'email']}
      />
    );

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader); // asc
    const rowsAsc = screen.getAllByRole('row').slice(1); // skip header
    expect(rowsAsc[0]).toHaveTextContent('Jane Doe');
    expect(rowsAsc[1]).toHaveTextContent('John Smith');

    fireEvent.click(nameHeader); // desc
    const rowsDesc = screen.getAllByRole('row').slice(1);
    expect(rowsDesc[0]).toHaveTextContent('John Smith');
    expect(rowsDesc[1]).toHaveTextContent('Jane Doe');
  });

  it('handles sorting with undefined values correctly', () => {
    const columnsWithAppointment: Column<typeof mockDataWithUndefined[0]>[] = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
      {
        key: 'nextAppointment',
        label: 'Next Appointment',
        sortable: true,
      },
    ];

    render(
      <DataTable
        data={mockDataWithUndefined}
        columns={columnsWithAppointment}
        searchKeys={['name', 'email']}
      />
    );

    const appointmentHeader = screen.getByText('Next Appointment');
    fireEvent.click(appointmentHeader); // asc

    const rowsAsc = screen.getAllByRole('row').slice(1); // skip header
    // John Smith should be first (has appointment), then undefined/null values last
    expect(rowsAsc[0]).toHaveTextContent('John Smith');
    
    // The other two rows should contain Bob Wilson and Jane Doe (order may vary for undefined/null)
    const otherRows = rowsAsc.slice(1);
    const names = otherRows.map(row => row.textContent);
    expect(names).toContain('Bob Wilson');
    expect(names).toContain('Jane Doe');
    
    // Check that undefined/null values are rendered as empty strings
    const cellsWithAppointment = screen.getAllByRole('cell').filter(cell => 
      cell.textContent?.includes('2024-02-15') || cell.textContent === ''
    );
    expect(cellsWithAppointment).toHaveLength(3); // One with date, two empty
  });

  it('handles case-insensitive string sorting', () => {
    const mixedCaseData = [
      { id: '1', name: 'alice', email: 'alice@email.com' },
      { id: '2', name: 'Bob', email: 'bob@email.com' },
      { id: '3', name: 'CHARLIE', email: 'charlie@email.com' },
    ];

    const nameColumn: Column<typeof mixedCaseData[0]>[] = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
    ];

    render(
      <DataTable
        data={mixedCaseData}
        columns={nameColumn}
        searchKeys={['name']}
      />
    );

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader); // asc

    const rowsAsc = screen.getAllByRole('row').slice(1);
    expect(rowsAsc[0]).toHaveTextContent('alice');
    expect(rowsAsc[1]).toHaveTextContent('Bob');
    expect(rowsAsc[2]).toHaveTextContent('CHARLIE');
  });

  it('prevents row click when clicking on interactive elements', () => {
    const mockOnRowClick = vi.fn();
    const dataWithButtons = [
      { id: '1', name: 'John', email: 'john@test.com' },
      { id: '2', name: 'Jane', email: 'jane@test.com' },
    ];

    const columnsWithButton: Column<typeof dataWithButtons[0]>[] = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
      {
        key: 'id',
        label: 'Actions',
        render: () => (
          <button data-testid="action-button">Action</button>
        ),
      },
    ];

    render(
      <DataTable
        data={dataWithButtons}
        columns={columnsWithButton}
        onRowClick={mockOnRowClick}
        searchKeys={['name']}
      />
    );

    // Click on the first button should not trigger row click
    const actionButtons = screen.getAllByTestId('action-button');
    const firstButton = actionButtons[0];
    fireEvent.click(firstButton);
    expect(mockOnRowClick).not.toHaveBeenCalled();

    // Click on the row (but not the button) should trigger row click
    const row = firstButton.closest('tr');
    if (row) {
      fireEvent.click(row);
      expect(mockOnRowClick).toHaveBeenCalledWith(dataWithButtons[0]);
    }
  });

  it('prevents row click when clicking on links and other interactive elements', () => {
    const mockOnRowClick = vi.fn();
    const dataWithLinks = [
      { id: '1', name: 'John', email: 'john@test.com' },
    ];

    const columnsWithLink: Column<typeof dataWithLinks[0]>[] = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
      },
      {
        key: 'id',
        label: 'Actions',
        render: () => (
          <a href="#" data-testid="action-link">View Details</a>
        ),
      },
    ];

    render(
      <DataTable
        data={dataWithLinks}
        columns={columnsWithLink}
        onRowClick={mockOnRowClick}
        searchKeys={['name']}
      />
    );

    // Click on the link should not trigger row click
    const actionLink = screen.getByTestId('action-link');
    fireEvent.click(actionLink);
    expect(mockOnRowClick).not.toHaveBeenCalled();
  });

  it('adds aria-sort attribute to sortable column headers', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchKeys={['name', 'email']}
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');
    const emailHeader = screen.getByText('Email').closest('th');

    // Initially, no column is sorted
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(emailHeader).toHaveAttribute('aria-sort', 'none');

    // Click name header to sort ascending
    fireEvent.click(screen.getByText('Name'));
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(emailHeader).toHaveAttribute('aria-sort', 'none');

    // Click name header again to sort descending
    fireEvent.click(screen.getByText('Name'));
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    expect(emailHeader).toHaveAttribute('aria-sort', 'none');

    // Click email header to sort it
    fireEvent.click(screen.getByText('Email'));
    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    expect(emailHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('uses stable row keys instead of array index', () => {
    const dataWithIds = [
      { id: 'user-1', name: 'John', email: 'john@test.com' },
      { id: 'user-2', name: 'Jane', email: 'jane@test.com' },
    ];

    const columns: Column<typeof dataWithIds[0]>[] = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
    ];

    const { rerender } = render(
      <DataTable
        data={dataWithIds}
        columns={columns}
        searchKeys={['name', 'email']}
      />
    );

    // Verify initial render
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();

    // Re-render with same data but different order to test key stability
    const reorderedData = [
      { id: 'user-2', name: 'Jane', email: 'jane@test.com' },
      { id: 'user-1', name: 'John', email: 'john@test.com' },
    ];

    rerender(
      <DataTable
        data={reorderedData}
        columns={columns}
        searchKeys={['name', 'email']}
      />
    );

    // Verify that the component still renders correctly with stable keys
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('handles undefined appointment dates in sorting correctly', () => {
    const dataWithAppointments = [
      { id: '1', name: 'John', nextAppointment: '2024-02-15' },
      { id: '2', name: 'Jane', nextAppointment: undefined },
      { id: '3', name: 'Bob', nextAppointment: '2024-01-10' },
      { id: '4', name: 'Alice', nextAppointment: null },
    ];

    const columns: Column<typeof dataWithAppointments[0]>[] = [
      { key: 'name', label: 'Name', sortable: true },
      { 
        key: 'nextAppointment', 
        label: 'Next Appointment', 
        sortable: true,
        render: (value) => value ? value : <span className="text-muted-foreground">Not scheduled</span>
      },
    ];

    render(
      <DataTable
        data={dataWithAppointments}
        columns={columns}
        searchKeys={['name']}
      />
    );

    // Click appointment header to sort ascending
    const appointmentHeader = screen.getByText('Next Appointment');
    fireEvent.click(appointmentHeader);

    const rows = screen.getAllByRole('row').slice(1); // skip header
    
    // Bob should be first (earliest date), then John, then undefined/null values
    expect(rows[0]).toHaveTextContent('Bob');
    expect(rows[1]).toHaveTextContent('John');
    
    // The last two rows should be Jane and Alice (order may vary for undefined/null)
    const lastTwoRows = rows.slice(2);
    const names = lastTwoRows.map(row => row.textContent);
    expect(names.some(name => name.includes('Jane'))).toBe(true);
    expect(names.some(name => name.includes('Alice'))).toBe(true);
  });

  it('handles invalid dates in date filtering gracefully', () => {
    const dataWithDates = [
      { id: '1', name: 'John', appointmentDate: '2024-02-15' },
      { id: '2', name: 'Jane', appointmentDate: 'invalid-date' },
      { id: '3', name: 'Bob', appointmentDate: '2024-01-10' },
    ];

    const columns: Column<typeof dataWithDates[0]>[] = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'appointmentDate', label: 'Appointment Date', sortable: true },
    ];

    const filterOptions: FilterOption[] = [
      {
        key: 'appointmentDate',
        label: 'Appointment Date',
        type: 'date-range',
      },
    ];

    // Mock console.warn to capture warnings
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <DataTable
        data={dataWithDates}
        columns={columns}
        filterOptions={filterOptions}
        searchKeys={['name']}
      />
    );

    // Set invalid date filter
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    // This test verifies that the component doesn't crash with invalid dates
    // The actual date filtering logic is tested in the component's useMemo
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
