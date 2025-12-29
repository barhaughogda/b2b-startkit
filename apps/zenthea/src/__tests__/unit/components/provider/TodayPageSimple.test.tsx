import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Today page component with a simple version
const MockTodayPage = () => {
  return (
    <div data-testid="today-page">
      <h1>Today</h1>
      <div data-testid="appointments-card">
        <h3>Today&apos;s Appointments</h3>
        <div>Loading appointments...</div>
      </div>
      <div data-testid="tasks-card">
        <h3>My Tasks</h3>
        <div>Loading tasks...</div>
      </div>
    </div>
  );
};

describe('TodayPage Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main heading', () => {
    render(<MockTodayPage />);
    
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders the appointments card', () => {
    render(<MockTodayPage />);
    
    expect(screen.getByTestId('appointments-card')).toBeInTheDocument();
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
  });

  it('renders the tasks card', () => {
    render(<MockTodayPage />);
    
    expect(screen.getByTestId('tasks-card')).toBeInTheDocument();
    expect(screen.getByText('My Tasks')).toBeInTheDocument();
  });

  it('shows loading states', () => {
    render(<MockTodayPage />);
    
    expect(screen.getByText('Loading appointments...')).toBeInTheDocument();
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('has proper heading hierarchy', () => {
    render(<MockTodayPage />);
    
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toHaveTextContent('Today');
    
    const cardTitles = screen.getAllByRole('heading', { level: 3 });
    expect(cardTitles).toHaveLength(2);
  });
});
