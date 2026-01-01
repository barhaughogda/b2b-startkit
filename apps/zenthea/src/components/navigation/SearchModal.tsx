'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'patient' | 'task' | 'message' | 'appointment';
  subtitle?: string;
  url: string;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    patients: SearchResult[];
    tasks: SearchResult[];
    messages: SearchResult[];
    appointments: SearchResult[];
  }>({
    patients: [],
    tasks: [],
    messages: [],
    appointments: [],
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Use setTimeout to ensure the input is rendered and can receive focus
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Handle search with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({
        patients: [],
        tasks: [],
        messages: [],
        appointments: [],
      });
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    
    try {
      // Mock search results - in real implementation, this would call your API
      const mockResults = {
        patients: [
          { id: '550e8400-e29b-41d4-a716-446655440000', title: `Patient: ${query}`, type: 'patient' as const, subtitle: 'Last visit: 2 days ago', url: '/company/patients/550e8400-e29b-41d4-a716-446655440000' },
        ],
        tasks: [
          { id: '550e8400-e29b-41d4-a716-446655440001', title: `Task: ${query}`, type: 'task' as const, subtitle: 'Due: Tomorrow', url: '/company/tasks/550e8400-e29b-41d4-a716-446655440001' },
        ],
        messages: [
          { id: '550e8400-e29b-41d4-a716-446655440002', title: `Message: ${query}`, type: 'message' as const, subtitle: 'From: Dr. Smith', url: '/company/messages/550e8400-e29b-41d4-a716-446655440002' },
        ],
        appointments: [
          { id: '550e8400-e29b-41d4-a716-446655440003', title: `Appointment: ${query}`, type: 'appointment' as const, subtitle: 'Tomorrow 2:00 PM', url: '/company/appointments/550e8400-e29b-41d4-a716-446655440003' },
        ],
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    onClose();
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const renderSearchResults = () => {
    if (!searchQuery.trim()) {
      return (
        <div className="text-center py-8 text-text-secondary">
          Start typing to search...
        </div>
      );
    }

    if (isSearching) {
      return (
        <div className="text-center py-8 text-text-secondary">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Searching...
        </div>
      );
    }

    const allResults = [
      ...results.patients,
      ...results.tasks,
      ...results.messages,
      ...results.appointments,
    ];

    if (allResults.length === 0) {
      return (
        <div className="text-center py-8 text-text-secondary">
          No results found for &quot;{searchQuery}&quot;
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {results.patients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Patients</h3>
            <div className="space-y-1">
              {results.patients.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-md hover:bg-surface-interactive transition-colors"
                >
                  <div className="font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm text-text-secondary">{result.subtitle}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {results.tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Tasks</h3>
            <div className="space-y-1">
              {results.tasks.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-md hover:bg-surface-interactive transition-colors"
                >
                  <div className="font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm text-text-secondary">{result.subtitle}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {results.messages.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Messages</h3>
            <div className="space-y-1">
              {results.messages.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-md hover:bg-surface-interactive transition-colors"
                >
                  <div className="font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm text-text-secondary">{result.subtitle}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {results.appointments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Appointments</h3>
            <div className="space-y-1">
              {results.appointments.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 rounded-md hover:bg-surface-interactive transition-colors"
                >
                  <div className="font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-sm text-text-secondary">{result.subtitle}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        backgroundColor: 'var(--color-background-overlay)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
      data-testid="search-modal-backdrop"
    >
      <div 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className="bg-surface-elevated shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border-primary rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pb-4 px-6 pt-6">
          <div className="flex items-center justify-between">
            <h2 id="search-modal-title" className="text-lg font-semibold">Search All</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search all patients, tasks, messages, appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Handle Enter key to select first result
                  const allResults = [
                    ...results.patients,
                    ...results.tasks,
                    ...results.messages,
                    ...results.appointments,
                  ];
                  if (allResults.length > 0 && allResults[0]) {
                    handleResultClick(allResults[0]);
                  }
                }
              }}
            />
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {renderSearchResults()}
          </div>
        </div>
      </div>
    </div>
  );
}
