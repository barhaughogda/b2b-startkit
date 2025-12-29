'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Patient } from '@/types';

interface FilterState {
  conditions: string;
  insurance: string;
  ageRange: string;
  location: string;
}

interface PatientSearchFilterProps {
  patients: Patient[];
  onSearch: (query: string) => void;
  onFilter: (filters: FilterState) => void;
  onClear: () => void;
}

export function PatientSearchFilter({
  patients,
  onSearch,
  onFilter,
  onClear,
}: PatientSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    conditions: 'all',
    insurance: 'all',
    ageRange: 'all',
    location: 'all',
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSearch(searchQuery);
      }
    },
    [onSearch, searchQuery]
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
      conditions: 'all',
      insurance: 'all',
      ageRange: 'all',
      location: 'all',
    });
    try {
      onClear();
    } catch (error) {
      console.error('Error in clear handler:', error);
    }
  }, [onClear]);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    if (patients.length === 0) {
      return {
        conditions: [],
        insuranceOptions: [],
        ageRanges: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
        locations: [],
      };
    }

    const conditions = new Set<string>();
    const insuranceOptions = new Set<string>();
    const locations = new Set<string>();

    patients.forEach(patient => {
      // Extract conditions
      if (patient.conditions) {
        patient.conditions.forEach(condition => conditions.add(condition));
      }
      
      // Extract insurance providers
      if (patient.insurance?.provider) {
        insuranceOptions.add(patient.insurance.provider);
      }
      
      // Extract locations
      if (patient.address && typeof patient.address === 'object' && patient.address.city) {
        locations.add(patient.address.city);
      }
    });

    return {
      conditions: Array.from(conditions),
      insuranceOptions: Array.from(insuranceOptions),
      ageRanges: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
      locations: Array.from(locations),
    };
  }, [patients]);

  return (
    <div className="space-y-4 p-4 bg-background border rounded-lg">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Search patients by name, condition, or insurance..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="pl-10"
          aria-label="Search patients"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conditions Filter */}
        <div className="space-y-2">
          <label htmlFor="conditions-filter" className="text-sm font-medium">
            Conditions
          </label>
          <Select
            value={filters.conditions}
            onValueChange={(value) => handleFilterChange('conditions', value)}
          >
            <SelectTrigger id="conditions-filter" aria-label="Conditions">
              <SelectValue placeholder="All Conditions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {filterOptions.conditions.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Insurance Provider Filter */}
        <div className="space-y-2">
          <label htmlFor="insurance-filter" className="text-sm font-medium">
            Insurance Provider
          </label>
          <Select
            value={filters.insurance}
            onValueChange={(value) => handleFilterChange('insurance', value)}
          >
            <SelectTrigger id="insurance-filter" aria-label="Insurance Provider">
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

        {/* Age Range Filter */}
        <div className="space-y-2">
          <label htmlFor="age-range-filter" className="text-sm font-medium">
            Age Range
          </label>
          <Select
            value={filters.ageRange}
            onValueChange={(value) => handleFilterChange('ageRange', value)}
          >
            <SelectTrigger id="age-range-filter" aria-label="Age Range">
              <SelectValue placeholder="All Ages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {filterOptions.ageRanges.map((ageRange) => (
                <SelectItem key={ageRange} value={ageRange}>
                  {ageRange}
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
