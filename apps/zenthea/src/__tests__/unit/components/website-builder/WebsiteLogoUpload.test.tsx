import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock LogoCropDialog to simplify testing
vi.mock('@/components/website-builder/LogoCropDialog', () => ({
  LogoCropDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? (
      <div data-testid="crop-dialog">
        <button onClick={() => onOpenChange(false)}>Close Crop Dialog</button>
      </div>
    ) : null
  ),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Import after mocks
import { WebsiteLogoUpload } from '@/components/website-builder/WebsiteLogoUpload';

describe('WebsiteLogoUpload', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state (no logo)', () => {
    it('should render upload button when no logo is set', () => {
      render(<WebsiteLogoUpload {...defaultProps} />);

      expect(screen.getByText('Click to upload logo')).toBeInTheDocument();
      expect(screen.getByText('4:1 aspect ratio • Max 10MB')).toBeInTheDocument();
    });

    it('should have a hidden file input', () => {
      render(<WebsiteLogoUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('sr-only');
    });

    it('should accept specific image types', () => {
      render(<WebsiteLogoUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput?.accept).toBe('image/jpeg,image/png,image/gif,image/webp');
    });
  });

  describe('Logo preview state', () => {
    it('should display logo preview when value is provided', () => {
      render(<WebsiteLogoUpload {...defaultProps} value="https://example.com/logo.png" />);

      const img = screen.getByRole('img', { name: /website logo preview/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('should show Replace and Remove buttons when logo is set', () => {
      render(<WebsiteLogoUpload {...defaultProps} value="https://example.com/logo.png" />);

      expect(screen.getByRole('button', { name: /replace/i })).toBeInTheDocument();
      // Remove button has X icon, check by test id or role
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // Replace + Remove
    });

    it('should call onChange with empty string when Remove is clicked', () => {
      const onChange = vi.fn();
      render(
        <WebsiteLogoUpload {...defaultProps} value="https://example.com/logo.png" onChange={onChange} />
      );

      // Find the remove button (the one without "Replace" text)
      const buttons = screen.getAllByRole('button');
      const removeButton = buttons.find(btn => !btn.textContent?.includes('Replace'));
      
      if (removeButton) {
        fireEvent.click(removeButton);
        expect(onChange).toHaveBeenCalledWith('');
      }
    });
  });

  describe('Disabled state', () => {
    it('should disable upload when disabled prop is true', () => {
      render(<WebsiteLogoUpload {...defaultProps} disabled={true} />);

      const uploadButton = screen.getByText('Click to upload logo').closest('button');
      expect(uploadButton).toBeDisabled();
    });

    it('should disable Replace button when disabled', () => {
      render(
        <WebsiteLogoUpload {...defaultProps} value="https://example.com/logo.png" disabled={true} />
      );

      expect(screen.getByRole('button', { name: /replace/i })).toBeDisabled();
    });
  });

  describe('File selection', () => {
    it('should show error for invalid file type', () => {
      render(<WebsiteLogoUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a file with invalid type
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('Please select a valid image (JPEG, PNG, GIF, or WebP)')).toBeInTheDocument();
    });

    it('should show error for file that is too large', () => {
      render(<WebsiteLogoUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a file larger than 10MB
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.png', { type: 'image/png' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('Image must be less than 10MB')).toBeInTheDocument();
    });

    it('should open crop dialog for valid file', () => {
      render(<WebsiteLogoUpload {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a valid image file
      const file = new File(['test'], 'logo.png', { type: 'image/png' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Crop dialog should be shown
      expect(screen.getByTestId('crop-dialog')).toBeInTheDocument();
    });
  });
});

