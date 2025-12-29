import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LayerControlPanel } from '@/components/patient/LayerControlPanel';

describe('LayerControlPanel', () => {
  const mockProps = {
    activeLayers: ['muscular', 'skeletal'],
    onToggleLayer: vi.fn(),
    className: 'test-class',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the layer control panel', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      expect(screen.getByTestId('layer-control-panel')).toBeInTheDocument();
      expect(screen.getByText('Anatomical Layers')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const panel = screen.getByTestId('layer-control-panel');
      expect(panel).toHaveClass('test-class');
    });
  });

  describe('Anatomical Systems Display', () => {
    it('should render all 10 anatomical systems', () => {
      render(<LayerControlPanel {...mockProps} />);
      
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

    it('should show correct color indicators for each system', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const colorIndicators = screen.getAllByTestId(/layer-color-indicator/);
      expect(colorIndicators).toHaveLength(10);
      
      // Check specific color indicators
      const skeletalIndicator = screen.getByTestId('layer-color-indicator-skeletal');
      expect(skeletalIndicator).toHaveStyle({ backgroundColor: '#8B4513' });
      
      const muscularIndicator = screen.getByTestId('layer-color-indicator-muscular');
      expect(muscularIndicator).toHaveStyle({ backgroundColor: '#FF6B6B' });
    });
  });

  describe('Layer Toggle Functionality', () => {
    it('should show active layers as checked', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const muscularToggle = screen.getByRole('checkbox', { name: /muscular system/i });
      const skeletalToggle = screen.getByRole('checkbox', { name: /skeletal system/i });
      
      expect(muscularToggle).toBeChecked();
      expect(skeletalToggle).toBeChecked();
    });

    it('should show inactive layers as unchecked', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const nervousToggle = screen.getByRole('checkbox', { name: /nervous system/i });
      const circulatoryToggle = screen.getByRole('checkbox', { name: /circulatory system/i });
      
      expect(nervousToggle).not.toBeChecked();
      expect(circulatoryToggle).not.toBeChecked();
    });

    it('should call onToggleLayer when layer is clicked', async () => {
      const user = userEvent.setup();
      render(<LayerControlPanel {...mockProps} />);
      
      const nervousToggle = screen.getByRole('checkbox', { name: /nervous system/i });
      await user.click(nervousToggle);
      
      expect(mockProps.onToggleLayer).toHaveBeenCalledWith('nervous');
    });

    it('should toggle layer state when clicked', async () => {
      const user = userEvent.setup();
      const onToggleLayer = vi.fn();
      render(<LayerControlPanel {...mockProps} onToggleLayer={onToggleLayer} />);
      
      const muscularToggle = screen.getByRole('checkbox', { name: /muscular system/i });
      await user.click(muscularToggle);
      
      expect(onToggleLayer).toHaveBeenCalledWith('muscular');
    });
  });

  describe('Visual Feedback', () => {
    it('should show active layers with visual indicators', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const activeLayerItems = screen.getAllByTestId(/layer-item-active/);
      expect(activeLayerItems).toHaveLength(2); // muscular and skeletal
    });

    it('should show layer descriptions on hover', async () => {
      const user = userEvent.setup();
      render(<LayerControlPanel {...mockProps} />);
      
      const skeletalItem = screen.getByTestId('layer-item-skeletal');
      await user.hover(skeletalItem);
      
      expect(screen.getByText('Bone structure and joints')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const panel = screen.getByTestId('layer-control-panel');
      expect(panel).toHaveAttribute('role', 'toolbar');
      expect(panel).toHaveAttribute('aria-label', 'Anatomical layer controls');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LayerControlPanel {...mockProps} />);
      
      const firstToggle = screen.getByRole('checkbox', { name: /skeletal system/i });
      firstToggle.focus();
      
      expect(document.activeElement).toBe(firstToggle);
      
      // Test tab navigation
      await user.tab();
      expect(document.activeElement).not.toBe(firstToggle);
    });

    it('should have proper focus management', () => {
      render(<LayerControlPanel {...mockProps} />);
      
      const toggles = screen.getAllByRole('checkbox');
      toggles.forEach(toggle => {
        expect(toggle).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile devices', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<LayerControlPanel {...mockProps} />);
      
      const panel = screen.getByTestId('layer-control-panel');
      expect(panel).toHaveClass('mobile-responsive');
    });

    it('should stack layers vertically on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<LayerControlPanel {...mockProps} />);
      
      const layerList = screen.getByTestId('layer-list');
      expect(layerList).toHaveClass('mobile-stack');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<LayerControlPanel {...mockProps} />);
      
      // Re-render with same props
      rerender(<LayerControlPanel {...mockProps} />);
      
      // Component should not have changed
      expect(screen.getByTestId('layer-control-panel')).toBeInTheDocument();
    });

    it('should handle large numbers of layers efficiently', () => {
      const manyLayers = Array.from({ length: 20 }, (_, i) => `layer-${i}`);
      render(
        <LayerControlPanel 
          activeLayers={manyLayers}
          onToggleLayer={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('layer-control-panel')).toBeInTheDocument();
    });
  });
});
