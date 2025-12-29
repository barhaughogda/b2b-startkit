'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Provider } from '@/types';

interface FilterState {
  specialty: string;
  location: string;
  availability: string;
  insurance: string;
}

interface ProviderSearchFilterProps {
  providers: Provider[];
  onSearch: (query: string) => void;
  onFilter: (filters: FilterState) => void;
  onClear: () => void;
}

export function ProviderSearchFilter({
  providers,
  onSearch,
  onFilter,
  onClear,
}: ProviderSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    specialty: 'all',
    location: 'all',
    availability: 'all',
    insurance: 'all',
  });

  // Debounced search
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (query: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          onSearch(query);
          timeoutId = null;
        }, 300);
      };
    })(),
    [onSearch]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      try {
        debouncedSearch(query);
      } catch (error) {
        console.error('Error in search change handler:', error);
      }
    },
    [debouncedSearch]
  );

  const handleFilterChange = useCallback(
    (filterType: keyof FilterState, value: string) => {
      const newFilters = { ...filters, [filterType]: value };
      setFilters(newFilters);
      try {
        onFilter(newFilters);
      } catch (error) {
        console.error('Error in filter change handler:', error);
      }
    },
    [filters, onFilter]
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setFilters({
      specialty: 'all',
      location: 'all',
      availability: 'all',
      insurance: 'all',
    });
    try {
      onClear();
    } catch (error) {
      console.error('Error in clear handler:', error);
    }
  }, [onClear]);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    if (!Array.isArray(providers) || providers.length === 0) {
      return {
        specialties: [],
        locations: [],
        availabilities: [],
        insuranceOptions: [],
      };
    }

    try {
      const specialties = [...new Set(providers.map(p => p?.specialty).filter(Boolean))].sort();
      const locations = [...new Set(providers.map(p => p?.location).filter(Boolean))].sort();
      const availabilities = [...new Set(providers.map(p => p?.availability).filter(Boolean))].sort();
      const insuranceOptions = [...new Set(providers.flatMap(p => p?.insurance || []).filter(Boolean))].sort();

      return {
        specialties,
        locations,
        availabilities,
        insuranceOptions,
      };
    } catch (error) {
      console.error('Error processing filter options:', error);
      return {
        specialties: [],
        locations: [],
        availabilities: [],
        insuranceOptions: [],
      };
    }
  }, [providers]);

  return (
    <div className="space-y-4 p-4 bg-background border rounded-lg">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search providers by name, specialty, or location..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10"
          aria-label="Search providers"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Specialty Filter */}
        <div className="space-y-2">
          <label htmlFor="specialty-filter" className="text-sm font-medium">
            Specialty
          </label>
          <Select
            value={filters.specialty}
            onValueChange={(value) => handleFilterChange('specialty', value)}
          >
            <SelectTrigger id="specialty-filter" aria-label="Specialty">
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {filterOptions.specialties.map((specialty) => (
                <SelectItem key={specialty} value={specialty}>
                  {specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <label htmlFor="location-filter" className="text-sm font-medium">
            Clinics
          </label>
          <Select
            value={filters.location}
            onValueChange={(value) => handleFilterChange('location', value)}
          >
            <SelectTrigger id="location-filter" aria-label="Location">
              <SelectValue placeholder="All Clinics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {filterOptions.locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Availability Filter */}
        <div className="space-y-2">
          <label htmlFor="availability-filter" className="text-sm font-medium">
            Availability
          </label>
          <Select
            value={filters.availability}
            onValueChange={(value) => handleFilterChange('availability', value)}
          >
            <SelectTrigger id="availability-filter" aria-label="Availability">
              <SelectValue placeholder="All Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Availability</SelectItem>
              {filterOptions.availabilities.map((availability) => (
                <SelectItem key={availability} value={availability}>
                  {availability}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Insurance Filter */}
        <div className="space-y-2">
          <label htmlFor="insurance-filter" className="text-sm font-medium">
            Insurance
          </label>
          <Select
            value={filters.insurance}
            onValueChange={(value) => handleFilterChange('insurance', value)}
          >
            <SelectTrigger id="insurance-filter" aria-label="Insurance">
              <SelectValue placeholder="All Insurance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Insurance</SelectItem>
              {filterOptions.insuranceOptions.map((insurance) => (
                <SelectItem key={insurance} value={insurance}>
                  {insurance}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleClear}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
