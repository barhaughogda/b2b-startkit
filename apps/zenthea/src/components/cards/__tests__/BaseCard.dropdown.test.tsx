import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BaseCardComponent } from '../BaseCard';
import { CardEventHandlers } from '../types';

// Mock the handlers
const mockHandlers: CardEventHandlers = {
  onFocus: vi.fn(),
  onMinimize: vi.fn(),
  onMaximize: vi.fn(),
  onClose: vi.fn(),
  onPriorityChange: vi.fn(),
  onStatusChange: vi.fn(),
  onResize: vi.fn(),
  onMove: vi.fn(),
};

const regularSizeProps = {
  id: 'test-card',
  type: 'appointment' as const,
  patientName: 'Test Patient',
  patientId: '123',
  priority: 'medium' as const,
  status: 'new' as const,
  position: { x: 100, y: 100 },
  dimensions: { width: 400, height: 300 },
  zIndex: 1000,
  isMinimized: false,
  isMaximized: false,
  handlers: mockHandlers,
  activeTab: 'info' as const,
  onTabChange: vi.fn(),
};

describe('BaseCard Dropdown Visibility', () => {
  it('should show Priority dropdown above card when clicked', () => {
    // Given: A card in regular size
    const { container } = render(<BaseCardComponent {...regularSizeProps} />);
    
    // When: User clicks Priority dropdown
    const priorityButton = screen.getByText('Medium');
    fireEvent.click(priorityButton);
    
    // Then: Dropdown should be visible
    const dropdown = screen.queryByRole('menu');
    expect(dropdown).toBeInTheDocument();
    
    // And: Dropdown should be above card (not clipped)
    if (dropdown) {
      const dropdownRect = dropdown.getBoundingClientRect();
      const cardElement = container.firstChild as HTMLElement;
      const cardRect = cardElement?.getBoundingClientRect();
      expect(dropdownRect.top).toBeGreaterThan(cardRect?.bottom || 0);
    }
  });

  it('should show Status dropdown above card when clicked', () => {
    // Given: A card in regular size
    const { container } = render(<BaseCardComponent {...regularSizeProps} />);
    
    // When: User clicks Status dropdown
    const statusButton = screen.getByText('New');
    fireEvent.click(statusButton);
    
    // Then: Dropdown should be visible
    const dropdown = screen.queryByRole('menu');
    expect(dropdown).toBeInTheDocument();
    
    // And: Dropdown should be above card (not clipped)
    if (dropdown) {
      const dropdownRect = dropdown.getBoundingClientRect();
      const cardElement = container.firstChild as HTMLElement;
      const cardRect = cardElement?.getBoundingClientRect();
      expect(dropdownRect.top).toBeGreaterThan(cardRect?.bottom || 0);
    }
  });
});
