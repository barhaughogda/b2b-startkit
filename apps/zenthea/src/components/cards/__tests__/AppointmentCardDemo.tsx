'use client';

import React from 'react';
import { AppointmentCard, createAppointmentCard } from '../AppointmentCard';
import { BaseCardProps, CardEventHandlers, TeamMember, Tag as CardTag, Document, CardComment } from '../types';

// Mock data for demonstration
const mockAppointmentData = {
  id: 'apt-001',
  patientId: 'P-12345',
  patientName: 'John Doe',
  time: '10:30 AM',
  date: '2024-01-15',
  duration: 45,
  type: 'Cardiology Consultation',
  status: 'scheduled' as const,
  location: 'Room 101, Cardiology Wing',
  provider: 'Dr. Sarah Johnson',
  notes: 'Patient presenting with chest pain. Previous EKG shows normal sinus rhythm. Blood pressure elevated.',
  reminders: ['Call patient 24 hours before', 'Prepare lab results'],
  careTeam: [
    {
      id: 'tm-001',
      name: 'Dr. Sarah Johnson',
      role: 'Cardiologist',
      initials: 'SJ',
      isActive: true
    },
    {
      id: 'tm-002',
      name: 'Nurse Mary Smith',
      role: 'RN',
      initials: 'MS',
      isActive: true
    }
  ] as TeamMember[],
  tags: [
    {
      id: 'tag-001',
      name: 'High Priority',
      color: '#ef4444',
      category: 'priority' as const
    },
    {
      id: 'tag-002',
      name: 'Cardiology',
      color: '#3b82f6',
      category: 'medical' as const
    }
  ] as CardTag[],
  documents: [
    {
      id: 'doc-001',
      name: 'EKG Results.pdf',
      size: '2.3 MB',
      type: 'PDF',
      url: '/documents/ekg-results.pdf',
      uploadedBy: 'Dr. Sarah Johnson',
      uploadedAt: '2024-01-14T09:30:00Z'
    },
    {
      id: 'doc-002',
      name: 'Blood Work Results.xlsx',
      size: '1.1 MB',
      type: 'Excel',
      url: '/documents/blood-work.xlsx',
      uploadedBy: 'Lab Technician',
      uploadedAt: '2024-01-14T11:15:00Z'
    }
  ] as Document[],
  comments: [
    {
      id: 'comment-001',
      author: 'Dr. Sarah Johnson',
      authorRole: 'Cardiologist',
      content: 'Patient history reviewed. Previous cardiac events noted.',
      timestamp: '2024-01-14T14:30:00Z',
      isInternal: true
    },
    {
      id: 'comment-002',
      author: 'Nurse Mary Smith',
      authorRole: 'RN',
      content: 'Patient called to confirm appointment. No concerns raised.',
      timestamp: '2024-01-14T16:45:00Z',
      isInternal: false
    }
  ] as CardComment[]
};

const mockBaseProps: Omit<BaseCardProps, 'id' | 'type' | 'content'> = {
  title: 'Cardiology Consultation',
  priority: 'high',
  status: 'inProgress',
  assignedTo: 'Dr. Sarah Johnson',
  assignmentType: 'provider',
  patientId: 'P-12345',
  patientName: 'John Doe',
  dueDate: '2024-01-15',
  size: {
    min: 300,
    max: 800,
    default: 500,
    current: 500
  },
  position: { x: 100, y: 100 },
  dimensions: { width: 500, height: 500 },
  isMinimized: false,
  isMaximized: false,
  zIndex: 1,
  config: {
    type: 'appointment',
    color: 'bg-blue-50 border-blue-200',
    icon: null,
    size: {
      min: 300,
      max: 800,
      default: 500,
      current: 500
    },
    layout: 'horizontal',
    interactions: {
      resizable: true,
      draggable: true,
      stackable: true,
      minimizable: true,
      maximizable: true,
      closable: true
    },
    priority: {
      color: 'text-orange-600',
      borderColor: 'border-orange-500',
      icon: null,
      badge: 'High'
    }
  },
  createdAt: '2024-01-14T09:00:00Z',
  updatedAt: '2024-01-14T16:45:00Z',
  lastAccessedAt: '2024-01-14T16:45:00Z',
  accessCount: 5,
  aiAssigned: false,
  aiCompleted: false,
  aiNeedsHumanInput: false
};

const mockHandlers: CardEventHandlers = {
  onResize: (id, dimensions) => console.log('Resize:', id, dimensions),
  onDrag: (id, position) => console.log('Drag:', id, position),
  onMinimize: (id) => console.log('Minimize:', id),
  onMaximize: (id) => console.log('Maximize:', id),
  onClose: (id) => console.log('Close:', id),
  onStatusChange: (id, status) => console.log('Status change:', id, status),
  onPriorityChange: (id, priority) => console.log('Priority change:', id, priority),
  onAssignmentChange: (id, assignedTo, assignmentType) => console.log('Assignment change:', id, assignedTo, assignmentType),
  onCommentAdd: (id, comment) => console.log('Comment added:', id, comment),
  onAIAssignment: (id, aiAssigned) => console.log('AI assignment:', id, aiAssigned)
};

export function AppointmentCardDemo() {
  return (
    <div className="p-8 bg-background-primary min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-6">
          Updated AppointmentCard Demo
        </h1>
        <p className="text-text-secondary mb-8">
          This demonstrates the updated AppointmentCard following the universal card structure 
          from the Card System Implementation Plan.
        </p>
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Features Demonstrated:</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-1">
            <li>Universal card structure with header, actions, care team, tags, due date, notes, documents, and activity sections</li>
            <li>Semantic color usage from global.css (zenthea-teal, text-primary, etc.)</li>
            <li>Interactive tab navigation (Members, Tags, Due Date, Attachments)</li>
            <li>Care team management with avatars and roles</li>
            <li>Tag system with color coding and categories</li>
            <li>Document management with file types and sizes</li>
            <li>Activity feed with comments and timestamps</li>
            <li>Card controls (minimize, maximize, close)</li>
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Live Card Preview:</h2>
          <div className="relative">
            <AppointmentCard
              {...mockBaseProps}
              id="demo-apt-001"
              type="appointment"
              content={null}
              appointmentData={mockAppointmentData}
              handlers={mockHandlers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
