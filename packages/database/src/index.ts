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

export { db, superadminDb, createDbClient, getDb, getSuperadminDb, getPostgresClient } from './client'
// Server-only exports moved to './server' to prevent client bundling issues
// Import tenant functions from '@startkit/database/server' in server code
export * from './schema'
