/**
 * @startkit/database
 *
 * Database layer with Drizzle ORM and Supabase.
 * Implements multi-tenancy via Row-Level Security (RLS).
 *
 * @ai-context This package provides:
 * - Database client with connection pooling
 * - Schema definitions for core entities
 * - Tenant-aware query helpers
 * - Migration utilities
 *
 * CRITICAL: All tenant-scoped queries MUST use withTenant() wrapper
 *
 * @ai-no-modify Schema and RLS changes require security review
 */

export { db, createDbClient } from './client'
export { withTenant, getTenantContext } from './tenant'
export * from './schema'
