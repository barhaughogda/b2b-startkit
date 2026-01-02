'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * Configuration for a table column
 * @template T - The type of data objects in the table
 */
export interface Column<T> {
  /** The key from the data object to display in this column, or a virtual key (e.g., "actions") */
  key: keyof T | string;
  /** Display label for the column header */
  label: string | React.ReactNode;
  /** Whether this column can be sorted */
  sortable?: boolean;
  /** Whether this column can be filtered */
  filterable?: boolean;
  /** Custom render function for the cell content */
  render?: (value: any, row: T) => React.ReactNode;
}

/**
 * Configuration for a filter option
 */
export interface FilterOption {
  /** The key from the data object to filter on */
  key: string;
  /** Display label for the filter */
  label: string;
  /** Type of filter (select dropdown or date range) */
  type: 'select' | 'date-range';
  /** Options for select-type filters */
  options?: { value: string; label: string }[];
}

/**
 * Props for the DataTable component
 * @template T - The type of data objects in the table
 */
export interface DataTableProps<T> {
  /** Array of data objects to display in the table */
  data: T[];
  /** Column configuration for the table */
  columns: Column<T>[];
  /** Keys to search when user types in search box */
  searchKeys?: (keyof T)[];
  /** Available filter options */
  filterOptions?: FilterOption[];
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Label for the entity type (e.g., "patients", "users") */
  entityLabel?: string;
  /** Custom actions to display next to search and filter controls */
  customActions?: React.ReactNode;
}

/**
 * A generic, reusable data table component with sorting, filtering, and search capabilities
 * 
 * @template T - The type of data objects in the table
 * @param props - DataTable configuration props
 * @returns A fully functional data table with search, filter, and sort capabilities
 * 
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'name', label: 'Name', sortable: true },
 *   { key: 'email', label: 'Email', sortable: true },
 * ];
 * 
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   searchKeys={['name', 'email']}
 *   onRowClick={(user) => console.log('Clicked:', user)}
 * />
 * ```
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys,
  filterOptions = [],
  onRowClick,
  className,
  searchPlaceholder = 'Search...',
  entityLabel = 'records',
  customActions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [dateFilters, setDateFilters] = useState<Record<string, { from: string; to: string }>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchQuery && searchKeys) {
      filtered = filtered.filter((item) =>
        searchKeys.some((key) =>
          String(item[key]).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([filterKey, selectedValues]) => {
      if (selectedValues.length > 0) {
        filtered = filtered.filter((item) =>
          selectedValues.includes(String(item[filterKey]))
        );
      }
    });

    // Apply date range filters
    Object.entries(dateFilters).forEach(([filterKey, dateRange]) => {
      if (dateRange.from || dateRange.to) {
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item[filterKey]);
          const fromDate = dateRange.from ? new Date(dateRange.from) : null;
          const toDate = dateRange.to ? new Date(dateRange.to) : null;
          
          // Validate dates - skip filtering if dates are invalid
          if (fromDate && isNaN(fromDate.getTime())) {
            console.warn(`Invalid from date for filter ${filterKey}: ${dateRange.from}`);
            return true;
          }
          if (toDate && isNaN(toDate.getTime())) {
            console.warn(`Invalid to date for filter ${filterKey}: ${dateRange.to}`);
            return true;
          }
          if (isNaN(itemDate.getTime())) {
            // If item date is invalid, exclude it from results
            return false;
          }
          
          if (fromDate && toDate) {
            return itemDate >= fromDate && itemDate <= toDate;
          } else if (fromDate) {
            return itemDate >= fromDate;
          } else if (toDate) {
            return itemDate <= toDate;
          }
          return true;
        });
      }
    });

    return filtered;
  }, [data, searchQuery, searchKeys, filters, dateFilters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      // Type assertion needed because key could be a string (for virtual columns)
      const sortKey = sortConfig.key as keyof T;
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Undefined last
      const aU = aValue === undefined || aValue === null;
      const bU = bValue === undefined || bValue === null;
      if (aU !== bU) return aU ? 1 : -1;
      if (aU && bU) return 0;

      // String compare (case-insensitive)
      const aS = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
      const bS = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

      if (aS < bS) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aS > bS) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key: keyof T | string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: prev[filterKey]?.includes(value)
        ? prev[filterKey].filter((v) => v !== value)
        : [...(prev[filterKey] || []), value],
    }));
  };

  const handleDateFilterChange = (filterKey: string, field: 'from' | 'to', value: string) => {
    setDateFilters((prev) => {
      const current = prev[filterKey] || { from: '', to: '' };
      return {
        ...prev,
        [filterKey]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const clearFilters = () => {
    setFilters({});
    setDateFilters({});
    setSearchQuery('');
  };

  const activeFiltersCount = Object.values(filters).reduce(
    (total, values) => total + values.length,
    0
  ) + Object.values(dateFilters).filter(dateRange => dateRange.from || dateRange.to).length;

  return (
    <div className={className}>
      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {(searchQuery || activeFiltersCount > 0) && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
        {customActions}
      </div>

      {/* Filter Options */}
      {showFilters && filterOptions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filter Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterOptions.map((filter) => (
                <div key={filter.key}>
                  <label className="text-sm font-medium mb-2 block">
                    {filter.label}
                  </label>
                  {filter.type === 'select' && filter.options && (
                    <div className="space-y-2">
                      {filter.options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${filter.key}-${option.value}`}
                            checked={filters[filter.key]?.includes(option.value) || false}
                            onCheckedChange={() =>
                              handleFilterChange(filter.key, option.value)
                            }
                          />
                          <label
                            htmlFor={`${filter.key}-${option.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {filter.type === 'date-range' && (
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`${filter.key}-from`} className="text-xs text-muted-foreground">
                          From
                        </Label>
                        <Input
                          id={`${filter.key}-from`}
                          type="date"
                          value={dateFilters[filter.key]?.from || ''}
                          onChange={(e) => handleDateFilterChange(filter.key, 'from', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${filter.key}-to`} className="text-xs text-muted-foreground">
                          To
                        </Label>
                        <Input
                          id={`${filter.key}-to`}
                          type="date"
                          value={dateFilters[filter.key]?.to || ''}
                          onChange={(e) => handleDateFilterChange(filter.key, 'to', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                  aria-sort={
                    column.sortable
                      ? sortConfig.key === column.key
                        ? sortConfig.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchQuery || activeFiltersCount > 0
                      ? `No ${entityLabel} found matching your criteria`
                      : `No ${entityLabel} found`}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, index) => {
                // Use stable identifier from row data, fallback to index
                const rowKey = (row as any).id || (row as any).key || `row-${index}`;
                return (
                <TableRow
                  key={rowKey}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={(e) => {
                    if (!onRowClick) return;
                    const target = e.target as HTMLElement;
                    if (target.closest('button,a,input,select,textarea,[role="button"],[role="menuitem"],[data-prevent-row-click]')) {
                      return;
                    }
                    onRowClick(row);
                  }}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(
                            (column.key as keyof T) in row ? row[column.key as keyof T] : undefined,
                            row
                          )
                        : (column.key as keyof T) in row && row[column.key as keyof T] !== undefined && row[column.key as keyof T] !== null
                        ? String(row[column.key as keyof T])
                        : ''}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Results Summary */}
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {sortedData.length} of {data.length} {entityLabel}
        {(searchQuery || activeFiltersCount > 0) && ' (filtered)'}
      </div>
    </div>
  );
}
