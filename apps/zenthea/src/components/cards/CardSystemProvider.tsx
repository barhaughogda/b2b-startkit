'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BaseCardProps, CardEventHandlers, CardType, TaskStatus, Priority, AssignmentType, CardComment, MessageData } from './types';
import { AppointmentCard, createAppointmentCard } from './AppointmentCard';
import { getCardTemplate, createCardFromTemplate } from './utils/templateRegistryApi';
import { calculateGridLayout, calculateCardPositions, calculateStackPositions, groupCardsBy } from './utils/cardLayoutUtils';
import {
  CARD_Z_INDEX,
  getNewCardZIndex,
  getExpandedCardZIndex,
  getFocusedCardZIndex,
  getMaximizedCardZIndex,
  getMinimizedCardZIndex,
} from '@/lib/z-index';

// Card System Context
interface CardSystemContextType {
  cards: BaseCardProps[];
  activeCardId?: string;
  handlers: CardEventHandlers;
  openCard: (type: CardType, data: Record<string, unknown>, baseProps: Partial<BaseCardProps>) => void;
  closeCard: (id: string) => void;
  minimizeCard: (id: string) => void;
  maximizeCard: (id: string) => void;
  updateCardStatus: (id: string, status: TaskStatus) => void;
  updateCardPriority: (id: string, priority: Priority) => void;
  assignCard: (id: string, assignedTo: string, assignmentType: AssignmentType) => void;
  getCardById: (id: string) => BaseCardProps | undefined;
  // Control panel methods
  tileAll: () => void;
  minimizeAll: () => void;
  restoreAll: () => void;
  closeAll: () => void;
  stackByPriority: () => void;
  stackByType: () => void;
  stackByProvider: () => void;
  stackByPatient: () => void;
  stackByDueDate: () => void;
}

const CardSystemContext = createContext<CardSystemContextType | undefined>(undefined);

// Card System Provider Component
export function CardSystemProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<BaseCardProps[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | undefined>();

  // Note: Scroll prevention removed to allow users to scroll the background page
  // to find more cards to open. Cards are floating overlays that don't block background interaction.

  // Generate unique ID for cards
  const generateCardId = useCallback(() => {
    return `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Event handlers
  const handlers: CardEventHandlers = {
    onResize: useCallback((id: string, dimensions: { width: number; height: number }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[CardSystemProvider] onResize called', { id, dimensions });
      }
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { ...card, dimensions }
          : card
      ));
    }, []),

    onDrag: useCallback((id: string, position: { x: number; y: number }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[CardSystemProvider] onDrag called', { id, position });
      }
      setCards(prev => {
        const updated = prev.map(card => 
          card.id === id 
            ? { ...card, position: { ...position } } // Create new position object
            : card
        );
        if (process.env.NODE_ENV === 'development') {
          console.log('[CardSystemProvider] Updated cards', updated.find(c => c.id === id)?.position);
        }
        return updated;
      });
    }, []),

    onMinimize: useCallback((id: string) => {
      setCards(prev => {
        // Count existing minimized cards to calculate stacking position
        const minimizedCards = prev.filter(card => card.isMinimized);
        const stackIndex = minimizedCards.length;
        
        return prev.map(card => 
          card.id === id 
            ? { 
                ...card, 
                isMinimized: true, 
                isMaximized: false,
                // Store the previous state before minimizing
                previousState: {
                  isMaximized: card.isMaximized,
                  position: { ...card.position },
                  dimensions: { ...card.dimensions }
                },
                zIndex: getMinimizedCardZIndex(stackIndex), // Much lower z-index for minimized cards
                // Position in lower left corner with stacking
                position: {
                  x: 20 + (stackIndex * 10), // Stack horizontally with slight offset
                  y: window.innerHeight - 100 - (stackIndex * 60) // Stack vertically
                }
              }
            : card
        );
      });
    }, []),

    onExpand: useCallback((id: string) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { 
              ...card, 
              isMinimized: false,
              // Restore previous state if it exists, otherwise use current state
              isMaximized: card.previousState?.isMaximized || false,
              position: card.previousState?.position || {
                x: Math.max(20, Math.min(window.innerWidth - 520, card.position.x)),
                y: Math.max(120, Math.min(window.innerHeight - 520, card.position.y))
              },
              dimensions: card.previousState?.dimensions || card.dimensions,
              zIndex: getExpandedCardZIndex(), // Even higher z-index for expanded cards
              // Clear the previous state after restoring
              previousState: undefined
            }
          : card
      ));
    }, []),

    onMaximize: useCallback((id: string) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { 
              ...card, 
              isMaximized: !card.isMaximized, 
              isMinimized: false,
              zIndex: getMaximizedCardZIndex() // Bring maximized cards to front
            }
          : card
      ));
    }, []),

    onClose: useCallback((id: string) => {
      setCards(prev => prev.filter(card => card.id !== id));
      if (activeCardId === id) {
        setActiveCardId(undefined);
      }
    }, [activeCardId]),

    onStatusChange: useCallback((id: string, status: TaskStatus) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { ...card, status, updatedAt: new Date().toISOString() }
          : card
      ));
    }, []),

    onPriorityChange: useCallback((id: string, priority: Priority) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { ...card, priority, updatedAt: new Date().toISOString() }
          : card
      ));
    }, []),

    onAssignmentChange: useCallback((id: string, assignedTo: string, assignmentType: AssignmentType) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { ...card, assignedTo, assignmentType, updatedAt: new Date().toISOString() }
          : card
      ));
    }, []),

    onTabChange: useCallback((id: string, tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { ...card, activeTab: tab, updatedAt: new Date().toISOString() }
          : card
      ));
    }, []),

    onCommentAdd: useCallback((id: string, comment: CardComment) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { 
              ...card, 
              comments: [...(card.comments || []), comment],
              updatedAt: new Date().toISOString()
            }
          : card
      ));
    }, []),

    onAIAssignment: useCallback((id: string, aiAssigned: boolean) => {
      setCards(prev => prev.map(card => 
        card.id === id 
          ? { 
              ...card, 
              aiAssigned,
              assignmentType: aiAssigned ? 'aiAssistant' : card.assignmentType,
              updatedAt: new Date().toISOString()
            }
          : card
      ));
    }, []),

    onFocus: useCallback((id: string) => {
      setCards(prev => {
        // Find the card to focus and bring it to the front
        const cardToFocus = prev.find(card => card.id === id);
        if (!cardToFocus) return prev;

        // Remove the card from its current position and add it to the end (front)
        const otherCards = prev.filter(card => card.id !== id);
        return [...otherCards, { ...cardToFocus, zIndex: getFocusedCardZIndex() }];
      });
      setActiveCardId(id);
    }, []),

    onAppointmentDataChange: useCallback((id: string, appointmentData: Record<string, unknown>) => {
      setCards(prev => prev.map(card => 
        card.id === id && card.type === 'appointment'
          ? { 
              ...card, 
              appointmentData: { ...(card.appointmentData || {}), ...appointmentData } as BaseCardProps['appointmentData'],
              updatedAt: new Date().toISOString()
            }
          : card
      ));
    }, [])
  };

  // Open a new card
  const openCard = useCallback((type: CardType, data: Record<string, unknown>, baseProps: Partial<BaseCardProps>) => {
    const id = generateCardId();
    const now = new Date().toISOString();
    
    const newCard: BaseCardProps = {
      id,
      type,
      title: (typeof data.title === 'string' ? data.title : null) || `${type} Card`,
      content: null,
      priority: baseProps.priority || 'medium',
      status: baseProps.status || 'new',
      patientId: (typeof data.patientId === 'string' ? data.patientId : null) || baseProps.patientId || '',
      patientName: (typeof data.patientName === 'string' ? data.patientName : null) || baseProps.patientName || '',
      patientDateOfBirth: (typeof data.patientDateOfBirth === 'string' ? data.patientDateOfBirth : null) || baseProps.patientDateOfBirth,
      dueDate: (typeof data.dueDate === 'string' ? data.dueDate : null) || baseProps.dueDate,
      size: {
        min: 300,
        max: type === 'message' ? 700 : 800,  // Message cards have lower max height
        default: type === 'message' ? 700 : 500,
        current: type === 'message' ? 700 : 500
      },
      position: {
        // Center cards on screen
        x: type === 'appointment' 
          ? Math.max(20, (window.innerWidth - 600) / 2) 
          : Math.random() * 200 + 100,
        y: type === 'appointment'
          ? Math.max(80, (window.innerHeight - 650) / 2)
          : Math.random() * 200 + 50
      },
      dimensions: {
        width: type === 'message' ? 620 : type === 'appointment' ? 600 : 500,  // Appointment cards now reasonable width
        height: type === 'message' ? 700 : type === 'appointment' ? 650 : 600  // Adjusted height for appointment cards
      },
      isMinimized: false,
      isMaximized: false,
      zIndex: getNewCardZIndex(), // New cards start with highest z-index
      config: getCardTemplate(type).config,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      ...baseProps,
      handlers,
      // Add type-specific data
      ...(type === 'appointment' && { appointmentData: data as BaseCardProps['appointmentData'] }),
      ...(type === 'labResult' && { labData: data }),
      ...(type === 'message' && { messageData: data as unknown as MessageData }),
      ...(type === 'vitalSigns' && { vitalSignsData: data })
    };

    setCards(prev => [...prev, newCard]);
    setActiveCardId(id);
  }, [cards.length, generateCardId]);

  // Close a card
  const closeCard = useCallback((id: string) => {
    handlers.onClose?.(id);
  }, [handlers]);

  // Minimize a card
  const minimizeCard = useCallback((id: string) => {
    handlers.onMinimize?.(id);
  }, [handlers]);

  // Maximize a card
  const maximizeCard = useCallback((id: string) => {
    handlers.onMaximize?.(id);
  }, [handlers]);

  // Update card status
  const updateCardStatus = useCallback((id: string, status: TaskStatus) => {
    handlers.onStatusChange?.(id, status);
  }, [handlers]);

  // Update card priority
  const updateCardPriority = useCallback((id: string, priority: Priority) => {
    handlers.onPriorityChange?.(id, priority);
  }, [handlers]);

  // Assign card
  const assignCard = useCallback((id: string, assignedTo: string, assignmentType: AssignmentType) => {
    handlers.onAssignmentChange?.(id, assignedTo, assignmentType);
  }, [handlers]);

  // Get card by ID
  const getCardById = useCallback((id: string) => {
    return cards.find(card => card.id === id);
  }, [cards]);

  // Control panel methods
  const tileAll = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const defaultCardWidth = 500;
    const defaultCardHeight = 600;

    const gridLayout = calculateGridLayout(
      nonMinimizedCards.length,
      viewportWidth,
      viewportHeight,
      defaultCardWidth,
      defaultCardHeight
    );

    const positions = calculateCardPositions(
      nonMinimizedCards,
      gridLayout.cols,
      gridLayout.rows,
      gridLayout.cardWidth,
      gridLayout.cardHeight
    );

    setCards(prev => prev.map(card => {
      const position = positions.get(card.id);
      if (position && !card.isMinimized) {
        return {
          ...card,
          position,
          dimensions: {
            ...card.dimensions,
            width: gridLayout.cardWidth,
            height: gridLayout.cardHeight
          },
          isMaximized: false,
          zIndex: getNewCardZIndex()
        };
      }
      return card;
    }));
  }, [cards]);

  const minimizeAll = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    setCards(prev => {
      const minimizedCards = prev.filter(card => card.isMinimized);
      let stackIndex = minimizedCards.length;

      return prev.map(card => {
        if (!card.isMinimized) {
          const currentStackIndex = stackIndex;
          stackIndex++;
          return {
            ...card,
            isMinimized: true,
            isMaximized: false,
            previousState: {
              isMaximized: card.isMaximized,
              position: { ...card.position },
              dimensions: { ...card.dimensions }
            },
            zIndex: getMinimizedCardZIndex(currentStackIndex),
            position: {
              x: 20 + (currentStackIndex * 10),
              y: window.innerHeight - 100 - (currentStackIndex * 60)
            }
          };
        }
        return card;
      });
    });
  }, [cards]);

  const restoreAll = useCallback(() => {
    const minimizedCards = cards.filter(card => card.isMinimized);
    if (minimizedCards.length === 0) return;

    setCards(prev => prev.map(card => {
      if (card.isMinimized) {
        return {
          ...card,
          isMinimized: false,
          isMaximized: card.previousState?.isMaximized || false,
          position: card.previousState?.position || {
            x: Math.max(20, Math.min(window.innerWidth - 520, card.position.x)),
            y: Math.max(120, Math.min(window.innerHeight - 520, card.position.y))
          },
          dimensions: card.previousState?.dimensions || card.dimensions,
          zIndex: getExpandedCardZIndex(),
          previousState: undefined
        };
      }
      return card;
    }));
  }, [cards]);

  const closeAll = useCallback(() => {
    setCards([]);
    setActiveCardId(undefined);
  }, []);

  const stackByPriority = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    const positions = calculateStackPositions(nonMinimizedCards, 'priority');
    const groups = groupCardsBy(nonMinimizedCards, 'priority');
    const baseZIndex = getNewCardZIndex();

    setCards(prev => prev.map(card => {
      const position = positions.get(card.id);
      if (position && !card.isMinimized) {
        // Find card's index in its group for proper z-index stacking
        let cardIndexInStack = 0;
        for (const groupCards of groups.values()) {
          const index = groupCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            cardIndexInStack = index;
            break;
          }
        }
        return {
          ...card,
          position,
          isMaximized: false,
          zIndex: baseZIndex + cardIndexInStack
        };
      }
      return card;
    }));
  }, [cards]);

  const stackByType = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    const positions = calculateStackPositions(nonMinimizedCards, 'type');
    const groups = groupCardsBy(nonMinimizedCards, 'type');
    const baseZIndex = getNewCardZIndex();

    setCards(prev => prev.map(card => {
      const position = positions.get(card.id);
      if (position && !card.isMinimized) {
        // Find card's index in its group for proper z-index stacking
        let cardIndexInStack = 0;
        for (const groupCards of groups.values()) {
          const index = groupCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            cardIndexInStack = index;
            break;
          }
        }
        return {
          ...card,
          position,
          isMaximized: false,
          zIndex: baseZIndex + cardIndexInStack
        };
      }
      return card;
    }));
  }, [cards]);

  const stackByProvider = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    const positions = calculateStackPositions(nonMinimizedCards, 'provider');
    const groups = groupCardsBy(nonMinimizedCards, 'provider');
    const baseZIndex = getNewCardZIndex();

    setCards(prev => prev.map(card => {
      const position = positions.get(card.id);
      if (position && !card.isMinimized) {
        // Find card's index in its group for proper z-index stacking
        let cardIndexInStack = 0;
        for (const groupCards of groups.values()) {
          const index = groupCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            cardIndexInStack = index;
            break;
          }
        }
        return {
          ...card,
          position,
          isMaximized: false,
          zIndex: baseZIndex + cardIndexInStack
        };
      }
      return card;
    }));
  }, [cards]);

  const stackByPatient = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    const positions = calculateStackPositions(nonMinimizedCards, 'patient');
    const groups = groupCardsBy(nonMinimizedCards, 'patient');
    const baseZIndex = getNewCardZIndex();

    setCards(prev => prev.map(card => {
      const position = positions.get(card.id);
      if (position && !card.isMinimized) {
        // Find card's index in its group for proper z-index stacking
        let cardIndexInStack = 0;
        for (const groupCards of groups.values()) {
          const index = groupCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            cardIndexInStack = index;
            break;
          }
        }
        return {
          ...card,
          position,
          isMaximized: false,
          zIndex: baseZIndex + cardIndexInStack
        };
      }
      return card;
    }));
  }, [cards]);

  const stackByDueDate = useCallback(() => {
    const nonMinimizedCards = cards.filter(card => !card.isMinimized);
    if (nonMinimizedCards.length === 0) return;

    const positions = calculateStackPositions(nonMinimizedCards, 'dueDate');
    const groups = groupCardsBy(nonMinimizedCards, 'dueDate');
    const baseZIndex = getNewCardZIndex();

    setCards(prev => prev.map(card => {
      const position = positions.get(card.id);
      if (position && !card.isMinimized) {
        // Find card's index in its group for proper z-index stacking
        let cardIndexInStack = 0;
        for (const groupCards of groups.values()) {
          const index = groupCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            cardIndexInStack = index;
            break;
          }
        }
        return {
          ...card,
          position,
          isMaximized: false,
          zIndex: baseZIndex + cardIndexInStack
        };
      }
      return card;
    }));
  }, [cards]);

  const contextValue: CardSystemContextType = {
    cards,
    activeCardId,
    handlers,
    openCard,
    closeCard,
    minimizeCard,
    maximizeCard,
    updateCardStatus,
    updateCardPriority,
    assignCard,
    getCardById,
    tileAll,
    minimizeAll,
    restoreAll,
    closeAll,
    stackByPriority,
    stackByType,
    stackByProvider,
    stackByPatient,
    stackByDueDate
  };

  return (
    <CardSystemContext.Provider value={contextValue}>
      {children}
      {/* Render all active cards */}
      {cards.map(card => {
        // Use template for all card types (including message cards)
        const template = getCardTemplate(card.type);
        const cardElement = template.render({ ...card, handlers });
        return (
          <React.Fragment key={card.id}>
            {cardElement}
          </React.Fragment>
        );
      })}
    </CardSystemContext.Provider>
  );
}

// Hook to use the card system
export function useCardSystem() {
  const context = useContext(CardSystemContext);
  if (context === undefined) {
    throw new Error('useCardSystem must be used within a CardSystemProvider');
  }
  return context;
}
