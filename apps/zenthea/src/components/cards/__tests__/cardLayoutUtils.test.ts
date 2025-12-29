import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateGridLayout,
  calculateCardPositions,
  groupCardsBy,
  calculateStackPositions
} from '../utils/cardLayoutUtils';
import { BaseCardProps } from '../types';

// Mock window dimensions
const mockWindow = {
  innerWidth: 1920,
  innerHeight: 1080
};

describe('cardLayoutUtils', () => {
  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockWindow.innerWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: mockWindow.innerHeight
    });
  });

  describe('calculateGridLayout', () => {
    it('should return zero dimensions for zero cards', () => {
      const result = calculateGridLayout(0, 1920, 1080);
      expect(result.cols).toBe(0);
      expect(result.rows).toBe(0);
    });

    it('should return 1x1 grid for single card', () => {
      const result = calculateGridLayout(1, 1920, 1080);
      expect(result.cols).toBe(1);
      expect(result.rows).toBe(1);
    });

    it('should calculate optimal grid for 4 cards', () => {
      const result = calculateGridLayout(4, 1920, 1080);
      expect(result.cols).toBeGreaterThan(0);
      expect(result.rows).toBeGreaterThan(0);
      expect(result.cols * result.rows).toBeGreaterThanOrEqual(4);
    });

    it('should calculate optimal grid for 9 cards', () => {
      const result = calculateGridLayout(9, 1920, 1080);
      expect(result.cols).toBeGreaterThan(0);
      expect(result.rows).toBeGreaterThan(0);
      expect(result.cols * result.rows).toBeGreaterThanOrEqual(9);
    });

    it('should respect viewport boundaries', () => {
      const result = calculateGridLayout(20, 800, 600);
      expect(result.cardWidth).toBeLessThanOrEqual(800);
      expect(result.cardHeight).toBeLessThanOrEqual(600);
    });

    it('should prevent division by zero with very small viewport', () => {
      // Test with viewport so small that availableWidth/Height becomes negative
      // This should not cause division by zero errors
      const result = calculateGridLayout(5, 100, 100, 500, 600, 20, 20);
      
      // Should always return valid dimensions (cols and rows >= 1)
      expect(result.cols).toBeGreaterThanOrEqual(1);
      expect(result.rows).toBeGreaterThanOrEqual(1);
      // Card dimensions should be positive (minimum enforced in code)
      expect(result.cardWidth).toBeGreaterThan(0);
      expect(result.cardHeight).toBeGreaterThan(0);
      
      // Should not throw division by zero error even with extremely small viewport
      expect(() => {
        const testResult = calculateGridLayout(10, 50, 50, 500, 600, 20, 20);
        expect(testResult.cols).toBeGreaterThanOrEqual(1);
        expect(testResult.rows).toBeGreaterThanOrEqual(1);
        expect(testResult.cardWidth).toBeGreaterThan(0);
        expect(testResult.cardHeight).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('calculateCardPositions', () => {
    const createMockCard = (id: string, isMinimized = false): BaseCardProps => ({
      id,
      type: 'appointment',
      title: `Card ${id}`,
      priority: 'medium',
      status: 'new',
      patientId: 'patient-1',
      patientName: 'Test Patient',
      position: { x: 0, y: 0 },
      dimensions: { width: 500, height: 600 },
      isMinimized,
      isMaximized: false,
      zIndex: 1000,
      config: {
        type: 'appointment',
        color: '#000',
        icon: () => null,
        size: { min: 300, max: 800, default: 500, current: 500 },
        layout: 'vertical',
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
    });

    it('should return empty map for no cards', () => {
      const positions = calculateCardPositions([], 2, 2, 500, 600);
      expect(positions.size).toBe(0);
    });

    it('should calculate positions for single card', () => {
      const cards = [createMockCard('1')];
      const positions = calculateCardPositions(cards, 1, 1, 500, 600);
      expect(positions.size).toBe(1);
      expect(positions.get('1')).toBeDefined();
    });

    it('should calculate positions for multiple cards', () => {
      const cards = [
        createMockCard('1'),
        createMockCard('2'),
        createMockCard('3'),
        createMockCard('4')
      ];
      const positions = calculateCardPositions(cards, 2, 2, 500, 600);
      expect(positions.size).toBe(4);
      cards.forEach(card => {
        expect(positions.get(card.id)).toBeDefined();
      });
    });

    it('should exclude minimized cards', () => {
      const cards = [
        createMockCard('1'),
        createMockCard('2', true), // minimized
        createMockCard('3')
      ];
      const positions = calculateCardPositions(cards, 2, 1, 500, 600);
      expect(positions.size).toBe(2);
      expect(positions.get('1')).toBeDefined();
      expect(positions.get('2')).toBeUndefined();
      expect(positions.get('3')).toBeDefined();
    });

    it('should position cards in grid with spacing', () => {
      const cards = [
        createMockCard('1'),
        createMockCard('2')
      ];
      const positions = calculateCardPositions(cards, 2, 1, 500, 600, 20, 20);
      const pos1 = positions.get('1');
      const pos2 = positions.get('2');
      
      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();
      // Cards should be spaced horizontally
      expect(pos2!.x).toBeGreaterThan(pos1!.x);
    });
  });

  describe('groupCardsBy', () => {
    const createMockCard = (id: string, props: Partial<BaseCardProps> = {}): BaseCardProps => ({
      id,
      type: props.type || 'appointment',
      title: `Card ${id}`,
      priority: props.priority || 'medium',
      status: 'new',
      patientId: props.patientId || 'patient-1',
      patientName: 'Test Patient',
      assignedTo: props.assignedTo,
      dueDate: props.dueDate,
      position: { x: 0, y: 0 },
      dimensions: { width: 500, height: 600 },
      isMinimized: false,
      isMaximized: false,
      zIndex: 1000,
      config: {
        type: props.type || 'appointment',
        color: '#000',
        icon: () => null,
        size: { min: 300, max: 800, default: 500, current: 500 },
        layout: 'vertical',
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
    });

    it('should group cards by priority', () => {
      const cards = [
        createMockCard('1', { priority: 'high' }),
        createMockCard('2', { priority: 'high' }),
        createMockCard('3', { priority: 'low' })
      ];
      const groups = groupCardsBy(cards, 'priority');
      expect(groups.get('high')?.length).toBe(2);
      expect(groups.get('low')?.length).toBe(1);
    });

    it('should group cards by type', () => {
      const cards = [
        createMockCard('1', { type: 'appointment' }),
        createMockCard('2', { type: 'appointment' }),
        createMockCard('3', { type: 'message' })
      ];
      const groups = groupCardsBy(cards, 'type');
      expect(groups.get('appointment')?.length).toBe(2);
      expect(groups.get('message')?.length).toBe(1);
    });

    it('should group cards by provider', () => {
      const cards = [
        createMockCard('1', { assignedTo: 'provider-1' }),
        createMockCard('2', { assignedTo: 'provider-1' }),
        createMockCard('3', { assignedTo: 'provider-2' })
      ];
      const groups = groupCardsBy(cards, 'provider');
      expect(groups.get('provider-1')?.length).toBe(2);
      expect(groups.get('provider-2')?.length).toBe(1);
    });

    it('should group unassigned cards', () => {
      const cards = [
        createMockCard('1', { assignedTo: undefined }),
        createMockCard('2', { assignedTo: 'provider-1' })
      ];
      const groups = groupCardsBy(cards, 'provider');
      expect(groups.get('unassigned')?.length).toBe(1);
      expect(groups.get('provider-1')?.length).toBe(1);
    });

    it('should group cards by patient', () => {
      const cards = [
        createMockCard('1', { patientId: 'patient-1' }),
        createMockCard('2', { patientId: 'patient-1' }),
        createMockCard('3', { patientId: 'patient-2' })
      ];
      const groups = groupCardsBy(cards, 'patient');
      expect(groups.get('patient-1')?.length).toBe(2);
      expect(groups.get('patient-2')?.length).toBe(1);
    });

    it('should group cards by due date', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const cards = [
        createMockCard('1', { dueDate: today.toISOString() }),
        createMockCard('2', { dueDate: tomorrow.toISOString() }),
        createMockCard('3', { dueDate: nextWeek.toISOString() })
      ];
      const groups = groupCardsBy(cards, 'dueDate');
      expect(groups.get('today')?.length).toBeGreaterThanOrEqual(1);
      expect(groups.get('this-week')?.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle cards without due date', () => {
      const cards = [
        createMockCard('1', { dueDate: undefined }),
        createMockCard('2', { dueDate: new Date().toISOString() })
      ];
      const groups = groupCardsBy(cards, 'dueDate');
      expect(groups.get('no-due-date')?.length).toBe(1);
    });
  });

  describe('calculateStackPositions', () => {
    const createMockCard = (id: string, props: Partial<BaseCardProps> = {}): BaseCardProps => ({
      id,
      type: props.type || 'appointment',
      title: `Card ${id}`,
      priority: props.priority || 'medium',
      status: 'new',
      patientId: props.patientId || 'patient-1',
      patientName: 'Test Patient',
      assignedTo: props.assignedTo,
      dueDate: props.dueDate,
      position: { x: 0, y: 0 },
      dimensions: { width: 500, height: 600 },
      isMinimized: false,
      isMaximized: false,
      zIndex: 1000,
      config: {
        type: props.type || 'appointment',
        color: '#000',
        icon: () => null,
        size: { min: 300, max: 800, default: 500, current: 500 },
        layout: 'vertical',
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
    });

    it('should return empty map for no cards', () => {
      const positions = calculateStackPositions([], 'priority');
      expect(positions.size).toBe(0);
    });

    it('should calculate stack positions for cards grouped by priority', () => {
      const cards = [
        createMockCard('1', { priority: 'high' }),
        createMockCard('2', { priority: 'high' }),
        createMockCard('3', { priority: 'low' })
      ];
      const positions = calculateStackPositions(cards, 'priority');
      expect(positions.size).toBe(3);
      cards.forEach(card => {
        expect(positions.get(card.id)).toBeDefined();
      });
    });

    it('should position cards with offset in stacks', () => {
      const cards = [
        createMockCard('1', { priority: 'high' }),
        createMockCard('2', { priority: 'high' })
      ];
      const positions = calculateStackPositions(cards, 'priority', 30, 15);
      const pos1 = positions.get('1');
      const pos2 = positions.get('2');
      
      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();
      // Cards should be offset
      expect(pos2!.x).toBeGreaterThan(pos1!.x);
      expect(pos2!.y).toBeGreaterThan(pos1!.y);
    });

    it('should respect viewport boundaries', () => {
      const cards = Array.from({ length: 10 }, (_, i) => 
        createMockCard(`card-${i}`, { priority: 'high' })
      );
      const positions = calculateStackPositions(cards, 'priority');
      
      positions.forEach((position) => {
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.x).toBeLessThan(window.innerWidth);
        expect(position.y).toBeLessThan(window.innerHeight);
      });
    });
  });
});

