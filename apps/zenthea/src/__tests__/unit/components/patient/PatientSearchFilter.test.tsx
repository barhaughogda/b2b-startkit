import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PatientSearchFilter } from '@/components/patient/PatientSearchFilter';
import { Patient } from '@/types';

// Mock data for testing
const mockPatients: Patient[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123',
    dateOfBirth: '1990-01-01',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
    },
    insurance: {
      provider: 'Blue Cross',
      policyNumber: 'BC123456',
      groupNumber: 'GRP001',
    },
    conditions: ['Diabetes', 'Hypertension'],
    emergencyContact: {
      name: 'Jane Doe',
      phone: '555-0124',
      relationship: 'Spouse',
    },
    tenantId: 'tenant1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '555-0125',
    dateOfBirth: '1985-05-15',
    address: {
      street: '456 Oak Ave',
      city: 'Somewhere',
      state: 'NY',
      zipCode: '67890',
    },
    insurance: {
      provider: 'Aetna',
      policyNumber: 'AET789012',
      groupNumber: 'GRP002',
    },
    conditions: ['Asthma'],
    emergencyContact: {
      name: 'Bob Smith',
      phone: '555-0126',
      relationship: 'Brother',
    },
    tenantId: 'tenant1',
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01'),
  },
];

describe('PatientSearchFilter', () => {
  const mockOnSearch = vi.fn();
  const mockOnFilter = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input with proper placeholder', () => {
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search patients by name, condition, or insurance/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should render healthcare-specific filter options', () => {
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    // Check for healthcare-specific filter labels
    expect(screen.getByText('Conditions')).toBeInTheDocument();
    expect(screen.getByText('Insurance Provider')).toBeInTheDocument();
    expect(screen.getByText('Age Range')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('should call onSearch with debounced input', async () => {
    const user = userEvent.setup();
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search patients by name, condition, or insurance/i);
    
    await user.type(searchInput, 'John');
    
    // Wait for debounced search
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('John');
    }, { timeout: 500 });
  });

  it('should filter patients by conditions', async () => {
    const user = userEvent.setup();
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const conditionFilter = screen.getByLabelText(/conditions/i);
    await user.click(conditionFilter);
    
    // Wait for dropdown to open and find the option
    await waitFor(() => {
      expect(screen.getByText('Diabetes')).toBeInTheDocument();
    });
    
    const diabetesOption = screen.getByText('Diabetes');
    await user.click(diabetesOption);

    expect(mockOnFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: 'Diabetes'
      })
    );
  });

  it('should filter patients by insurance provider', async () => {
    const user = userEvent.setup();
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const insuranceFilter = screen.getByLabelText(/insurance provider/i);
    await user.click(insuranceFilter);
    
    // Wait for dropdown to open and find the option
    await waitFor(() => {
      expect(screen.getByText('Blue Cross')).toBeInTheDocument();
    });
    
    const blueCrossOption = screen.getByText('Blue Cross');
    await user.click(blueCrossOption);

    expect(mockOnFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        insurance: 'Blue Cross'
      })
    );
  });

  it('should filter patients by age range', async () => {
    const user = userEvent.setup();
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const ageFilter = screen.getByLabelText(/age range/i);
    await user.click(ageFilter);
    
    // Wait for dropdown to open and find the option
    await waitFor(() => {
      expect(screen.getByText('36-45')).toBeInTheDocument();
    });
    
    const ageRangeOption = screen.getByText('36-45');
    await user.click(ageRangeOption);

    expect(mockOnFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        ageRange: '36-45'
      })
    );
  });

  it('should clear all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalled();
  });

  it('should display filter options based on available patient data', () => {
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    // Check that condition options are populated from patient data
    const conditionFilter = screen.getByLabelText(/conditions/i);
    fireEvent.click(conditionFilter);
    
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
    expect(screen.getByText('Hypertension')).toBeInTheDocument();
    expect(screen.getByText('Asthma')).toBeInTheDocument();
  });

  it('should handle empty patient list gracefully', () => {
    render(
      <PatientSearchFilter
        patients={[]}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    // Should still render the component without errors
    expect(screen.getByPlaceholderText(/search patients by name, condition, or insurance/i)).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA labels', () => {
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByLabelText(/search patients/i);
    expect(searchInput).toBeInTheDocument();

    const conditionFilter = screen.getByLabelText(/conditions/i);
    expect(conditionFilter).toBeInTheDocument();

    const insuranceFilter = screen.getByLabelText(/insurance provider/i);
    expect(insuranceFilter).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <PatientSearchFilter
        patients={mockPatients}
        onSearch={mockOnSearch}
        onFilter={mockOnFilter}
        onClear={mockOnClear}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search patients by name, condition, or insurance/i);
    
    // Tab to search input
    await user.tab();
    expect(searchInput).toHaveFocus();

    // Type and press Enter
    await user.type(searchInput, 'test query');
    await user.keyboard('{Enter}');
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });
});
