import { superadminDb } from '@startkit/database'
import { 
  customers, 
  customerProductOrgLinks,
  productOrgs,
  products,
  platformAuditLogs,
  type CustomerStatus,
  type LinkMethod,
} from '@startkit/database/schema'
import { eq, desc, ilike, count, or } from 'drizzle-orm'

/**
 * Customer list item
 */
export interface CustomerListItem {
  id: string
  name: string
  primaryDomain: string | null
  stripeCustomerId: string | null
  status: CustomerStatus
  createdAt: Date
  linkedProductCount: number
}

/**
 * Linked product org for customer detail
 */
export interface LinkedProductOrg {
  linkId: string
  productId: string
  productName: string
  productDisplayName: string
  productOrgId: string
  externalOrgId: string
  orgName: string
  orgDomain: string | null
  linkMethod: LinkMethod
  linkedAt: Date
}

/**
 * Customer detail with linked orgs
 */
export interface CustomerDetail extends CustomerListItem {
  domains: string[]
  linkedOrgs: LinkedProductOrg[]
}

/**
 * Search parameters for customers list
 */
export interface CustomerSearchParams {
  search?: string
  status?: string
  page?: number
  limit?: number
}

/**
 * Get paginated list of customers
 */
export async function getCustomers(params: CustomerSearchParams = {}) {
  const { search, status, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Build base query
  let query = superadminDb
    .select({
      id: customers.id,
      name: customers.name,
      primaryDomain: customers.primaryDomain,
      stripeCustomerId: customers.stripeCustomerId,
      status: customers.status,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .$dynamic()

  // Apply search filter
  if (search) {
    query = query.where(
      or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.primaryDomain, `%${search}%`)
      )
    )
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.where(eq(customers.status, status as CustomerStatus))
  }

  // Get total count
  const countResult = await superadminDb
    .select({ count: count() })
    .from(customers)

  // Execute query with pagination
  const customersResult = await query
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset)

  // Get linked product counts per customer
  const customerIds = customersResult.map((c) => c.id)
  const linkCounts = customerIds.length > 0
    ? await Promise.all(
        customerIds.map(async (customerId) => {
          const [result] = await superadminDb
            .select({ count: count() })
            .from(customerProductOrgLinks)
            .where(eq(customerProductOrgLinks.customerId, customerId))
          return { customerId, count: result?.count ?? 0 }
        })
      )
    : []

  const linkCountMap = new Map(linkCounts.map((l) => [l.customerId, l.count]))

  const items: CustomerListItem[] = customersResult.map((customer) => ({
    ...customer,
    linkedProductCount: linkCountMap.get(customer.id) || 0,
  }))

  return {
    items,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  }
}

/**
 * Get customer by ID with full details
 */
export async function getCustomerById(id: string): Promise<CustomerDetail | null> {
  const [customer] = await superadminDb
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  if (!customer) {
    return null
  }

  // Get linked product orgs
  const linkedOrgsResult = await superadminDb
    .select({
      linkId: customerProductOrgLinks.id,
      productId: products.id,
      productName: products.name,
      productDisplayName: products.displayName,
      productOrgId: productOrgs.id,
      externalOrgId: productOrgs.externalOrgId,
      orgName: productOrgs.name,
      orgDomain: productOrgs.domain,
      linkMethod: customerProductOrgLinks.linkMethod,
      linkedAt: customerProductOrgLinks.linkedAt,
    })
    .from(customerProductOrgLinks)
    .innerJoin(productOrgs, eq(customerProductOrgLinks.productOrgId, productOrgs.id))
    .innerJoin(products, eq(productOrgs.productId, products.id))
    .where(eq(customerProductOrgLinks.customerId, id))
    .orderBy(desc(customerProductOrgLinks.linkedAt))

  return {
    id: customer.id,
    name: customer.name,
    primaryDomain: customer.primaryDomain,
    domains: (customer.domains as string[]) || [],
    stripeCustomerId: customer.stripeCustomerId,
    status: customer.status,
    createdAt: customer.createdAt,
    linkedProductCount: linkedOrgsResult.length,
    linkedOrgs: linkedOrgsResult,
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(data: {
  name: string
  primaryDomain?: string
  domains?: string[]
  stripeCustomerId?: string
  actorUserId: string
  actorEmail: string
}) {
  const [customer] = await superadminDb
    .insert(customers)
    .values({
      name: data.name,
      primaryDomain: data.primaryDomain,
      domains: data.domains || [],
      stripeCustomerId: data.stripeCustomerId,
      status: 'active',
    })
    .returning()

  if (!customer) {
    throw new Error('Failed to create customer')
  }

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: data.actorUserId,
    actorEmail: data.actorEmail,
    action: 'customer.created',
    resourceType: 'customer',
    resourceId: customer.id,
    customerId: customer.id,
    metadata: {
      name: data.name,
      primaryDomain: data.primaryDomain,
    },
  })

  return customer
}

/**
 * Link a product org to a customer
 */
export async function linkProductOrgToCustomer(data: {
  customerId: string
  productOrgId: string
  linkMethod: LinkMethod
  notes?: string
  actorUserId: string
  actorEmail: string
}) {
  // Check if link already exists
  const [existing] = await superadminDb
    .select({ id: customerProductOrgLinks.id })
    .from(customerProductOrgLinks)
    .where(eq(customerProductOrgLinks.productOrgId, data.productOrgId))
    .limit(1)

  if (existing) {
    throw new Error('Product organization is already linked to a customer')
  }

  const [link] = await superadminDb
    .insert(customerProductOrgLinks)
    .values({
      customerId: data.customerId,
      productOrgId: data.productOrgId,
      linkMethod: data.linkMethod,
      linkedBy: data.actorUserId,
      notes: data.notes,
    })
    .returning()

  if (!link) {
    throw new Error('Failed to create link')
  }

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: data.actorUserId,
    actorEmail: data.actorEmail,
    action: 'customer.org_linked',
    resourceType: 'customer_product_org_link',
    resourceId: link.id,
    customerId: data.customerId,
    metadata: {
      productOrgId: data.productOrgId,
      linkMethod: data.linkMethod,
      notes: data.notes,
    },
  })

  return link
}

/**
 * Unlink a product org from a customer
 */
export async function unlinkProductOrgFromCustomer(
  linkId: string,
  actor: { userId: string; email: string }
) {
  const [link] = await superadminDb
    .select()
    .from(customerProductOrgLinks)
    .where(eq(customerProductOrgLinks.id, linkId))
    .limit(1)

  if (!link) {
    throw new Error('Link not found')
  }

  await superadminDb
    .delete(customerProductOrgLinks)
    .where(eq(customerProductOrgLinks.id, linkId))

  // Log the action
  await superadminDb.insert(platformAuditLogs).values({
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: 'customer.org_unlinked',
    resourceType: 'customer_product_org_link',
    resourceId: linkId,
    customerId: link.customerId,
    metadata: {
      productOrgId: link.productOrgId,
    },
  })
}

/**
 * Get unlinked product orgs (for linking UI)
 */
export async function getUnlinkedProductOrgs(productId?: string) {
  // Get all product orgs that are NOT linked to any customer
  const linkedOrgIds = await superadminDb
    .select({ productOrgId: customerProductOrgLinks.productOrgId })
    .from(customerProductOrgLinks)

  const linkedIds = new Set(linkedOrgIds.map((l) => l.productOrgId))

  let query = superadminDb
    .select({
      id: productOrgs.id,
      productId: productOrgs.productId,
      productName: products.name,
      productDisplayName: products.displayName,
      externalOrgId: productOrgs.externalOrgId,
      name: productOrgs.name,
      domain: productOrgs.domain,
      createdAt: productOrgs.createdAt,
    })
    .from(productOrgs)
    .innerJoin(products, eq(productOrgs.productId, products.id))
    .$dynamic()

  if (productId) {
    query = query.where(eq(productOrgs.productId, productId))
  }

  const result = await query.orderBy(desc(productOrgs.createdAt))

  // Filter out linked orgs
  return result.filter((org) => !linkedIds.has(org.id))
}
