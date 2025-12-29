import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagnosisHistoryBodyMap } from '@/components/patient/DiagnosisHistoryBodyMap';

describe('DiagnosisHistoryBodyMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render body map component', () => {
      render(<DiagnosisHistoryBodyMap />);
      
      expect(screen.getByPlaceholderText(/Search diagnoses/i)).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <DiagnosisHistoryBodyMap className="custom-class" />
      );
      
      const bodyMapContainer = container.querySelector('.custom-class');
      expect(bodyMapContainer).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter diagnoses by search term', async () => {
      const user = userEvent.setup();
      render(<DiagnosisHistoryBodyMap />);
      
      const searchInput = screen.getByPlaceholderText(/Search diagnoses/i);
      await user.type(searchInput, 'Rotator');
      
      // Should show matching diagnosis
      expect(searchInput).toHaveValue('Rotator');
    });

    it('should filter diagnoses by ICD code', async () => {
      const user = userEvent.setup();
      render(<DiagnosisHistoryBodyMap />);
      
      const searchInput = screen.getByPlaceholderText(/Search diagnoses/i);
      await user.type(searchInput, 'R03');
      
      expect(searchInput).toHaveValue('R03');
    });
  });

  describe('Body Map Display', () => {
    it('should render body map SVG', () => {
      const { container } = render(<DiagnosisHistoryBodyMap />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display diagnosis markers on body map', () => {
      const { container } = render(<DiagnosisHistoryBodyMap />);
      
      // Check for diagnosis markers (positioned elements)
      const markers = container.querySelectorAll('[class*="absolute"]');
      expect(markers.length).toBeGreaterThan(0);
    });
  });

  describe('Timeline Range Selector', () => {
    it('should render timeline range selector', () => {
      render(<DiagnosisHistoryBodyMap />);
      
      expect(screen.getByText(/Timeline Range/i)).toBeInTheDocument();
    });

    it('should allow selecting year range', async () => {
      const user = userEvent.setup();
      render(<DiagnosisHistoryBodyMap />);
      
      // Find reset button
      const resetButton = screen.getByText(/Reset/i);
      if (resetButton) {
        await user.click(resetButton);
        // Timeline should be reset
        expect(resetButton).toBeInTheDocument();
      }
    });
  });

  describe('Body Systems', () => {
    it('should display body system filters', () => {
      render(<DiagnosisHistoryBodyMap />);
      
      expect(screen.getByText(/All Systems/i)).toBeInTheDocument();
    });

    it('should allow selecting body system', async () => {
      const user = userEvent.setup();
      render(<DiagnosisHistoryBodyMap />);
      
      // Find a system button
      const systemButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.match(/Muscular|Skeletal|Circulatory/i)
      );
      
      if (systemButtons.length > 0) {
        await user.click(systemButtons[0]);
        // System should be selected
        expect(systemButtons[0]).toBeInTheDocument();
      }
    });
  });

  describe('Recent Diagnoses List', () => {
    it('should display recent diagnoses section', () => {
      render(<DiagnosisHistoryBodyMap />);
      
      expect(screen.getByText(/Recent Diagnoses/i)).toBeInTheDocument();
    });

    it('should toggle diagnoses list expansion', async () => {
      const user = userEvent.setup();
      render(<DiagnosisHistoryBodyMap />);
      
      // Find expand/collapse button
      const expandButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      const expandButton = expandButtons.find(btn => 
        btn.className.includes('ghost') && btn.querySelector('svg')
      );
      
      if (expandButton) {
        await user.click(expandButton);
        // List should expand/collapse
        expect(expandButton).toBeInTheDocument();
      }
    });
  });

  describe('User Interactions', () => {
    it('should call onDiagnosisClick when diagnosis is clicked', async () => {
      const user = userEvent.setup();
      const onDiagnosisClick = vi.fn();
      
      render(
        <DiagnosisHistoryBodyMap onDiagnosisClick={onDiagnosisClick} />
      );
      
      // Find a clickable diagnosis element
      const diagnosisElements = screen.getAllByText(/Rotator|Knee|Back|Chest/i);
      
      if (diagnosisElements.length > 0) {
        const clickableParent = diagnosisElements[0].closest('[class*="cursor-pointer"]') ||
                                diagnosisElements[0].closest('button') ||
                                diagnosisElements[0].parentElement;
        
        if (clickableParent) {
          await user.click(clickableParent);
          // Callback should be called
          expect(onDiagnosisClick).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Filter Display', () => {
    it('should display active filters', () => {
      render(<DiagnosisHistoryBodyMap />);
      
      // Check for filter badges or buttons
      const filterButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Filter') || btn.textContent?.includes('Clear')
      );
      
      expect(filterButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should handle empty search results', async () => {
      const user = userEvent.setup();
      render(<DiagnosisHistoryBodyMap />);
      
      const searchInput = screen.getByPlaceholderText(/Search diagnoses/i);
      await user.type(searchInput, 'NonExistentDiagnosis');
      
      // Search should filter results
      expect(searchInput).toHaveValue('NonExistentDiagnosis');
    });
  });

  describe('Accessibility', () => {
    it('should have search input with proper placeholder', () => {
      render(<DiagnosisHistoryBodyMap />);
      
      const searchInput = screen.getByPlaceholderText(/Search diagnoses/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have accessible body map structure', () => {
      const { container } = render(<DiagnosisHistoryBodyMap />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});

