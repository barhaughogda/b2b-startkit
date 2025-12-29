'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, X, Search, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ClaimStatus } from '@/types/billing';
import { getStatusLabel } from '@/lib/billing/statusMapping';

/**
 * Filter state interface
 */
export interface ClinicBillingFiltersState {
  dateFrom?: Date;
  dateTo?: Date;
  providerIds: string[];
  payerIds: string[];
  patientIds: string[];
  statuses: ClaimStatus[];
}

/**
 * Props for ClinicBillingFilters component
 */
export interface ClinicBillingFiltersProps {
  /** Available providers for filtering */
  providers: Array<{ id: string; name: string }>;
  /** Available payers for filtering */
  payers: Array<{ id: string; name: string }>;
  /** Available patients for filtering */
  patients: Array<{ id: string; name: string }>;
  /** Available statuses for filtering */
  statuses: ClaimStatus[];
  /** Current filter state */
  filters: ClinicBillingFiltersState;
  /** Callback when filters change */
  onFiltersChange: (filters: ClinicBillingFiltersState) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ClinicBillingFilters Component
 * 
 * Provides clinic-level filtering controls for billing data:
 * - Date range picker
 * - Provider multi-select dropdown
 * - Payer multi-select dropdown
 * - Patient multi-select dropdown
 * - Status filter chips
 * - Clear filters button
 * 
 * Task 3.4: Add Clinic-Level Filters Panel
 * 
 * @example
 * ```tsx
 * <ClinicBillingFilters
 *   providers={[{ id: '1', name: 'Dr. Smith' }]}
 *   payers={[{ id: '1', name: 'Blue Cross' }]}
 *   patients={[{ id: '1', name: 'John Patient' }]}
 *   statuses={['submitted', 'paid']}
 *   filters={filterState}
 *   onFiltersChange={setFilterState}
 * />
 * ```
 */
export function ClinicBillingFilters({
  providers,
  payers,
  patients,
  statuses,
  filters,
  onFiltersChange,
  className,
}: ClinicBillingFiltersProps) {
  // Count active filters
  const activeFilterCount =
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    filters.providerIds.length +
    filters.payerIds.length +
    filters.patientIds.length +
    filters.statuses.length;

  // Collapsible state - start expanded if filters are active, collapsed otherwise
  const [isExpanded, setIsExpanded] = useState(activeFilterCount > 0);
  
  // Date range state
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // Multi-select dropdown states
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [payerDropdownOpen, setPayerDropdownOpen] = useState(false);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  // Search states for filters
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [payerSearchQuery, setPayerSearchQuery] = useState('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Auto-expand when filters become active
  useEffect(() => {
    if (activeFilterCount > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [activeFilterCount, isExpanded]);

  // Handle date changes
  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: date,
      // Ensure dateTo is not before dateFrom
      dateTo: date && filters.dateTo && date > filters.dateTo ? undefined : filters.dateTo,
    });
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateTo: date,
      // Ensure dateFrom is not after dateTo
      dateFrom: date && filters.dateFrom && date < filters.dateFrom ? undefined : filters.dateFrom,
    });
    setDateToOpen(false);
  };

  // Handle provider selection
  const handleProviderToggle = (providerId: string) => {
    const newProviderIds = filters.providerIds.includes(providerId)
      ? filters.providerIds.filter((id) => id !== providerId)
      : [...filters.providerIds, providerId];
    
    onFiltersChange({
      ...filters,
      providerIds: newProviderIds,
    });
  };

  // Handle payer selection
  const handlePayerToggle = (payerId: string) => {
    const newPayerIds = filters.payerIds.includes(payerId)
      ? filters.payerIds.filter((id) => id !== payerId)
      : [...filters.payerIds, payerId];
    
    onFiltersChange({
      ...filters,
      payerIds: newPayerIds,
    });
  };

  // Handle patient selection
  const handlePatientToggle = (patientId: string) => {
    const newPatientIds = filters.patientIds.includes(patientId)
      ? filters.patientIds.filter((id) => id !== patientId)
      : [...filters.patientIds, patientId];
    
    onFiltersChange({
      ...filters,
      patientIds: newPatientIds,
    });
  };

  // Handle status toggle
  const handleStatusToggle = (status: ClaimStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    
    onFiltersChange({
      ...filters,
      statuses: newStatuses,
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    onFiltersChange({
      dateFrom: undefined,
      dateTo: undefined,
      providerIds: [],
      payerIds: [],
      patientIds: [],
      statuses: [],
    });
    // Clear search queries
    setProviderSearchQuery('');
    setPayerSearchQuery('');
    setPatientSearchQuery('');
  };

  // Filter providers based on search query
  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(providerSearchQuery.toLowerCase())
  );

  // Filter payers based on search query
  const filteredPayers = payers.filter((payer) =>
    payer.name.toLowerCase().includes(payerSearchQuery.toLowerCase())
  );

  // Filter patients based on search query
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  // Reset search queries when dropdowns close
  const handleProviderDropdownChange = (open: boolean) => {
    setProviderDropdownOpen(open);
    if (!open) setProviderSearchQuery('');
  };

  const handlePayerDropdownChange = (open: boolean) => {
    setPayerDropdownOpen(open);
    if (!open) setPayerSearchQuery('');
  };

  const handlePatientDropdownChange = (open: boolean) => {
    setPatientDropdownOpen(open);
    if (!open) setPatientSearchQuery('');
  };

  return (
    <Card className={cn('bg-surface-elevated border-border-primary/20', className)}>
      <CardHeader className={cn('pb-3', !isExpanded && 'pb-4')}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 text-left hover:text-text-primary transition-colors group"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
              activeFilterCount > 0 
                ? 'bg-zenthea-teal/10 text-zenthea-teal' 
                : 'bg-background-secondary text-text-secondary group-hover:bg-background-elevated'
            )}>
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium text-text-primary">
                Filters
              </CardTitle>
              {activeFilterCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-zenthea-teal/10 text-zenthea-teal border-zenthea-teal/20 font-medium"
                >
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            <div className={cn(
              'flex items-center justify-center w-6 h-6 rounded-md transition-colors ml-1',
              'bg-background-secondary group-hover:bg-background-elevated'
            )}>
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-text-secondary" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
              )}
            </div>
          </button>
          {activeFilterCount > 0 && isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-text-secondary hover:text-status-error hover:bg-status-error/10"
              aria-label="Clear all filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
        {/* Date Range Picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date-from" className="text-sm text-text-secondary mb-1 block">
              Start Date
            </Label>
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-from"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters.dateFrom && 'text-text-tertiary'
                  )}
                  aria-label="Select start date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? (
                    format(filters.dateFrom, 'PPP')
                  ) : (
                    <span>Pick a start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={handleDateFromChange}
                  disabled={(date) => {
                    // Disable future dates
                    if (date > new Date()) return true;
                    // Disable dates after end date if end date is set
                    if (filters.dateTo && date > filters.dateTo) return true;
                    return false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="date-to" className="text-sm text-text-secondary mb-1 block">
              End Date
            </Label>
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date-to"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters.dateTo && 'text-text-tertiary'
                  )}
                  aria-label="Select end date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? (
                    format(filters.dateTo, 'PPP')
                  ) : (
                    <span>Pick an end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={handleDateToChange}
                  disabled={(date) => {
                    // Disable future dates
                    if (date > new Date()) return true;
                    // Disable dates before start date if start date is set
                    if (filters.dateFrom && date < filters.dateFrom) return true;
                    return false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Provider Multi-Select */}
        <div>
          <Label className="text-sm text-text-secondary mb-2 block" id="provider-filter-label">
            Providers
          </Label>
          <Select
            open={providerDropdownOpen}
            onOpenChange={handleProviderDropdownChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  filters.providerIds.length > 0
                    ? `${filters.providerIds.length} provider${filters.providerIds.length !== 1 ? 's' : ''} selected`
                    : 'Select providers'
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]" aria-labelledby="provider-filter-label">
              {/* Search Input */}
              <div className="sticky top-0 z-10 bg-surface-elevated border-b border-border-primary px-2 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    type="text"
                    placeholder="Search providers..."
                    value={providerSearchQuery}
                    onChange={(e) => setProviderSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label="Search providers"
                    aria-describedby={filteredProviders.length === 0 ? 'provider-search-results' : undefined}
                  />
                </div>
              </div>
              {/* Filtered Provider List */}
              <div className="max-h-[240px] overflow-y-auto">
                {filteredProviders.length === 0 ? (
                  <div id="provider-search-results" className="px-2 py-4 text-sm text-text-secondary text-center">
                    {providerSearchQuery ? 'No providers found' : 'No providers available'}
                  </div>
                ) : (
                  filteredProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-surface-interactive cursor-pointer focus:bg-surface-interactive focus:outline-none focus:ring-2 focus:ring-border-focus"
                      onClick={() => handleProviderToggle(provider.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleProviderToggle(provider.id);
                        }
                      }}
                      role="option"
                      tabIndex={0}
                      aria-selected={filters.providerIds.includes(provider.id)}
                    >
                      <Checkbox
                        checked={filters.providerIds.includes(provider.id)}
                        onCheckedChange={() => handleProviderToggle(provider.id)}
                        aria-label={`Select ${provider.name}`}
                      />
                      <label className="text-sm text-text-primary cursor-pointer flex-1">
                        {provider.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </SelectContent>
          </Select>
          {filters.providerIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.providerIds.map((providerId) => {
                const provider = providers.find((p) => p.id === providerId);
                return (
                  <Badge
                    key={providerId}
                    variant="secondary"
                    className="text-xs"
                  >
                    {provider?.name || providerId}
                    <button
                      type="button"
                      onClick={() => handleProviderToggle(providerId)}
                      className="ml-1 hover:text-text-primary"
                      aria-label={`Remove ${provider?.name || providerId} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Payer Multi-Select */}
        <div>
          <Label className="text-sm text-text-secondary mb-2 block" id="payer-filter-label">
            Payers
          </Label>
          <Select open={payerDropdownOpen} onOpenChange={handlePayerDropdownChange}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  filters.payerIds.length > 0
                    ? `${filters.payerIds.length} payer${filters.payerIds.length !== 1 ? 's' : ''} selected`
                    : 'Select payers'
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]" aria-labelledby="payer-filter-label">
              {/* Search Input */}
              <div className="sticky top-0 z-10 bg-surface-elevated border-b border-border-primary px-2 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    type="text"
                    placeholder="Search payers..."
                    value={payerSearchQuery}
                    onChange={(e) => setPayerSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label="Search payers"
                    aria-describedby={filteredPayers.length === 0 ? 'payer-search-results' : undefined}
                  />
                </div>
              </div>
              {/* Filtered Payer List */}
              <div className="max-h-[240px] overflow-y-auto">
                {filteredPayers.length === 0 ? (
                  <div id="payer-search-results" className="px-2 py-4 text-sm text-text-secondary text-center">
                    {payerSearchQuery ? 'No payers found' : 'No payers available'}
                  </div>
                ) : (
                  filteredPayers.map((payer) => (
                    <div
                      key={payer.id}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-surface-interactive cursor-pointer focus:bg-surface-interactive focus:outline-none focus:ring-2 focus:ring-border-focus"
                      onClick={() => handlePayerToggle(payer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePayerToggle(payer.id);
                        }
                      }}
                      role="option"
                      tabIndex={0}
                      aria-selected={filters.payerIds.includes(payer.id)}
                    >
                      <Checkbox
                        checked={filters.payerIds.includes(payer.id)}
                        onCheckedChange={() => handlePayerToggle(payer.id)}
                        aria-label={`Select ${payer.name}`}
                      />
                      <label className="text-sm text-text-primary cursor-pointer flex-1">
                        {payer.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </SelectContent>
          </Select>
          {filters.payerIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.payerIds.map((payerId) => {
                const payer = payers.find((p) => p.id === payerId);
                return (
                  <Badge
                    key={payerId}
                    variant="secondary"
                    className="text-xs"
                  >
                    {payer?.name || payerId}
                    <button
                      type="button"
                      onClick={() => handlePayerToggle(payerId)}
                      className="ml-1 hover:text-text-primary"
                      aria-label={`Remove ${payer?.name || payerId} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Patient Multi-Select */}
        <div>
          <Label className="text-sm text-text-secondary mb-2 block" id="patient-filter-label">
            Patients
          </Label>
          <Select open={patientDropdownOpen} onOpenChange={handlePatientDropdownChange}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  filters.patientIds.length > 0
                    ? `${filters.patientIds.length} patient${filters.patientIds.length !== 1 ? 's' : ''} selected`
                    : 'Select patients'
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]" aria-labelledby="patient-filter-label">
              {/* Search Input */}
              <div className="sticky top-0 z-10 bg-surface-elevated border-b border-border-primary px-2 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    type="text"
                    placeholder="Search patients..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label="Search patients"
                    aria-describedby={filteredPatients.length === 0 ? 'patient-search-results' : undefined}
                  />
                </div>
              </div>
              {/* Filtered Patient List */}
              <div className="max-h-[240px] overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div id="patient-search-results" className="px-2 py-4 text-sm text-text-secondary text-center">
                    {patientSearchQuery ? 'No patients found' : 'No patients available'}
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-surface-interactive cursor-pointer focus:bg-surface-interactive focus:outline-none focus:ring-2 focus:ring-border-focus"
                      onClick={() => handlePatientToggle(patient.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePatientToggle(patient.id);
                        }
                      }}
                      role="option"
                      tabIndex={0}
                      aria-selected={filters.patientIds.includes(patient.id)}
                    >
                      <Checkbox
                        checked={filters.patientIds.includes(patient.id)}
                        onCheckedChange={() => handlePatientToggle(patient.id)}
                        aria-label={`Select ${patient.name}`}
                      />
                      <label className="text-sm text-text-primary cursor-pointer flex-1">
                        {patient.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </SelectContent>
          </Select>
          {filters.patientIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.patientIds.map((patientId) => {
                const patient = patients.find((p) => p.id === patientId);
                return (
                  <Badge
                    key={patientId}
                    variant="secondary"
                    className="text-xs"
                  >
                    {patient?.name || patientId}
                    <button
                      type="button"
                      onClick={() => handlePatientToggle(patientId)}
                      className="ml-1 hover:text-text-primary"
                      aria-label={`Remove ${patient?.name || patientId} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Filter Chips */}
        <div>
          <Label className="text-sm text-text-secondary mb-2 block" id="status-filter-label">
            Status
          </Label>
          <div 
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="status-filter-label"
          >
            {statuses.map((status) => {
              const isSelected = filters.statuses.includes(status);
              return (
                <Badge
                  key={status}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
                    isSelected
                      ? 'bg-interactive-primary text-text-inverse hover:bg-interactive-primary-hover'
                      : 'hover:bg-surface-interactive'
                  )}
                  onClick={() => handleStatusToggle(status)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatusToggle(status);
                    }
                  }}
                  aria-label={`${isSelected ? 'Remove' : 'Add'} ${getStatusLabel(status)} filter`}
                  aria-pressed={isSelected}
                >
                  {getStatusLabel(status)}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}

