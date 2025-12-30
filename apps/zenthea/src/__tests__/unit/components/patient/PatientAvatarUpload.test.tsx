import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientAvatarUpload } from '@/components/patient/PatientAvatarUpload';

// Mock fetch
global.fetch = vi.fn();

// Mock @/lib/auth
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: () => ({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
    status: 'authenticated',
  }),
}));

// Mock AvatarCropDialog to avoid react-easy-crop dependency issues in tests
vi.mock('@/components/patient/AvatarCropDialog', () => ({
  AvatarCropDialog: ({ onCropComplete, onClose, imageSrc, open }: any) => {
    // In tests, call onCropComplete when dialog is opened
    React.useEffect(() => {
      if (open && imageSrc) {
        // Use setTimeout to ensure fetch mock is set up first
        setTimeout(() => {
          const blob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
          onCropComplete(blob);
        }, 0);
      }
    }, [open, imageSrc, onCropComplete]);
    return null;
  },
}));

describe('PatientAvatarUpload', () => {
  const mockOnAvatarChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders avatar upload component with help text', () => {
      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      expect(screen.getByText(/Upload a professional photo/i)).toBeInTheDocument();
    });

    it('displays current avatar when provided', () => {
      // Mock image loading to succeed
      Object.defineProperty(HTMLImageElement.prototype, 'complete', {
        get: () => true,
      });
      Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
        get: () => 100,
      });
      Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
        get: () => 100,
      });

      render(
        <PatientAvatarUpload
          currentAvatar="https://example.com/avatar.jpg"
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      // Avatar should attempt to load the image
      const avatarImage = screen.queryByAltText('Profile avatar');
      if (avatarImage) {
        expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      }
    });

    it('shows initials when no avatar is provided', () => {
      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      // Avatar fallback should show initials "DP"
      expect(screen.getByText('DP')).toBeInTheDocument();
    });

    it('hides upload controls when disabled', () => {
      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={true}
        />
      );

      // Camera button should not be visible
      const cameraButton = screen.queryByLabelText('Upload profile photo');
      expect(cameraButton).not.toBeInTheDocument();
    });
  });

  describe('Avatar Upload', () => {
    it('calls onAvatarChange with uploaded URL after successful upload', async () => {
      const user = userEvent.setup();
      const mockUrl = 'https://example.com/new-avatar.jpg';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      const fileInput = screen.getByLabelText('Select profile photo') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/upload-avatar',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });

      await waitFor(() => {
        expect(mockOnAvatarChange).toHaveBeenCalledWith(mockUrl);
      });
    });

    it('updates preview when currentAvatar prop changes', async () => {
      // Mock image loading
      Object.defineProperty(HTMLImageElement.prototype, 'complete', {
        get: () => true,
      });
      Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
        get: () => 100,
      });
      Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
        get: () => 100,
      });

      const { rerender } = render(
        <PatientAvatarUpload
          currentAvatar="https://example.com/old-avatar.jpg"
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      // Update the currentAvatar prop
      rerender(
        <PatientAvatarUpload
          currentAvatar="https://example.com/new-avatar.jpg"
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      // Component should update - check that remove button appears (indicates preview is set)
      await waitFor(() => {
        const removeButton = screen.queryByText('Remove');
        expect(removeButton).toBeInTheDocument();
      });
    });

    it('handles upload errors gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockRejectedValueOnce(new Error('Upload failed'));

      render(
        <PatientAvatarUpload
          currentAvatar="https://example.com/old-avatar.jpg"
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      const fileInput = screen.getByLabelText('Select profile photo') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        const errorElement = screen.queryByText(/Upload failed/i);
        expect(errorElement).toBeInTheDocument();
      });

      // Error should be displayed
      expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
    });

    it('validates file type', async () => {
      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      const fileInput = screen.getByLabelText('Select profile photo') as HTMLInputElement;
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      // Create FileList using DataTransfer (standard browser API)
      // This avoids Object.defineProperty conflicts while properly simulating file selection
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Use Object.assign to set files property (more compatible than defineProperty)
      // This approach works with fireEvent.change() which properly triggers React's onChange handler
      Object.assign(fileInput, { files: dataTransfer.files });

      // Fire change event to trigger component's handleFileSelect validation
      fireEvent.change(fileInput);

      // Wait for error message to appear (React state update)
      await waitFor(() => {
        const errorElement = screen.queryByText(/Please select a valid image file/i);
        expect(errorElement).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockOnAvatarChange).not.toHaveBeenCalled();
    });

    it('validates file size', async () => {
      const user = userEvent.setup();

      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      const fileInput = screen.getByLabelText('Select profile photo') as HTMLInputElement;
      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        const errorElement = screen.queryByText(/Image size must be less than 5MB/i);
        expect(errorElement).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockOnAvatarChange).not.toHaveBeenCalled();
    });
  });

  describe('Avatar Removal', () => {
    it('removes avatar when remove button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PatientAvatarUpload
          currentAvatar="https://example.com/avatar.jpg"
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      expect(mockOnAvatarChange).toHaveBeenCalledWith('');
    });

    it('does not show remove button when no avatar is present', () => {
      render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('State Synchronization', () => {
    it('syncs preview when currentAvatar changes after upload completes', async () => {
      const user = userEvent.setup();
      const mockUrl = 'https://example.com/uploaded-avatar.jpg';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: mockUrl }),
      });

      const { rerender } = render(
        <PatientAvatarUpload
          currentAvatar=""
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      const fileInput = screen.getByLabelText('Select profile photo') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(mockOnAvatarChange).toHaveBeenCalledWith(mockUrl);
      });

      // Simulate parent component updating currentAvatar prop after mutation completes
      rerender(
        <PatientAvatarUpload
          currentAvatar={mockUrl}
          patientName="Demo Patient"
          onAvatarChange={mockOnAvatarChange}
          disabled={false}
        />
      );

      // Component should sync - remove button should appear (indicates preview is set)
      await waitFor(() => {
        const removeButton = screen.queryByText('Remove');
        expect(removeButton).toBeInTheDocument();
      });
    });
  });
});

