import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';

// Mock header and sidebar components
vi.mock('@/components/layouts/SuperAdminHeader', () => ({
  SuperAdminHeader: () => <header data-testid="superadmin-header">Header</header>,
}));

vi.mock('@/components/layouts/SuperAdminSidebar', () => ({
  SuperAdminSidebar: () => <aside data-testid="superadmin-sidebar">Sidebar</aside>,
}));

describe('SuperAdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(
        <SuperAdminLayout>
          <div>Test Content</div>
        </SuperAdminLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render header', () => {
      render(
        <SuperAdminLayout>
          <div>Test Content</div>
        </SuperAdminLayout>
      );

      expect(screen.getByTestId('superadmin-header')).toBeInTheDocument();
    });

    it('should render sidebar', () => {
      render(
        <SuperAdminLayout>
          <div>Test Content</div>
        </SuperAdminLayout>
      );

      expect(screen.getByTestId('superadmin-sidebar')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have min-h-screen class', () => {
      const { container } = render(
        <SuperAdminLayout>
          <div>Test Content</div>
        </SuperAdminLayout>
      );

      const layout = container.firstChild as HTMLElement;
      expect(layout).toHaveClass('min-h-screen');
    });

    it('should have background color class', () => {
      const { container } = render(
        <SuperAdminLayout>
          <div>Test Content</div>
        </SuperAdminLayout>
      );

      const layout = container.firstChild as HTMLElement;
      expect(layout).toHaveClass('bg-background-primary');
    });

    it('should have main content area with correct classes', () => {
      render(
        <SuperAdminLayout>
          <div>Test Content</div>
        </SuperAdminLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1');
      expect(main).toHaveClass('md:ml-64');
      expect(main).toHaveClass('pt-16');
    });
  });
});

