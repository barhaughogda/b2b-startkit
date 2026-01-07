# Legacy Cleanup Report - Zenthea App

## 1. Summary of Archived Items
The legacy repository for `apps/zenthea` has been cleaned up to prepare for future migration. A total of 18 directories and files were identified as deprecated, unused, or experimental and have been moved to the `/archive` directory at the app root.

### Archive Structure:
- `archive/deprecated-routes`: Contains routes that are no longer active in the current routing model.
- `archive/old-routing-model`: Contains API endpoints belonging to previous routing paradigms.
- `archive/unused-features`: Contains features, components, and endpoints that are no longer referenced by the main application.
- `archive/experiments`: Contains internal testing routes and debug API endpoints.

## 2. Inventory of Archived Items

### Deprecated Routes
- `src/app/admin`: Redirected to `/company` by middleware.
- `src/app/provider`: Redirected to `/company` by middleware.

### Old Routing Model
- `src/app/api/admin`: Legacy administrative API endpoints, superseded by modern alternatives or unreferenced.

### Unused Features & Components
- `src/app/tenant-demo`: Abandoned multi-tenant demo page.
- `src/app/tenant-demo-public`: Abandoned public demo page.
- `src/app/page_new.tsx`: Superseded by `page.tsx`.
- `src/components/ConvexTest.tsx`: Experimental component, no active references.
- `src/components/DemoBanner.tsx`: Unused UI element.
- `src/components/admin`: Entire folder of admin-related components.
- `archive/tests`: Corresponding unit and integration tests for archived components and routes to ensure repo-wide build and test integrity.
- `src/app/api/upload-avatar`: Unreferenced API endpoint.
- `src/app/api/current-hero-image`: Unreferenced API endpoint.
- `src/app/api/latest-hero-image`: Unreferenced API endpoint.

### Experiments & Debugging
- `src/app/(test)`: Internal UI testing routes.
- `src/app/api/debug-s3-hero`: S3 integration debugging endpoint.
- `src/app/api/debug-upload`: Upload logic debugging endpoint.
- `src/app/api/test-env`: Environment verification endpoint.
- `src/app/api/upload-test`: Testing endpoint for upload functionality.

## 3. Active Areas (Baseline)
The following areas remain active and constitute the intentional baseline for migration:
- **Core Routes**: `src/app/company`, `src/app/clinic`, `src/app/patient`, `src/app/superadmin`, `src/app/auth`.
- **Primary APIs**: `src/app/api/company`, `src/app/api/clinic`, `src/app/api/auth`, `src/app/api/superadmin`.
- **Shared Infrastructure**: `src/components/ui`, `src/lib`, `src/hooks`, `src/stores`.

## 4. Ambiguous Items (Notes)
- **`/demo` role**: While the `/demo` dashboard is basic, it remains in place as it is referenced in role-based redirection logic within `auth-constants.ts`.
- **`/api/upload-chunked`**: This endpoint is currently unreferenced in the frontend but is recommended in internal comments for large file handling; it has been left in place to avoid breaking potential future integrations.

## 5. Integrity Statement
I confirm that no runtime behavior was changed during this cleanup. Relocation was performed only for items with no active references in the application's runtime code path. Routing behavior remains consistent with the existing middleware logic.

**Staff Engineer Signature:** Zenthea Cleanup Agent
**Date:** January 7, 2026
