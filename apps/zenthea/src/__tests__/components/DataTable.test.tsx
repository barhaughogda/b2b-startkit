import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '@/components/ui/data-table';

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
    const rowsAsc = screen.getAllByRole('row').slice(1); // skip header row
    expect(rowsAsc[0]).toHaveTextContent('Jane Doe');
    expect(rowsAsc[1]).toHaveTextContent('John Smith');

    fireEvent.click(nameHeader); // desc
    const rowsDesc = screen.getAllByRole('row').slice(1);
    expect(rowsDesc[0]).toHaveTextContent('John Smith');
    expect(rowsDesc[1]).toHaveTextContent('Jane Doe');
  });
});
