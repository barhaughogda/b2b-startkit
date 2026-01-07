import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminLayout } from '@/components/layout/AdminLayout';

// Mock theme provider
vi.mock('@/lib/theme-context', () => ({
  ZentheaThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock navigation layout
vi.mock('@/components/navigation/AdminNavigationLayout', () => ({
  AdminNavigationLayout: ({ children, contentClassName }: { children: React.ReactNode; contentClassName?: string }) => (
    <div data-testid="admin-navigation-layout" className={contentClassName}>
      {children}
    </div>
  ),
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    });

    it('should render with theme provider', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    });

    it('should render with navigation layout', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(screen.getByTestId('admin-navigation-layout')).toBeInTheDocument();
    });

    it('should apply custom content className', () => {
      render(
        <AdminLayout contentClassName="custom-class">
          <div>Test Content</div>
        </AdminLayout>
      );

      const navLayout = screen.getByTestId('admin-navigation-layout');
      expect(navLayout).toHaveClass('custom-class');
    });

    it('should have correct data-testid', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have min-h-screen class', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const layout = screen.getByTestId('admin-layout');
      expect(layout).toHaveClass('min-h-screen');
    });

    it('should have background color class', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const layout = screen.getByTestId('admin-layout');
      expect(layout).toHaveClass('bg-background-primary');
    });
  });
});

