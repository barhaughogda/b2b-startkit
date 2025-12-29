import { BaseCardProps } from '../types';

export interface GridLayout {
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
}

export interface CardPosition {
  x: number;
  y: number;
}

/**
 * Calculate optimal grid layout dimensions based on card count and viewport size
 */
export function calculateGridLayout(
  cardCount: number,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth: number = 500,
  cardHeight: number = 600,
  padding: number = 20,
  spacing: number = 20
): GridLayout {
  if (cardCount === 0) {
    return { cols: 0, rows: 0, cardWidth, cardHeight };
  }

  if (cardCount === 1) {
    return { cols: 1, rows: 1, cardWidth, cardHeight };
  }

  // Calculate available space (accounting for padding and control panel)
  const availableWidth = viewportWidth - (padding * 2) - 200; // Reserve space for control panel
  const availableHeight = viewportHeight - (padding * 2) - 200; // Reserve space for header/footer

  // Calculate how many cards can fit horizontally and vertically
  const maxCols = Math.floor((availableWidth + spacing) / (cardWidth + spacing));
  const maxRows = Math.floor((availableHeight + spacing) / (cardHeight + spacing));

  // Calculate optimal grid dimensions
  let cols = Math.ceil(Math.sqrt(cardCount));
  let rows = Math.ceil(cardCount / cols);

  // Ensure we have enough cells for all cards
  while (cols * rows < cardCount) {
    if (cols <= rows) {
      cols++;
    } else {
      rows++;
    }
  }

  // Ensure we don't exceed viewport limits
  // Guard against division by zero: ensure cols and rows are at least 1
  // Note: Don't constrain cols to cardCount - we need enough cells for all cards
  cols = Math.max(1, Math.min(cols, maxCols));
  rows = Math.max(1, Math.min(rows, maxRows));

  // Adjust if we have too many rows
  if (rows > maxRows && cols < maxCols) {
    cols = Math.max(1, Math.min(Math.ceil(cardCount / maxRows), maxCols));
    rows = Math.max(1, Math.ceil(cardCount / cols));
  }

  // Ensure we still have enough cells after constraints
  while (cols * rows < cardCount && (rows < maxRows || cols < maxCols)) {
    if (cols < maxCols && (rows >= maxRows || cols <= rows)) {
      cols++;
    } else if (rows < maxRows) {
      rows++;
    } else {
      break; // Can't fit all cards, but we'll return what we can
    }
  }

  // Final check: ensure we have enough cells for all cards
  // If viewport is too constrained, prioritize fitting all cards over viewport limits
  if (cols * rows < cardCount) {
    // Calculate minimum dimensions needed to fit all cards
    const minCols = Math.ceil(Math.sqrt(cardCount));
    const minRows = Math.ceil(cardCount / minCols);
    
    // Use minimum dimensions if current dimensions are insufficient
    // This may cause cards to overflow viewport, but ensures all cards have positions
    if (cols < minCols || rows < minRows) {
      cols = Math.max(cols, minCols);
      rows = Math.max(rows, Math.ceil(cardCount / cols));
    }
  }

  // Calculate card dimensions to fit in grid
  // Guard against division by zero (cols and rows should be >= 1, but double-check)
  const gridWidth = availableWidth - (spacing * (cols - 1));
  const gridHeight = availableHeight - (spacing * (rows - 1));
  
  const calculatedCardWidth = cols > 0 
    ? Math.max(100, Math.min(cardWidth, Math.floor(gridWidth / cols))) // Minimum 100px width
    : cardWidth;
  const calculatedCardHeight = rows > 0
    ? Math.max(100, Math.min(cardHeight, Math.floor(gridHeight / rows))) // Minimum 100px height
    : cardHeight;

  return {
    cols: Math.max(1, cols), // Ensure at least 1
    rows: Math.max(1, rows), // Ensure at least 1
    cardWidth: calculatedCardWidth,
    cardHeight: calculatedCardHeight
  };
}

/**
 * Calculate positions for cards in a grid layout
 */
export function calculateCardPositions(
  cards: BaseCardProps[],
  gridCols: number,
  gridRows: number,
  cardWidth: number,
  cardHeight: number,
  padding: number = 20,
  spacing: number = 20
): Map<string, CardPosition> {
  const positions = new Map<string, CardPosition>();
  const nonMinimizedCards = cards.filter(card => !card.isMinimized);

  if (nonMinimizedCards.length === 0) {
    return positions;
  }

  // Calculate starting position (centered)
  const totalGridWidth = (gridCols * cardWidth) + (spacing * (gridCols - 1));
  const totalGridHeight = (gridRows * cardHeight) + (spacing * (gridRows - 1));
  
  const startX = Math.max(padding, (window.innerWidth - totalGridWidth) / 2);
  const startY = Math.max(padding + 100, (window.innerHeight - totalGridHeight) / 2);

  // Assign positions to each card
  nonMinimizedCards.forEach((card, index) => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);

    const x = startX + (col * (cardWidth + spacing));
    const y = startY + (row * (cardHeight + spacing));

    positions.set(card.id, { x, y });
  });

  return positions;
}

/**
 * Group cards by a specific criteria
 */
export function groupCardsBy(
  cards: BaseCardProps[],
  groupBy: 'priority' | 'type' | 'provider' | 'patient' | 'dueDate'
): Map<string, BaseCardProps[]> {
  const groups = new Map<string, BaseCardProps[]>();

  cards.forEach(card => {
    let key: string;

    switch (groupBy) {
      case 'priority':
        key = card.priority || 'medium';
        break;
      case 'type':
        key = card.type;
        break;
      case 'provider':
        key = card.assignedTo || 'unassigned';
        break;
      case 'patient':
        key = card.patientId || 'no-patient';
        break;
      case 'dueDate':
        if (card.dueDate) {
          const date = new Date(card.dueDate);
          const today = new Date();
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) key = 'overdue';
          else if (diffDays === 0) key = 'today';
          else if (diffDays <= 7) key = 'this-week';
          else if (diffDays <= 30) key = 'this-month';
          else key = 'later';
        } else {
          key = 'no-due-date';
        }
        break;
      default:
        key = 'other';
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(card);
  });

  return groups;
}

/**
 * Calculate stack positions for grouped cards
 */
export function calculateStackPositions(
  cards: BaseCardProps[],
  groupBy: 'priority' | 'type' | 'provider' | 'patient' | 'dueDate',
  stackSpacing: number = 30,
  stackOffset: number = 35,
  startX: number = 100,
  startY: number = 150
): Map<string, CardPosition> {
  const positions = new Map<string, CardPosition>();
  const groups = groupCardsBy(cards, groupBy);

  if (groups.size === 0) {
    return positions;
  }

  // Calculate positions for each group
  const groupEntries = Array.from(groups.entries());
  const cardsPerStack = Math.max(1, Math.ceil(cards.length / groups.size));
  const stackWidth = 500; // Default card width
  const stackHeight = 600; // Default card height

  groupEntries.forEach(([groupKey, groupCards], groupIndex) => {
    // Position stacks horizontally
    const stackX = startX + (groupIndex * (stackWidth + stackSpacing));

    // Position cards within each stack with visible offset
    // Each card is offset both horizontally and vertically to create a cascade effect
    groupCards.forEach((card, cardIndex) => {
      const cardX = stackX + (cardIndex * stackOffset);
      const cardY = startY + (cardIndex * stackOffset);

      // Ensure cards don't go off screen
      const boundedX = Math.min(cardX, window.innerWidth - stackWidth - 20);
      const boundedY = Math.min(cardY, window.innerHeight - stackHeight - 200);

      positions.set(card.id, { x: boundedX, y: boundedY });
    });
  });

  return positions;
}

