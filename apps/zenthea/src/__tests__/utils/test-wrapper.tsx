import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock session for testing
const mockSession = {
  user: {
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: '2024-12-31',
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

// Mock SessionProvider component
const MockSessionProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="session-provider">{children}</div>;
};

// Mock CardSystemProvider component with useCardSystem hook
const MockCardSystemProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="card-system-provider">{children}</div>;
};

// Mock the useCardSystem hook
const mockOpenCard = vi.fn();
vi.mock('@/components/cards/CardSystemProvider', () => ({
  useCardSystem: vi.fn(() => ({
    openCard: mockOpenCard,
    closeCard: vi.fn(),
    cards: [],
    activeCardId: null,
  })),
}));

// Test wrapper that includes all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockSessionProvider>
      <MockCardSystemProvider>
        {children}
      </MockCardSystemProvider>
    </MockSessionProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { mockOpenCard };
