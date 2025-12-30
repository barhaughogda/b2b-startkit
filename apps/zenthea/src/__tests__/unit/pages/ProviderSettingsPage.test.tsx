import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SessionProvider } from '@/hooks/useZentheaSession';
import ProviderSettingsPage from '@/app/company/user/settings/page';

// Mock @/lib/auth
vi.mock('@/hooks/useZentheaSession', () => ({
  useZentheaSession: vi.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'provider',
        tenantId: 'test-tenant',
      }
    },
    status: 'authenticated',
    update: vi.fn(),
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    pathname: '/provider/settings'
  }))
}));

// Mock theme context
vi.mock('@/lib/theme-context', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn()
  }))
}));

// Mock convex
vi.mock('convex/react', () => ({
  useAction: vi.fn(() => vi.fn())
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
} as unknown as typeof Notification;

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: vi.fn(() => <div data-testid="shield-icon">Shield</div>),
  Bell: vi.fn(() => <div data-testid="bell-icon">Bell</div>),
  Palette: vi.fn(() => <div data-testid="palette-icon">Palette</div>),
  Languages: vi.fn(() => <div data-testid="languages-icon">Languages</div>),
  Monitor: vi.fn(() => <div data-testid="monitor-icon">Monitor</div>),
  Moon: vi.fn(() => <div data-testid="moon-icon">Moon</div>),
  Sun: vi.fn(() => <div data-testid="sun-icon">Sun</div>),
  Lock: vi.fn(() => <div data-testid="lock-icon">Lock</div>),
  Settings: vi.fn(() => <div data-testid="settings-icon">Settings</div>),
}));

describe('ProviderSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Settings Page Structure', () => {
    it('should render settings page', () => {
      render(
        <SessionProvider>
          <ProviderSettingsPage />
        </SessionProvider>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your account preferences and privacy settings')).toBeInTheDocument();
    });

    it('should have all settings sections', () => {
      render(
        <SessionProvider>
          <ProviderSettingsPage />
        </SessionProvider>
      );

      // Browser Notifications
      expect(screen.getByText('Browser Notifications')).toBeInTheDocument();
      
      // Email Notifications
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      
      // Push Notifications
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      
      // Security & Privacy
      expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
      
      // Appearance
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      
      // Language
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('should have appearance section with theme selector', () => {
      render(
        <SessionProvider>
          <ProviderSettingsPage />
        </SessionProvider>
      );

      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Customize your interface appearance')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred color theme')).toBeInTheDocument();
    });

    it('should have language settings', () => {
      render(
        <SessionProvider>
          <ProviderSettingsPage />
        </SessionProvider>
      );

      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('Select your preferred language')).toBeInTheDocument();
      expect(screen.getByText('Choose your preferred language for the interface')).toBeInTheDocument();
    });

    it('should have security section with password change', () => {
      render(
        <SessionProvider>
          <ProviderSettingsPage />
        </SessionProvider>
      );

      expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
      expect(screen.getByText('Manage your account security and privacy settings')).toBeInTheDocument();
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });
  });
});

