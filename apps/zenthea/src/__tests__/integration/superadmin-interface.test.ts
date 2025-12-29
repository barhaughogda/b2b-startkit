import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// import '@testing-library/jest-dom';
import ImageUploaderPage from '@/app/superadmin/image-uploader/page';
import LogoUploaderPage from '@/app/superadmin/logo-uploader/page';

// Mock Next.js router
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href }, children);
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('Superadmin Interface Tests', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    // Mock window.alert
    global.alert = vi.fn();
  });

  describe('Image Uploader Page', () => {
    it('should render image uploader interface', () => {
      render(React.createElement(ImageUploaderPage));
      
      expect(screen.getByText('Hero Image Uploader')).toBeInTheDocument();
      expect(screen.getByText('Upload New Image')).toBeInTheDocument();
      expect(screen.getByText('Current Hero Image')).toBeInTheDocument();
    });

    it('should handle file selection', () => {
      render(React.createElement(ImageUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Image File');
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    it('should validate file type on selection', () => {
      render(React.createElement(ImageUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Image File');
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      expect(screen.getByText(/Invalid file type/)).toBeInTheDocument();
    });

    it('should handle successful upload', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          url: 'http://localhost:3000/api/serve-image?key=test.jpg',
          key: 'images/hero/test.jpg'
        })
      });

      render(React.createElement(ImageUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Image File');
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByText('Upload Image');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('Image uploaded successfully!')).toBeInTheDocument();
      });
    });

    it('should handle upload errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Upload failed'
        })
      });

      render(React.createElement(ImageUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Image File');
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByText('Upload Image');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Logo Uploader Page', () => {
    it('should render logo uploader interface', () => {
      render(React.createElement(LogoUploaderPage));
      
      expect(screen.getByText('Logo Uploader')).toBeInTheDocument();
      expect(screen.getByText('Upload New Logo')).toBeInTheDocument();
      expect(screen.getByText('Current Logo')).toBeInTheDocument();
    });

    it('should handle logo file selection', () => {
      render(React.createElement(LogoUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Logo File');
      const file = new File(['logo content'], 'logo.png', { type: 'image/png' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(screen.getByText('logo.png')).toBeInTheDocument();
    });

    it('should validate logo file size', () => {
      render(React.createElement(LogoUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Logo File');
      // Create a 6MB file (exceeds 5MB limit for logos)
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large-logo.png', { type: 'image/png' });
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      expect(global.alert).toHaveBeenCalledWith('File too large. Maximum size is 5MB.');
    });

    it('should handle successful logo upload', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          url: 'http://localhost:3000/api/serve-image?key=logo.png',
          key: 'images/logo/logo.png'
        })
      });

      render(React.createElement(LogoUploaderPage));
      
      const fileInput = screen.getByLabelText('Select Logo File');
      const file = new File(['logo content'], 'logo.png', { type: 'image/png' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const uploadButton = screen.getByText('Upload Logo');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('Logo uploaded successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Links', () => {
    it('should have proper navigation links', () => {
      render(React.createElement(ImageUploaderPage));
      
      expect(screen.getByText('← Back to Super Admin')).toBeInTheDocument();
      expect(screen.getByText('View Landing Page')).toBeInTheDocument();
      expect(screen.getByText('View Login Page')).toBeInTheDocument();
    });

    it('should have proper external links', () => {
      render(React.createElement(ImageUploaderPage));
      
      const landingPageButton = screen.getByText('View Landing Page');
      const loginPageButton = screen.getByText('View Login Page');
      
      expect(landingPageButton).toBeInTheDocument();
      expect(loginPageButton).toBeInTheDocument();
      expect(landingPageButton).toHaveClass('inline-flex');
      expect(loginPageButton).toHaveClass('inline-flex');
    });
  });
});
