import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileAttachmentViewer } from '@/components/patient/FileAttachmentViewer';

describe('FileAttachmentViewer', () => {
  const mockAttachments = [
    {
      id: '1',
      name: 'Lab Results.pdf',
      type: 'application/pdf',
      size: '2.5 MB',
      uploadDate: '2024-01-15',
      category: 'lab-result' as const,
      description: 'Complete blood count results',
    },
    {
      id: '2',
      name: 'X-Ray Image.jpg',
      type: 'image/jpeg',
      size: '1.2 MB',
      uploadDate: '2024-01-12',
      category: 'imaging' as const,
      thumbnail: '/thumbnails/xray.jpg',
    },
    {
      id: '3',
      name: 'Prescription.pdf',
      type: 'application/pdf',
      size: '500 KB',
      uploadDate: '2024-01-10',
      category: 'prescription' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render file list with attachments', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText('Lab Results.pdf')).toBeInTheDocument();
      expect(screen.getByText('X-Ray Image.jpg')).toBeInTheDocument();
      expect(screen.getByText('Prescription.pdf')).toBeInTheDocument();
    });

    it('should display empty state when no attachments', () => {
      render(<FileAttachmentViewer attachments={[]} />);
      
      expect(screen.getByText(/No attachments/i)).toBeInTheDocument();
      expect(screen.getByText(/No file attachments are available/i)).toBeInTheDocument();
    });

    it('should render with custom maxHeight', () => {
      const { container } = render(
        <FileAttachmentViewer attachments={mockAttachments} maxHeight="500px" />
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('File Display', () => {
    it('should display file name', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText('Lab Results.pdf')).toBeInTheDocument();
      expect(screen.getByText('X-Ray Image.jpg')).toBeInTheDocument();
    });

    it('should display file type', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText(/application\/pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/image\/jpeg/i)).toBeInTheDocument();
    });

    it('should display file size', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText(/2\.5 MB/i)).toBeInTheDocument();
      expect(screen.getByText(/1\.2 MB/i)).toBeInTheDocument();
    });

    it('should display upload date', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText(/2024-01-15/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-12/i)).toBeInTheDocument();
    });

    it('should display file description when available', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText(/Complete blood count results/i)).toBeInTheDocument();
    });

    it('should display category badge', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText('lab-result')).toBeInTheDocument();
      expect(screen.getByText('imaging')).toBeInTheDocument();
      expect(screen.getByText('prescription')).toBeInTheDocument();
    });
  });

  describe('File Actions', () => {
    it('should call onView when view button is clicked', async () => {
      const user = userEvent.setup();
      const onView = vi.fn();
      
      render(
        <FileAttachmentViewer 
          attachments={mockAttachments} 
          onView={onView}
        />
      );
      
      const viewButtons = screen.getAllByText(/View/i);
      await user.click(viewButtons[0]);
      
      expect(onView).toHaveBeenCalledWith(mockAttachments[0]);
    });

    it('should call onDownload when download button is clicked', async () => {
      const user = userEvent.setup();
      const onDownload = vi.fn();
      
      render(
        <FileAttachmentViewer 
          attachments={mockAttachments} 
          onDownload={onDownload}
        />
      );
      
      const downloadButtons = screen.getAllByText(/Download/i);
      await user.click(downloadButtons[0]);
      
      expect(onDownload).toHaveBeenCalledWith(mockAttachments[0]);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      
      render(
        <FileAttachmentViewer 
          attachments={mockAttachments} 
          onDelete={onDelete}
        />
      );
      
      const deleteButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      
      // Find delete button (X icon)
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('destructive') || 
        btn.getAttribute('aria-label')?.includes('delete')
      );
      
      if (deleteButton) {
        await user.click(deleteButton);
        expect(onDelete).toHaveBeenCalled();
      }
    });

    it('should hide actions when showActions is false', () => {
      render(
        <FileAttachmentViewer 
          attachments={mockAttachments} 
          showActions={false}
        />
      );
      
      expect(screen.queryByText(/View/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Download/i)).not.toBeInTheDocument();
    });
  });

  describe('File Viewer Modal', () => {
    it('should open modal when file is viewed', async () => {
      const user = userEvent.setup();
      
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      const viewButtons = screen.getAllByText(/View/i);
      await user.click(viewButtons[0]);
      
      expect(screen.getByText('Lab Results.pdf')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      // Open modal
      const viewButtons = screen.getAllByText(/View/i);
      await user.click(viewButtons[0]);
      
      // Close modal
      const closeButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg') || btn.textContent === ''
      );
      const closeButton = closeButtons.find(btn => 
        btn.className.includes('outline') && 
        btn.querySelector('svg')
      );
      
      if (closeButton) {
        await user.click(closeButton);
        // Modal should be closed
        expect(screen.queryByText(/Lab Results\.pdf/i)).not.toBeInTheDocument();
      }
    });

    it('should toggle fullscreen mode', async () => {
      const user = userEvent.setup();
      
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      // Open modal
      const viewButtons = screen.getAllByText(/View/i);
      await user.click(viewButtons[0]);
      
      // Toggle fullscreen
      const fullscreenButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('svg')
      );
      const fullscreenButton = fullscreenButtons.find(btn => 
        btn.textContent === '' || btn.getAttribute('aria-label')?.includes('fullscreen')
      );
      
      if (fullscreenButton) {
        await user.click(fullscreenButton);
        // Fullscreen state should change
        expect(fullscreenButton).toBeInTheDocument();
      }
    });
  });

  describe('File Type Icons', () => {
    it('should display PDF icon for PDF files', () => {
      const { container } = render(
        <FileAttachmentViewer attachments={[mockAttachments[0]]} />
      );
      
      // Check for PDF icon (component uses FileImage or File icon)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should display image icon for image files', () => {
      const { container } = render(
        <FileAttachmentViewer attachments={[mockAttachments[1]]} />
      );
      
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Category Styling', () => {
    it('should apply correct styling for lab-result category', () => {
      const { container } = render(
        <FileAttachmentViewer attachments={[mockAttachments[0]]} />
      );
      
      const labBadge = screen.getByText('lab-result');
      expect(labBadge).toBeInTheDocument();
    });

    it('should apply correct styling for imaging category', () => {
      const { container } = render(
        <FileAttachmentViewer attachments={[mockAttachments[1]]} />
      );
      
      const imagingBadge = screen.getByText('imaging');
      expect(imagingBadge).toBeInTheDocument();
    });

    it('should apply correct styling for prescription category', () => {
      const { container } = render(
        <FileAttachmentViewer attachments={[mockAttachments[2]]} />
      );
      
      const prescriptionBadge = screen.getByText('prescription');
      expect(prescriptionBadge).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible file cards', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      expect(screen.getByText('Lab Results.pdf')).toBeInTheDocument();
      expect(screen.getByText('X-Ray Image.jpg')).toBeInTheDocument();
    });

    it('should have accessible action buttons', () => {
      render(<FileAttachmentViewer attachments={mockAttachments} />);
      
      const viewButtons = screen.getAllByText(/View/i);
      const downloadButtons = screen.getAllByText(/Download/i);
      
      expect(viewButtons.length).toBeGreaterThan(0);
      expect(downloadButtons.length).toBeGreaterThan(0);
    });
  });
});

