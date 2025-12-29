import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GenderModelSelector } from '@/components/patient/GenderModelSelector';

describe('GenderModelSelector', () => {
  const mockProps = {
    currentModel: 'male' as const,
    onModelChange: vi.fn(),
    className: 'test-class',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the gender model selector', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      expect(screen.getByTestId('gender-model-selector')).toBeInTheDocument();
      expect(screen.getByText('Anatomical Model')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      const selector = screen.getByTestId('gender-model-selector');
      expect(selector).toHaveClass('test-class');
    });
  });

  describe('Model Options', () => {
    it('should render male and female model buttons', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      expect(screen.getByRole('button', { name: /male model/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /female model/i })).toBeInTheDocument();
    });

    it('should show current model as active', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      
      expect(maleButton).toHaveClass('active');
      expect(femaleButton).not.toHaveClass('active');
    });

    it('should show female model as active when selected', () => {
      render(
        <GenderModelSelector 
          {...mockProps} 
          currentModel="female" 
        />
      );
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      
      expect(femaleButton).toHaveClass('active');
      expect(maleButton).not.toHaveClass('active');
    });
  });

  describe('Model Switching', () => {
    it('should call onModelChange when female model is clicked', async () => {
      const user = userEvent.setup();
      render(<GenderModelSelector {...mockProps} />);
      
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      await user.click(femaleButton);
      
      expect(mockProps.onModelChange).toHaveBeenCalledWith('female');
    });

    it('should call onModelChange when male model is clicked', async () => {
      const user = userEvent.setup();
      render(
        <GenderModelSelector 
          {...mockProps} 
          currentModel="female" 
        />
      );
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      await user.click(maleButton);
      
      expect(mockProps.onModelChange).toHaveBeenCalledWith('male');
    });

    it('should not call onModelChange when current model is clicked', async () => {
      const user = userEvent.setup();
      render(<GenderModelSelector {...mockProps} />);
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      await user.click(maleButton);
      
      expect(mockProps.onModelChange).not.toHaveBeenCalled();
    });
  });

  describe('Visual Design', () => {
    it('should display model icons', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      expect(screen.getByTestId('male-model-icon')).toBeInTheDocument();
      expect(screen.getByTestId('female-model-icon')).toBeInTheDocument();
    });

    it('should show model descriptions', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      expect(screen.getByText('Male anatomical model')).toBeInTheDocument();
      expect(screen.getByText('Female anatomical model')).toBeInTheDocument();
    });

    it('should have proper button styling', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      
      expect(maleButton).toHaveClass('model-button');
      expect(femaleButton).toHaveClass('model-button');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      const selector = screen.getByTestId('gender-model-selector');
      expect(selector).toHaveAttribute('role', 'radiogroup');
      expect(selector).toHaveAttribute('aria-label', 'Anatomical model selection');
    });

    it('should have proper button roles', () => {
      render(<GenderModelSelector {...mockProps} />);
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      
      expect(maleButton).toHaveAttribute('aria-pressed', 'true');
      expect(femaleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<GenderModelSelector {...mockProps} />);
      
      const maleButton = screen.getByRole('button', { name: /male model/i });
      maleButton.focus();
      
      expect(document.activeElement).toBe(maleButton);
      
      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      expect(document.activeElement).toBe(femaleButton);
    });

    it('should support Enter and Space key activation', async () => {
      const user = userEvent.setup();
      render(<GenderModelSelector {...mockProps} />);
      
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      femaleButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockProps.onModelChange).toHaveBeenCalledWith('female');
      
      await user.keyboard(' ');
      expect(mockProps.onModelChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile devices', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<GenderModelSelector {...mockProps} />);
      
      const selector = screen.getByTestId('gender-model-selector');
      expect(selector).toHaveClass('mobile-responsive');
    });

    it('should stack buttons vertically on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<GenderModelSelector {...mockProps} />);
      
      const modelOptions = screen.getByTestId('model-options');
      expect(modelOptions).toHaveClass('mobile-stack');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<GenderModelSelector {...mockProps} />);
      
      // Re-render with same props
      rerender(<GenderModelSelector {...mockProps} />);
      
      // Component should not have changed
      expect(screen.getByTestId('gender-model-selector')).toBeInTheDocument();
    });

    it('should handle rapid model switching', async () => {
      const user = userEvent.setup();
      const onModelChange = vi.fn();
      render(
        <GenderModelSelector 
          {...mockProps} 
          onModelChange={onModelChange}
        />
      );
      
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      const maleButton = screen.getByRole('button', { name: /male model/i });
      
      // Rapid clicking
      await user.click(femaleButton);
      await user.click(maleButton);
      await user.click(femaleButton);
      
      expect(onModelChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model values gracefully', () => {
      // @ts-expect-error Testing invalid prop
      render(<GenderModelSelector {...mockProps} currentModel="invalid" />);
      
      // Should default to male model
      const maleButton = screen.getByRole('button', { name: /male model/i });
      expect(maleButton).toHaveClass('active');
    });

    it('should handle missing onModelChange callback', async () => {
      const user = userEvent.setup();
      const mockOnModelChange = vi.fn();
      render(
        <GenderModelSelector 
          currentModel="male"
          onModelChange={mockOnModelChange}
        />
      );
      
      const femaleButton = screen.getByRole('button', { name: /female model/i });
      
      // Should not throw error
      await user.click(femaleButton);
      expect(screen.getByTestId('gender-model-selector')).toBeInTheDocument();
    });
  });
});
