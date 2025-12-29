import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PatientHeaderContent } from '@/components/patient/PatientHeaderContent';

// Mock PatientHeaderProvider
interface HeaderContent {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const mockHeaderContent: HeaderContent = {
  title: 'Test Title',
  description: 'Test Description',
  actions: <button>Action Button</button>,
};

const mockUsePatientHeader = vi.fn(() => ({
  headerContent: mockHeaderContent as HeaderContent | null,
  setHeaderContent: vi.fn(),
}));

vi.mock('@/components/patient/PatientHeaderProvider', () => ({
  usePatientHeader: () => mockUsePatientHeader(),
}));

describe('PatientHeaderContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header content when provided', () => {
      render(<PatientHeaderContent />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should return null when headerContent is null', () => {
      mockUsePatientHeader.mockReturnValueOnce({
        headerContent: null as HeaderContent | null,
        setHeaderContent: vi.fn(),
      });
      
      const { container } = render(<PatientHeaderContent />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render title', () => {
      render(<PatientHeaderContent />);
      
      const title = screen.getByText('Test Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H1');
    });

    it('should render description when provided', () => {
      render(<PatientHeaderContent />);
      
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      mockUsePatientHeader.mockReturnValueOnce({
        headerContent: {
          title: 'Test Title',
          actions: <button>Action</button>,
        } as HeaderContent,
        setHeaderContent: vi.fn(),
      });
      
      render(<PatientHeaderContent />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    });

    it('should render actions when provided', () => {
      render(<PatientHeaderContent />);
      
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should not render actions section when actions not provided', () => {
      mockUsePatientHeader.mockReturnValueOnce({
        headerContent: {
          title: 'Test Title',
          description: 'Test Description',
        } as HeaderContent,
        setHeaderContent: vi.fn(),
      });
      
      render(<PatientHeaderContent />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.queryByText('Action Button')).not.toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have proper layout structure', () => {
      const { container } = render(<PatientHeaderContent />);
      
      const headerContent = container.querySelector('.flex.items-start.justify-between');
      expect(headerContent).toBeInTheDocument();
    });

    it('should display title and description in left section', () => {
      const { container } = render(<PatientHeaderContent />);
      
      const leftSection = container.querySelector('.flex.items-start.gap-4');
      expect(leftSection).toBeInTheDocument();
      expect(leftSection?.textContent).toContain('Test Title');
      expect(leftSection?.textContent).toContain('Test Description');
    });

    it('should display actions in right section', () => {
      const { container } = render(<PatientHeaderContent />);
      
      const actionsSection = container.querySelector('.flex.items-center.gap-2');
      expect(actionsSection).toBeInTheDocument();
      expect(actionsSection?.textContent).toContain('Action Button');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<PatientHeaderContent />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Title');
    });

    it('should have accessible description', () => {
      render(<PatientHeaderContent />);
      
      const description = screen.getByText('Test Description');
      expect(description).toBeInTheDocument();
    });
  });
});

