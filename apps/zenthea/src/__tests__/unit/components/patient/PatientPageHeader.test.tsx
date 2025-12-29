import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PatientPageHeader } from '@/components/patient/PatientPageHeader';

// Mock PatientHeaderProvider
const mockSetHeaderContent = vi.fn();

const mockUsePatientHeader = vi.fn(() => ({
  setHeaderContent: mockSetHeaderContent,
}));

vi.mock('@/components/patient/PatientHeaderProvider', () => ({
  usePatientHeader: () => mockUsePatientHeader(),
}));

describe('PatientPageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render anything (returns null)', () => {
      const { container } = render(
        <PatientPageHeader title="Test Title" />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should call setHeaderContent with title on mount', () => {
      render(<PatientPageHeader title="Test Title" />);
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Test Title',
        description: undefined,
        actions: undefined,
      });
    });

    it('should call setHeaderContent with title and description', () => {
      render(
        <PatientPageHeader 
          title="Test Title" 
          description="Test Description"
        />
      );
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Test Title',
        description: 'Test Description',
        actions: undefined,
      });
    });

    it('should call setHeaderContent with title, description, and actions', () => {
      const actions = <button>Action</button>;
      
      render(
        <PatientPageHeader 
          title="Test Title" 
          description="Test Description"
          actions={actions}
        />
      );
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Test Title',
        description: 'Test Description',
        actions,
      });
    });
  });

  describe('Effect Updates', () => {
    it('should update header content when title changes', () => {
      const { rerender } = render(
        <PatientPageHeader title="Initial Title" />
      );
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Initial Title',
        description: undefined,
        actions: undefined,
      });
      
      mockSetHeaderContent.mockClear();
      
      rerender(<PatientPageHeader title="Updated Title" />);
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: undefined,
        actions: undefined,
      });
    });

    it('should update header content when description changes', () => {
      const { rerender } = render(
        <PatientPageHeader 
          title="Test Title" 
          description="Initial Description"
        />
      );
      
      mockSetHeaderContent.mockClear();
      
      rerender(
        <PatientPageHeader 
          title="Test Title" 
          description="Updated Description"
        />
      );
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Test Title',
        description: 'Updated Description',
        actions: undefined,
      });
    });

    it('should update header content when actions change', () => {
      const initialActions = <button>Initial Action</button>;
      const updatedActions = <button>Updated Action</button>;
      
      const { rerender } = render(
        <PatientPageHeader 
          title="Test Title" 
          actions={initialActions}
        />
      );
      
      mockSetHeaderContent.mockClear();
      
      rerender(
        <PatientPageHeader 
          title="Test Title" 
          actions={updatedActions}
        />
      );
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith({
        title: 'Test Title',
        description: undefined,
        actions: updatedActions,
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear header content on unmount', () => {
      const { unmount } = render(
        <PatientPageHeader title="Test Title" />
      );
      
      mockSetHeaderContent.mockClear();
      
      unmount();
      
      expect(mockSetHeaderContent).toHaveBeenCalledWith(null);
    });
  });
});

