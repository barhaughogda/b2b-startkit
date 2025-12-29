import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MainCard } from '../components/MainCard';
import { CardEventHandlers } from '../types';

// Mock handlers
const mockHandlers: CardEventHandlers = {
  onResize: vi.fn(),
  onDrag: vi.fn(),
  onMinimize: vi.fn(),
  onExpand: vi.fn(),
  onMaximize: vi.fn(),
  onClose: vi.fn(),
  onFocus: vi.fn(),
  onStatusChange: vi.fn(),
  onPriorityChange: vi.fn(),
  onAssignmentChange: vi.fn(),
  onCommentAdd: vi.fn(),
  onAIAssignment: vi.fn()
};

// Mock drag handler
const mockDragHandler = {
  handleMouseDown: vi.fn((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  })
};

// Mock resize handler
const mockResizeHandler = {
  handleResizeStart: vi.fn((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
  })
};

describe('Card Drag and Resize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    id: 'test-card-1',
    type: 'message' as const,
    title: 'Test Card',
    priority: 'high' as const,
    status: 'new' as const,
    assignedTo: undefined,
    assignmentType: undefined,
    patientId: 'patient-1',
    patientName: 'John Doe',
    patientDateOfBirth: '1990-01-01',
    dueDate: '2024-01-15',
    isMinimized: false,
    isMaximized: false,
    dimensions: { width: 600, height: 700 },
    position: { x: 100, y: 100 },
    zIndex: 1000,
    activeTab: 0,
    onTabChange: vi.fn(),
    tabNames: [],
    handlers: mockHandlers,
    className: '',
    children: <div>Test Content</div>,
    handleMouseDown: mockDragHandler.handleMouseDown,
    handleResizeStart: mockResizeHandler.handleResizeStart,
    handleMinimize: vi.fn(),
    handleMaximize: vi.fn(),
    handleClose: vi.fn(),
    handleDoubleClick: vi.fn(),
    handleCardClick: vi.fn(),
    handleScroll: vi.fn(),
    handleWheel: vi.fn(),
    priorityRef: { current: null },
    statusRef: { current: null },
    isPriorityDropdownOpen: false,
    isStatusDropdownOpen: false,
    getPriorityDropdownPosition: vi.fn(() => ({ top: 0, left: 0 })),
    getStatusDropdownPosition: vi.fn(() => ({ top: 0, left: 0 })),
    togglePriorityDropdown: vi.fn(),
    toggleStatusDropdown: vi.fn(),
    handlePriorityChange: vi.fn(),
    handleStatusChange: vi.fn()
  };

  describe('Card Positioning', () => {
    it('should apply position styles with px units', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      
      expect(card).toBeTruthy();
      const inlineStyle = card.getAttribute('style');
      expect(inlineStyle).toContain('left: 100px');
      expect(inlineStyle).toContain('top: 100px');
      expect(inlineStyle).toContain('position: fixed');
    });

    it('should update position when position prop changes', () => {
      const { container, rerender } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      
      let inlineStyle = card.getAttribute('style');
      expect(inlineStyle).toContain('left: 100px');
      
      rerender(<MainCard {...defaultProps} position={{ x: 200, y: 300 }} />);
      
      inlineStyle = card.getAttribute('style');
      expect(inlineStyle).toContain('left: 200px');
      expect(inlineStyle).toContain('top: 300px');
    });

    it('should have position: fixed', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      const inlineStyle = card.getAttribute('style');
      
      expect(inlineStyle).toContain('position: fixed');
    });
  });

  describe('Card Dimensions', () => {
    it('should apply dimension styles with px units', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      
      const inlineStyle = card.getAttribute('style');
      expect(inlineStyle).toContain('width: 600px');
      expect(inlineStyle).toContain('height: 700px');
    });

    it('should update dimensions when dimensions prop changes', () => {
      const { container, rerender } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      
      let inlineStyle = card.getAttribute('style');
      expect(inlineStyle).toContain('width: 600px');
      
      rerender(<MainCard {...defaultProps} dimensions={{ width: 800, height: 900 }} />);
      
      inlineStyle = card.getAttribute('style');
      expect(inlineStyle).toContain('width: 800px');
      expect(inlineStyle).toContain('height: 900px');
    });
  });

  describe('Card Dragging', () => {
    it('should call handleMouseDown when card is clicked', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      
      fireEvent.mouseDown(card);
      
      expect(mockDragHandler.handleMouseDown).toHaveBeenCalled();
    });

    it('should have cursor-move class for draggable indication', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      
      expect(card.classList.contains('cursor-move')).toBe(true);
    });
  });

  describe('Card Resizing', () => {
    it('should render resize handles', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const resizeHandles = container.querySelectorAll('[class*="resize"]');
      
      // Should have resize handles
      expect(resizeHandles.length).toBeGreaterThan(0);
    });

    it('should call handleResizeStart when resize handle is clicked', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const resizeHandle = container.querySelector('[class*="cursor-e-resize"]') as HTMLElement;
      
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle);
        expect(mockResizeHandler.handleResizeStart).toHaveBeenCalled();
      }
    });
  });

  describe('CSS Style Application', () => {
    it('should apply all required styles correctly', () => {
      const { container } = render(<MainCard {...defaultProps} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      const inlineStyle = card.getAttribute('style');
      
      // Check position
      expect(inlineStyle).toContain('position: fixed');
      
      // Check dimensions with px units
      expect(inlineStyle).toMatch(/width:\s*\d+px/);
      expect(inlineStyle).toMatch(/height:\s*\d+px/);
      expect(inlineStyle).toMatch(/left:\s*\d+px/);
      expect(inlineStyle).toMatch(/top:\s*\d+px/);
      
      // Check z-index (React converts zIndex to z-index in inline styles)
      expect(inlineStyle).toContain('z-index: 1000');
    });

    it('should not apply position styles when maximized', () => {
      const { container } = render(<MainCard {...defaultProps} isMaximized={true} />);
      const card = container.querySelector('.card-system-card') as HTMLElement;
      const inlineStyle = card.getAttribute('style');
      
      // When maximized, style should be empty (no inline styles)
      expect(inlineStyle).toBeNull();
    });
  });
});

