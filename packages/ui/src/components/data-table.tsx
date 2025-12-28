'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'
import { Input } from './input'
import { Button } from './button'
import { Skeleton } from './skeleton'
import { cn } from '../lib/utils'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc' | null

export interface Column<T> {
  /** Unique identifier for the column */
  id: string
  /** Display header text */
  header: React.ReactNode
  /** Accessor function to get cell value */
  accessorFn?: (row: T) => unknown
  /** Direct key accessor (alternative to accessorFn) */
  accessorKey?: keyof T
  /** Custom cell renderer */
  cell?: (row: T) => React.ReactNode
  /** Enable sorting for this column */
  sortable?: boolean
  /** Custom sort function */
  sortFn?: (a: T, b: T, direction: SortDirection) => number
  /** Enable filtering for this column */
  filterable?: boolean
  /** Column width class */
  className?: string
}

export interface DataTableProps<T> extends VariantProps<typeof dataTableVariants> {
  /** Data to display in the table */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Unique key accessor for each row */
  getRowKey: (row: T) => string | number
  /** Show loading skeleton */
  loading?: boolean
  /** Number of skeleton rows to show when loading */
  loadingRows?: number
  /** Enable global search filter */
  searchable?: boolean
  /** Placeholder text for search input */
  searchPlaceholder?: string
  /** Columns to search in (defaults to all filterable columns) */
  searchColumns?: string[]
  /** Called when row is clicked */
  onRowClick?: (row: T) => void
  /** Empty state message */
  emptyMessage?: React.ReactNode
  /** Additional className for container */
  className?: string
  /** Sticky header */
  stickyHeader?: boolean
}

// -----------------------------------------------------------------------------
// Variants
// -----------------------------------------------------------------------------

const dataTableVariants = cva('', {
  variants: {
    size: {
      sm: '[&_th]:h-8 [&_th]:text-xs [&_td]:py-1.5 [&_td]:text-sm',
      default: '',
      lg: '[&_th]:h-12 [&_th]:text-sm [&_td]:py-3 [&_td]:text-base',
    },
    density: {
      compact: '[&_td]:px-2 [&_th]:px-2',
      default: '',
      comfortable: '[&_td]:px-4 [&_th]:px-4',
    },
  },
  defaultVariants: {
    size: 'default',
    density: 'default',
  },
})

// -----------------------------------------------------------------------------
// Sort Icon Component
// -----------------------------------------------------------------------------

function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <span className="ml-1 inline-flex flex-col">
      <svg
        className={cn(
          'h-2 w-2 -mb-0.5',
          direction === 'asc' ? 'text-foreground' : 'text-muted-foreground/40'
        )}
        fill="currentColor"
        viewBox="0 0 8 4"
      >
        <path d="M4 0L8 4H0L4 0Z" />
      </svg>
      <svg
        className={cn(
          'h-2 w-2',
          direction === 'desc' ? 'text-foreground' : 'text-muted-foreground/40'
        )}
        fill="currentColor"
        viewBox="0 0 8 4"
      >
        <path d="M4 4L0 0H8L4 4Z" />
      </svg>
    </span>
  )
}

// -----------------------------------------------------------------------------
// DataTable Component
// -----------------------------------------------------------------------------

/**
 * DataTable component with sorting and filtering capabilities.
 * Built on top of the base Table components with added functionality.
 *
 * @example
 * ```tsx
 * const columns = [
 *   { id: 'name', header: 'Name', accessorKey: 'name', sortable: true },
 *   { id: 'email', header: 'Email', accessorKey: 'email', filterable: true },
 *   { id: 'status', header: 'Status', cell: (row) => <Badge>{row.status}</Badge> },
 * ]
 *
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   getRowKey={(row) => row.id}
 *   searchable
 *   onRowClick={(user) => router.push(`/users/${user.id}`)}
 * />
 * ```
 */
function DataTable<T>({
  data,
  columns,
  getRowKey,
  loading = false,
  loadingRows = 5,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchColumns,
  onRowClick,
  emptyMessage = 'No results found.',
  className,
  stickyHeader = false,
  size,
  density,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Get cell value from row
  const getCellValue = React.useCallback(
    (row: T, column: Column<T>): unknown => {
      if (column.accessorFn) {
        return column.accessorFn(row)
      }
      if (column.accessorKey) {
        return row[column.accessorKey]
      }
      return null
    },
    []
  )

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data

    const query = searchQuery.toLowerCase()
    const columnsToSearch = searchColumns
      ? columns.filter((col) => searchColumns.includes(col.id))
      : columns.filter((col) => col.filterable !== false)

    return data.filter((row) =>
      columnsToSearch.some((column) => {
        const value = getCellValue(row, column)
        if (value == null) return false
        return String(value).toLowerCase().includes(query)
      })
    )
  }, [data, searchQuery, columns, searchColumns, getCellValue])

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData

    const column = columns.find((col) => col.id === sortColumn)
    if (!column) return filteredData

    return [...filteredData].sort((a, b) => {
      if (column.sortFn) {
        return column.sortFn(a, b, sortDirection)
      }

      const aValue = getCellValue(a, column)
      const bValue = getCellValue(b, column)

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1

      // Compare values
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortColumn, sortDirection, columns, getCellValue])

  // Handle sort click
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }

  // Render loading skeleton
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {searchable && <Skeleton className="h-9 w-64" />}
        <div className="rounded-md border">
          <Table className={cn(dataTableVariants({ size, density }))}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id} className={column.className}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      <Skeleton className="h-4 w-full max-w-[200px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      {searchable && (
        <div className="flex items-center">
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="ml-2"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table className={cn(dataTableVariants({ size, density }))}>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center font-medium hover:text-foreground transition-colors"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.header}
                      <SortIcon
                        direction={sortColumn === column.id ? sortDirection : null}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={getRowKey(row)}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell
                        ? column.cell(row)
                        : String(getCellValue(row, column) ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          {sortedData.length} of {data.length} result{data.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'

export { DataTable, dataTableVariants }
