import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyContactsForm } from '@/components/patient/profile/EmergencyContactsForm';
// Use relative import for Convex generated files (they're at root level, not in src/)
// File is 6 levels deep: src/__tests__/unit/components/patient/profile/
// Need 6 ../ segments to reach root where convex/ is located
import { Id } from '../../../../../../convex/_generated/dataModel';

// Mock Convex
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockAddEmergencyContact = vi.fn().mockResolvedValue(undefined);
const mockRemoveEmergencyContact = vi.fn().mockResolvedValue(undefined);

vi.mock('convex/react', () => ({
  useMutation: vi.fn((mutationFn) => {
    // Safe string conversion - handle different mutationFn types
    const fnString = typeof mutationFn === 'function' 
      ? mutationFn.toString() 
      : String(mutationFn || '');
    
    if (fnString.includes('updatePatientProfile')) {
      return mockUpdateProfile;
    }
    if (fnString.includes('addEmergencyContact')) {
      return mockAddEmergencyContact;
    }
    if (fnString.includes('removeEmergencyContact')) {
      return mockRemoveEmergencyContact;
    }
    return vi.fn().mockResolvedValue(undefined);
  }),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        email: 'patient@demo.com',
      },
    },
    status: 'authenticated',
  })),
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EmergencyContactsForm', () => {
  const mockPatientId = 'patient-123' as Id<'patients'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
    mockAddEmergencyContact.mockReset();
    mockAddEmergencyContact.mockResolvedValue(undefined);
    mockRemoveEmergencyContact.mockReset();
    mockRemoveEmergencyContact.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render emergency contacts section', () => {
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      expect(screen.getByText('Emergency Contacts')).toBeInTheDocument();
      expect(screen.getByText(/people to contact in case of emergency/i)).toBeInTheDocument();
    });

    it('should render healthcare proxy section', () => {
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      expect(screen.getByText('Healthcare Proxy')).toBeInTheDocument();
      expect(screen.getByText(/person authorized to make medical decisions/i)).toBeInTheDocument();
    });

    it('should render add contact button', () => {
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
    });

    it('should render save proxy button', () => {
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      expect(screen.getByRole('button', { name: /save proxy information/i })).toBeInTheDocument();
    });

    it('should display empty state when no emergency contacts', () => {
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      expect(screen.getByText(/no emergency contacts recorded/i)).toBeInTheDocument();
    });
  });

  describe('Emergency Contacts', () => {
    it('should display initial emergency contacts', () => {
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            email: 'john@example.com',
            isPrimary: true,
          },
          {
            name: 'Jane Smith',
            relationship: 'Sister',
            phone: '(555) 987-6543',
            isPrimary: false,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Spouse')).toBeInTheDocument();
      expect(screen.getByText('Sister')).toBeInTheDocument();
    });

    it('should display contact details', () => {
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            email: 'john@example.com',
            isPrimary: true,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText(/relationship:/i)).toBeInTheDocument();
      expect(screen.getByText(/phone:/i)).toBeInTheDocument();
      expect(screen.getByText(/email:/i)).toBeInTheDocument();
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display primary badge for primary contact', () => {
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    it('should not display primary badge for non-primary contacts', () => {
      const initialData = {
        emergencyContacts: [
          {
            name: 'Jane Smith',
            relationship: 'Sister',
            phone: '(555) 987-6543',
            isPrimary: false,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.queryByText('Primary')).not.toBeInTheDocument();
    });

    it('should handle contacts without email', () => {
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText(/email:/i)).not.toBeInTheDocument();
    });

    it('should add a new emergency contact', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add contact/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddEmergencyContact).toHaveBeenCalledWith({
          patientId: mockPatientId,
          contact: {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            isPrimary: true, // First contact is primary
          },
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should set first contact as primary', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add contact/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddEmergencyContact).toHaveBeenCalledWith(
          expect.objectContaining({
            contact: expect.objectContaining({
              isPrimary: true,
            }),
          })
        );
      });
    });

    it('should remove an emergency contact', async () => {
      const user = userEvent.setup();
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(mockRemoveEmergencyContact).toHaveBeenCalledWith({
          patientId: mockPatientId,
          index: 0,
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when adding contact', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add contact/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Contact added', {
          description: 'Please fill in the contact details.',
        });
      });
    });

    it('should show success message when removing contact', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Contact removed', {
          description: 'The contact has been removed.',
        });
      });
    });

    it('should handle add contact errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockAddEmergencyContact.mockRejectedValue(new Error('Failed to add contact'));

      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const addButton = screen.getByRole('button', { name: /add contact/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should handle remove contact errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockRemoveEmergencyContact.mockRejectedValue(new Error('Failed to remove contact'));

      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Healthcare Proxy', () => {
    it('should render all healthcare proxy fields', () => {
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/healthcare proxy document on file/i)).toBeInTheDocument();
    });

    it('should display initial healthcare proxy data', () => {
      const initialData = {
        healthcareProxy: {
          name: 'Mary Johnson',
          relationship: 'Daughter',
          phone: '(555) 111-2222',
          email: 'mary@example.com',
          documentOnFile: true,
        },
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByDisplayValue('Mary Johnson')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Daughter')).toBeInTheDocument();
      expect(screen.getByDisplayValue('(555) 111-2222')).toBeInTheDocument();
      expect(screen.getByDisplayValue('mary@example.com')).toBeInTheDocument();
      expect(screen.getByLabelText(/healthcare proxy document on file/i)).toBeChecked();
    });

    it('should update healthcare proxy name', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const nameInput = screen.getByLabelText(/^name$/i);
      await user.type(nameInput, 'Mary Johnson');

      expect(nameInput).toHaveValue('Mary Johnson');
    });

    it('should update healthcare proxy relationship', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const relationshipInput = screen.getByLabelText(/relationship/i);
      await user.type(relationshipInput, 'Daughter');

      expect(relationshipInput).toHaveValue('Daughter');
    });

    it('should update healthcare proxy phone', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '(555) 111-2222');

      expect(phoneInput).toHaveValue('(555) 111-2222');
    });

    it('should update healthcare proxy email', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'mary@example.com');

      expect(emailInput).toHaveValue('mary@example.com');
    });

    it('should toggle document on file checkbox', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const checkbox = screen.getByLabelText(/healthcare proxy document on file/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should save healthcare proxy information', async () => {
      const user = userEvent.setup();
      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const nameInput = screen.getByLabelText(/^name$/i);
      await user.type(nameInput, 'Mary Johnson');

      const saveButton = screen.getByRole('button', { name: /save proxy information/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          patientId: mockPatientId,
          section: 'healthcareProxy',
          data: expect.objectContaining({
            name: 'Mary Johnson',
          }),
          userEmail: 'patient@demo.com',
        });
      });
    });

    it('should show success message when saving proxy', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save proxy information/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Healthcare proxy updated', {
          description: 'Your healthcare proxy information has been saved.',
        });
      });
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      // Delay the mutation response
      mockUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(undefined), 100)));

      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save proxy information/i });
      await user.click(saveButton);

      // Should show loading text
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockUpdateProfile.mockRejectedValue(new Error('Save failed'));

      render(<EmergencyContactsForm patientId={mockPatientId} />);

      const saveButton = screen.getByRole('button', { name: /save proxy information/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Multiple Contacts', () => {
    it('should display multiple emergency contacts', () => {
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
          {
            name: 'Jane Smith',
            relationship: 'Sister',
            phone: '(555) 987-6543',
            isPrimary: false,
          },
          {
            name: 'Bob Johnson',
            relationship: 'Brother',
            phone: '(555) 555-5555',
            isPrimary: false,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should remove correct contact when multiple exist', async () => {
      const user = userEvent.setup();
      const initialData = {
        emergencyContacts: [
          {
            name: 'John Doe',
            relationship: 'Spouse',
            phone: '(555) 123-4567',
            isPrimary: true,
          },
          {
            name: 'Jane Smith',
            relationship: 'Sister',
            phone: '(555) 987-6543',
            isPrimary: false,
          },
        ],
      };

      render(<EmergencyContactsForm patientId={mockPatientId} initialData={initialData} />);

      const removeButtons = screen.getAllByRole('button');
      // Find remove buttons (they have trash icons)
      const removeButtonElements = removeButtons.filter(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      // Click the second remove button (for Jane Smith)
      if (removeButtonElements[1]) {
        await user.click(removeButtonElements[1]);
      }

      await waitFor(() => {
        expect(mockRemoveEmergencyContact).toHaveBeenCalledWith({
          patientId: mockPatientId,
          index: 1,
          userEmail: 'patient@demo.com',
        });
      });
    });
  });
});

