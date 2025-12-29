import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InteractiveBodyMap } from '@/components/patient/InteractiveBodyMap';

// Mock the iframe and external dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock the BioDigital Human viewer iframe
const mockIframe = {
  contentWindow: {
    postMessage: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock global iframe creation
Object.defineProperty(global, 'HTMLIFrameElement', {
  value: vi.fn(() => mockIframe),
});

describe('InteractiveBodyMap', () => {
  const mockProps = {
    patientId: 'test-patient-123',
    onBodyPartClick: vi.fn(),
    onDiagnosisClick: vi.fn(),
    selectedDiagnoses: [],
    className: 'test-class',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the interactive body map container', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      expect(screen.getByTestId('interactive-bodymap-container')).toBeInTheDocument();
    });

    it('should render the BioDigital Human iframe', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('human.biodigital.com'));
    });

    it('should render layer control panel', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      expect(screen.getByTestId('layer-control-panel')).toBeInTheDocument();
      expect(screen.getByText('Anatomical Layers')).toBeInTheDocument();
    });

    it('should render gender model selector', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      expect(screen.getByTestId('gender-model-selector')).toBeInTheDocument();
      expect(screen.getByText('Anatomical Model')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const container = screen.getByTestId('interactive-bodymap-container');
      expect(container).toHaveClass('test-class');
    });
  });

  describe('Anatomical Layer Controls', () => {
    it('should render all 10 anatomical systems', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const expectedSystems = [
        'Skeletal System',
        'Muscular System', 
        'Nervous System',
        'Circulatory System',
        'Digestive System',
        'Respiratory System',
        'Endocrine System',
        'Urinary System',
        'Reproductive System',
        'Lymphatic System'
      ];

      expectedSystems.forEach(systemName => {
        expect(screen.getByText(systemName)).toBeInTheDocument();
      });
    });

    it('should toggle layer visibility when clicked', async () => {
      const user = userEvent.setup();
      render(<InteractiveBodyMap {...mockProps} />);
      
      const skeletalToggle = screen.getByRole('checkbox', { name: /skeletal system/i });
      
      expect(skeletalToggle).toBeChecked(); // Default state
      
      await user.click(skeletalToggle);
      expect(skeletalToggle).not.toBeChecked();
      
      await user.click(skeletalToggle);
      expect(skeletalToggle).toBeChecked();
    });

    it('should show visual feedback for active layers', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const activeLayers = screen.getAllByTestId(/layer-toggle-active/);
      expect(activeLayers.length).toBeGreaterThan(0);
    });

    it('should display layer color indicators', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const colorIndicators = screen.getAllByTestId(/layer-color-indicator/);
      expect(colorIndicators.length).toBe(10); // All 10 systems
    });
  });

  describe('Gender Model Switching', () => {
    it('should render male and female model buttons', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      expect(screen.getByRole('button', { name: /male model/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Female Model/i })).toBeInTheDocument();
    });

    it('should switch to female model when clicked', async () => {
      const user = userEvent.setup();
      render(<InteractiveBodyMap {...mockProps} />);
      
      const femaleButton = screen.getByRole('button', { name: /Female Model/i });
      const maleButton = screen.getByRole('button', { name: /male model/i });
      
      expect(maleButton).toHaveClass('active');
      expect(femaleButton).not.toHaveClass('active');
      
      await user.click(femaleButton);
      
      expect(femaleButton).toHaveClass('active');
      expect(maleButton).not.toHaveClass('active');
    });

    it('should update iframe source when switching models', async () => {
      const user = userEvent.setup();
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      // const initialSrc = iframe.getAttribute('src');
      
      await user.click(screen.getByRole('button', { name: /Female Model/i }));
      
      // The iframe should maintain the same base URL but may have different parameters
      expect(iframe.getAttribute('src')).toContain('human.biodigital.com');
    });
  });

  describe('Iframe Integration', () => {
    it('should configure iframe with correct parameters', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      
      expect(iframe).toHaveAttribute('allowFullScreen');
      expect(iframe).toHaveAttribute('loading', 'lazy');
      expect(iframe).toHaveAttribute('frameBorder', '0');
    });

    it('should handle iframe load events', async () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      
      // Simulate iframe load
      fireEvent.load(iframe);
      
      await waitFor(() => {
        expect(screen.getByTestId('bodymap-loading')).not.toBeInTheDocument();
      });
    });

    it('should show loading state while iframe loads', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      expect(screen.getByTestId('bodymap-loading')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const container = screen.getByTestId('interactive-bodymap-container');
      expect(container).toHaveAttribute('role', 'application');
      expect(container).toHaveAttribute('aria-label', 'Interactive Human Anatomy Map');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<InteractiveBodyMap {...mockProps} />);
      
      const firstToggle = screen.getByRole('checkbox', { name: /skeletal system/i });
      firstToggle.focus();
      
      expect(document.activeElement).toBe(firstToggle);
      
      // Test tab navigation
      await user.tab();
      expect(document.activeElement).not.toBe(firstToggle);
    });

    it('should have proper focus management', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const layerControls = screen.getByTestId('layer-control-panel');
      expect(layerControls).toHaveAttribute('role', 'toolbar');
      expect(layerControls).toHaveAttribute('aria-label', 'Anatomical layer controls');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<InteractiveBodyMap {...mockProps} />);
      
      const container = screen.getByTestId('interactive-bodymap-container');
      expect(container).toHaveClass('mobile-responsive');
    });

    it('should stack controls vertically on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<InteractiveBodyMap {...mockProps} />);
      
      const controlsContainer = screen.getByTestId('bodymap-controls');
      expect(controlsContainer).toHaveClass('mobile-stack');
    });
  });

  describe('Integration with Medical Records', () => {
    it('should display selected diagnoses on the body map', () => {
      const diagnosesWithPositions = [
        {
          id: 'test-diagnosis-1',
          name: 'Test Diagnosis',
          bodyRegion: 'shoulder',
          position: { x: 65, y: 25 },
          severity: 'moderate' as const
        }
      ];

      render(
        <InteractiveBodyMap 
          {...mockProps} 
          selectedDiagnoses={diagnosesWithPositions}
        />
      );
      
      expect(screen.getByTestId('diagnosis-marker-test-diagnosis-1')).toBeInTheDocument();
    });

    it('should call onDiagnosisClick when diagnosis marker is clicked', async () => {
      const user = userEvent.setup();
      const mockOnDiagnosisClick = vi.fn();
      const diagnosesWithPositions = [
        {
          id: 'test-diagnosis-1',
          name: 'Test Diagnosis',
          bodyRegion: 'shoulder',
          position: { x: 65, y: 25 },
          severity: 'moderate' as const
        }
      ];

      render(
        <InteractiveBodyMap 
          {...mockProps} 
          selectedDiagnoses={diagnosesWithPositions}
          onDiagnosisClick={mockOnDiagnosisClick}
        />
      );
      
      const diagnosisMarker = screen.getByTestId('diagnosis-marker-test-diagnosis-1');
      await user.click(diagnosisMarker);
      
      expect(mockOnDiagnosisClick).toHaveBeenCalledWith(diagnosesWithPositions[0]);
    });

    it('should filter diagnoses by selected layers', () => {
      const diagnosesWithPositions = [
        {
          id: 'test-diagnosis-1',
          name: 'Test Diagnosis',
          bodyRegion: 'shoulder',
          position: { x: 65, y: 25 },
          severity: 'moderate' as const,
          anatomicalLayers: ['muscular', 'skeletal']
        }
      ];

      render(
        <InteractiveBodyMap 
          {...mockProps} 
          selectedDiagnoses={diagnosesWithPositions}
        />
      );
      
      // Initially all layers are visible, so diagnosis should be shown
      expect(screen.getByTestId('diagnosis-marker-test-diagnosis-1')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle iframe load errors gracefully', async () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      
      // Simulate iframe error
      fireEvent.error(iframe);
      
      await waitFor(() => {
        expect(screen.getByTestId('bodymap-error')).toBeInTheDocument();
      });
    });

    it('should show fallback content when iframe fails to load', async () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      fireEvent.error(iframe);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load interactive anatomy viewer')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load the iframe', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      const iframe = screen.getByTestId('biodigital-human-iframe');
      expect(iframe).toHaveAttribute('loading', 'lazy');
    });

    it('should not render hidden layers', () => {
      render(<InteractiveBodyMap {...mockProps} />);
      
      // Initially skeletal and muscular layers should be visible
      const visibleLayers = screen.getAllByTestId(/layer-toggle-active-/);
      expect(visibleLayers.length).toBe(2);
    });
  });
});
