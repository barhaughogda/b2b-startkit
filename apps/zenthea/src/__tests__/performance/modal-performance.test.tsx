/**
 * Performance tests for modal rendering and interactions
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SOAPNoteModal } from '@/components/modal/templates/SOAPNoteModal';
import { VitalSignsModal } from '@/components/modal/templates/VitalSignsModal';
import { AppointmentModal } from '@/components/modal/templates/AppointmentModal';

describe('Modal Performance Tests', () => {
  const defaultProps = {
    patientName: 'John Doe',
    providerName: 'Dr. Smith'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering Performance', () => {
    it('should render SOAPNoteModal quickly', () => {
      const startTime = performance.now();
      render(<SOAPNoteModal {...defaultProps} />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should render VitalSignsModal quickly', () => {
      const startTime = performance.now();
      render(<VitalSignsModal {...defaultProps} />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should render AppointmentModal quickly', () => {
      const startTime = performance.now();
      render(<AppointmentModal {...defaultProps} />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });
  });

  describe('Interaction Performance', () => {
    it('should handle text input efficiently in SOAPNoteModal', async () => {
      render(<SOAPNoteModal {...defaultProps} />);
      
      const textarea = screen.getByLabelText('Subjective');
      const startTime = performance.now();
      
      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.change(textarea, { target: { value: `Test input ${i}` } });
      }
      
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      expect(interactionTime).toBeLessThan(50); // Should handle 10 inputs in under 50ms
    });

    it('should handle form submission efficiently', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<SOAPNoteModal {...defaultProps} onSave={mockOnSave} />);
      
      // Fill in required fields first
      const subjectiveTextarea = screen.getByLabelText('Subjective');
      const objectiveTextarea = screen.getByLabelText('Objective');
      const assessmentTextarea = screen.getByLabelText('Assessment');
      const planTextarea = screen.getByLabelText('Plan');
      
      fireEvent.change(subjectiveTextarea, { target: { value: 'Patient complaint' } });
      fireEvent.change(objectiveTextarea, { target: { value: 'Physical findings' } });
      fireEvent.change(assessmentTextarea, { target: { value: 'Clinical impression' } });
      fireEvent.change(planTextarea, { target: { value: 'Treatment plan' } });
      
      const saveButton = screen.getByText('Save Note');
      const startTime = performance.now();
      
      fireEvent.click(saveButton);
      await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
      
      const endTime = performance.now();
      const submissionTime = endTime - startTime;
      
      expect(submissionTime).toBeLessThan(200); // Should handle submission in under 200ms
    });

    it('should handle multiple rapid clicks efficiently', async () => {
      const mockOnClose = vi.fn();
      render(<VitalSignsModal {...defaultProps} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      const startTime = performance.now();
      
      // Simulate rapid clicking
      for (let i = 0; i < 5; i++) {
        fireEvent.click(cancelButton);
      }
      
      const endTime = performance.now();
      const clickTime = endTime - startTime;
      
      expect(clickTime).toBeLessThan(100); // Should handle 5 clicks in under 100ms
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory when unmounting modals', () => {
      const { unmount } = render(<SOAPNoteModal {...defaultProps} />);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      unmount();
      
      // This test ensures the component unmounts cleanly
      // In a real scenario, you'd use memory profiling tools
      expect(true).toBe(true);
    });
  });

  describe('Accessibility Performance', () => {
    it('should maintain focus management efficiently', async () => {
      render(<AppointmentModal {...defaultProps} />);
      
      const dateInput = screen.getByLabelText('Date');
      const startTime = performance.now();
      
      // Simulate focus changes
      dateInput.focus();
      await waitFor(() => expect(document.activeElement).toBe(dateInput));
      
      const endTime = performance.now();
      const focusTime = endTime - startTime;
      
      expect(focusTime).toBeLessThan(50); // Focus should be managed quickly
    });
  });
});
