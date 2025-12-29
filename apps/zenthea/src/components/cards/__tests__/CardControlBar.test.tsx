/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CardControlBar } from '../CardControlBar';
import { useCardSystem } from '../CardSystemProvider';
import { CardType } from '../types';

// Mock useCardSystem hook
vi.mock('../CardSystemProvider', () => ({
  useCardSystem: vi.fn()
}));

const mockUseCardSystem = useCardSystem as ReturnType<typeof vi.fn>;

// Mock the card system provider
const mockCards = [
  {
    id: 'card-1',
    type: 'appointment' as CardType,
    title: 'Test Appointment',
    priority: 'high' as const,
    status: 'new' as const,
    patientId: 'patient-1',
    patientName: 'Test Patient',
    position: { x: 100, y: 100 },
    dimensions: { width: 500, height: 600 },
    isMinimized: false,
    isMaximized: false,
    zIndex: 1000,
    config: {
      type: 'appointment' as CardType,
      color: '#000',
      icon: () => null,
      size: { min: 300, max: 800, default: 500, current: 500 },
      layout: 'vertical' as const,
      interactions: {
        resizable: true,
        draggable: true,
        stackable: true,
        minimizable: true,
        maximizable: true
      },
      priority: {
        critical: { color: '#ff0000', icon: () => null },
        high: { color: '#ff8800', icon: () => null },
        medium: { color: '#0088ff', icon: () => null },
        low: { color: '#888888', icon: () => null }
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 0
  },
  {
    id: 'card-2',
    type: 'message' as CardType,
    title: 'Test Message',
    priority: 'medium' as const,
    status: 'new' as const,
    patientId: 'patient-2',
    patientName: 'Test Patient 2',
    position: { x: 200, y: 200 },
    dimensions: { width: 500, height: 600 },
    isMinimized: true,
    isMaximized: false,
    zIndex: 500,
    config: {
      type: 'message' as CardType,
      color: '#000',
      icon: () => null,
      size: { min: 300, max: 800, default: 500, current: 500 },
      layout: 'vertical' as const,
      interactions: {
        resizable: true,
        draggable: true,
        stackable: true,
        minimizable: true,
        maximizable: true
      },
      priority: {
        critical: { color: '#ff0000', icon: () => null },
        high: { color: '#ff8800', icon: () => null },
        medium: { color: '#0088ff', icon: () => null },
        low: { color: '#888888', icon: () => null }
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessCount: 0
  }
];

describe('CardControlBar', () => {
  const defaultMockReturn = {
    cards: [],
    activeCardId: undefined,
    handlers: {},
    openCard: vi.fn(),
    closeCard: vi.fn(),
    minimizeCard: vi.fn(),
    maximizeCard: vi.fn(),
    updateCardStatus: vi.fn(),
    updateCardPriority: vi.fn(),
    assignCard: vi.fn(),
    getCardById: vi.fn(),
    tileAll: vi.fn(),
    minimizeAll: vi.fn(),
    restoreAll: vi.fn(),
    closeAll: vi.fn(),
    stackByPriority: vi.fn(),
    stackByType: vi.fn(),
    stackByProvider: vi.fn(),
    stackByPatient: vi.fn(),
    stackByDueDate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCardSystem.mockReturnValue(defaultMockReturn);
  });

  it('should not render when no cards are present', () => {
    render(<CardControlBar />);
    
    const controlBar = screen.queryByRole('button', { name: /organize all cards/i });
    expect(controlBar).not.toBeInTheDocument();
  });

  it('should display card count badge', () => {
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards
    });

    render(<CardControlBar />);

    // Check for card count badge
    expect(screen.getByText(/1 open/i)).toBeInTheDocument();
    expect(screen.getByText(/, 1 minimized/i)).toBeInTheDocument();
  });

  it('should call tileAll when tile button is clicked', async () => {
    const mockTileAll = vi.fn();
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards.filter(c => !c.isMinimized),
      tileAll: mockTileAll
    });

    render(<CardControlBar />);

    const tileButton = screen.getByTitle(/organize all cards in a grid/i);
    fireEvent.click(tileButton);

    await waitFor(() => {
      expect(mockTileAll).toHaveBeenCalled();
    });
  });

  it('should call minimizeAll when minimize button is clicked', async () => {
    const mockMinimizeAll = vi.fn();
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards.filter(c => !c.isMinimized),
      minimizeAll: mockMinimizeAll
    });

    render(<CardControlBar />);

    const minimizeButton = screen.getByTitle(/minimize all cards/i);
    fireEvent.click(minimizeButton);

    await waitFor(() => {
      expect(mockMinimizeAll).toHaveBeenCalled();
    });
  });

  it('should call restoreAll when restore button is clicked', async () => {
    const mockRestoreAll = vi.fn();
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards,
      restoreAll: mockRestoreAll
    });

    render(<CardControlBar />);

    const restoreButton = screen.getByTitle(/restore all minimized cards/i);
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(mockRestoreAll).toHaveBeenCalled();
    });
  });

  it('should call closeAll when close button is clicked', async () => {
    const mockCloseAll = vi.fn();
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards,
      closeAll: mockCloseAll
    });

    render(<CardControlBar />);

    const closeButton = screen.getByTitle(/close all cards/i);
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockCloseAll).toHaveBeenCalled();
    });
  });

  it('should show stack management dropdown with group options when clicked', async () => {
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards.filter(c => !c.isMinimized)
    });

    render(<CardControlBar />);

    const stackManagerButton = screen.getByTitle(/manage stacks/i);
    fireEvent.click(stackManagerButton);

    await waitFor(() => {
      expect(screen.getByText(/By Priority/i)).toBeInTheDocument();
      expect(screen.getByText(/By Type/i)).toBeInTheDocument();
      expect(screen.getByText(/By Provider/i)).toBeInTheDocument();
      expect(screen.getByText(/By Patient/i)).toBeInTheDocument();
      expect(screen.getByText(/By Due Date/i)).toBeInTheDocument();
    });
  });

  it('should disable buttons when no open cards', () => {
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards.filter(c => c.isMinimized)
    });

    render(<CardControlBar />);

    const tileButton = screen.getByTitle(/organize all cards in a grid/i);
    expect(tileButton).toBeDisabled();
  });

  it('should disable restore button when no minimized cards', () => {
    mockUseCardSystem.mockReturnValue({
      ...defaultMockReturn,
      cards: mockCards.filter(c => !c.isMinimized)
    });

    render(<CardControlBar />);

    const restoreButton = screen.getByTitle(/restore all minimized cards/i);
    expect(restoreButton).toBeDisabled();
  });
});
