/**
 * Database schema definitions
 *
 * @ai-context Schema changes require migration.
 * Run `pnpm db:generate` after modifying schemas.
 */

export * from './users'
export * from './organizations'
export * from './subscriptions'
export * from './audit-logs'
export * from './healthcare'
// export * from './feature-flags' // Table not found
export * from './kill-switches'

// Export control-plane selectively to avoid conflicts with ./subscriptions (subscriptionStatusEnum)
export {
  productEnvEnum,
  productStatusEnum,
  customerStatusEnum,
  linkMethodEnum,
  products,
  productKeys,
  customers,
  productOrgs,
  customerProductOrgLinks,
  productSubscriptions,
  billingIntervalEnum,
  billingEventTypeEnum,
  billingEvents,
  platformAuditLogs,
  productsRelations,
  productKeysRelations,
  customersRelations,
  productOrgsRelations,
  customerProductOrgLinksRelations,
  productSubscriptionsRelations,
  billingEventsRelations,
} from './control-plane'
