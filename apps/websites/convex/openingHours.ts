import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { verifyClinicUserAccess } from './utils/authorization'

// Day of week type for consistency
const dayOfWeekValidator = v.union(
  v.literal('monday'),
  v.literal('tuesday'),
  v.literal('wednesday'),
  v.literal('thursday'),
  v.literal('friday'),
  v.literal('saturday'),
  v.literal('sunday')
)

type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get company-level opening hours (clinicId = undefined)
 */
export const getCompanyOpeningHours = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', undefined)
      )
      .collect()

    return {
      recurring: hours.filter((h) => h.isRecurring),
      overrides: hours.filter((h) => !h.isRecurring),
    }
  },
})

/**
 * Get clinic-specific opening hours
 */
export const getClinicOpeningHours = query({
  args: {
    tenantId: v.string(),
    clinicId: v.id('clinics'),
  },
  handler: async (ctx, args) => {
    const hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', args.clinicId)
      )
      .collect()

    return {
      recurring: hours.filter((h) => h.isRecurring),
      overrides: hours.filter((h) => !h.isRecurring),
    }
  },
})

/**
 * Get effective opening hours for a clinic (clinic-specific or company defaults)
 * This resolves the inheritance chain.
 */
export const getEffectiveOpeningHours = query({
  args: {
    tenantId: v.string(),
    clinicId: v.id('clinics'),
  },
  handler: async (ctx, args) => {
    // Get clinic-specific hours
    const clinicHours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', args.clinicId)
      )
      .collect()

    // Get company-level hours (clinicId = undefined)
    const companyHours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', undefined)
      )
      .collect()

    // Separate recurring and overrides for both levels
    const clinicRecurring = clinicHours.filter((h) => h.isRecurring)
    const clinicOverrides = clinicHours.filter((h) => !h.isRecurring)
    const companyRecurring = companyHours.filter((h) => h.isRecurring)
    const companyOverrides = companyHours.filter((h) => !h.isRecurring)

    // Check if clinic has its own recurring schedule
    const hasClinicRecurring = clinicRecurring.length > 0

    // Build effective schedule:
    // - If clinic has recurring hours, use those; otherwise use company recurring
    // - Clinic overrides take precedence over company overrides for same date
    const effectiveRecurring = hasClinicRecurring
      ? clinicRecurring
      : companyRecurring.map((h) => ({ ...h, inherited: true }))

    // Merge overrides - clinic takes precedence for same date
    const clinicOverrideDates = new Set(
      clinicOverrides.map((h) => h.overrideDate)
    )
    const effectiveOverrides = [
      ...clinicOverrides,
      ...companyOverrides
        .filter((h) => !clinicOverrideDates.has(h.overrideDate))
        .map((h) => ({ ...h, inherited: true })),
    ]

    return {
      recurring: effectiveRecurring,
      overrides: effectiveOverrides,
      source: hasClinicRecurring ? 'clinic' : 'company',
    }
  },
})

/**
 * Get all opening hours for a tenant (both company and all clinics)
 */
export const getAllOpeningHours = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant', (q) => q.eq('tenantId', args.tenantId))
      .collect()

    // Group by clinic
    const companyHours = hours.filter((h) => !h.clinicId)
    const clinicHoursMap = new Map<string, (typeof hours)[0][]>()

    for (const hour of hours) {
      if (hour.clinicId) {
        const clinicId = hour.clinicId as string
        if (!clinicHoursMap.has(clinicId)) {
          clinicHoursMap.set(clinicId, [])
        }
        clinicHoursMap.get(clinicId)!.push(hour)
      }
    }

    return {
      company: {
        recurring: companyHours.filter((h) => h.isRecurring),
        overrides: companyHours.filter((h) => !h.isRecurring),
      },
      clinics: Object.fromEntries(
        Array.from(clinicHoursMap.entries()).map(([clinicId, hours]) => [
          clinicId,
          {
            recurring: hours.filter((h) => h.isRecurring),
            overrides: hours.filter((h) => !h.isRecurring),
          },
        ])
      ),
    }
  },
})

/**
 * Get opening hours for a specific date range
 * Returns effective hours for each date in the range, considering overrides
 */
export const getOpeningHoursForDateRange = query({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    // Get all relevant hours
    const targetClinicId = args.clinicId ?? undefined

    const hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', targetClinicId)
      )
      .collect()

    // If clinic-specific and no hours found, fall back to company
    let effectiveHours = hours
    if (args.clinicId && hours.length === 0) {
      effectiveHours = await ctx.db
        .query('openingHours')
        .withIndex('by_tenant_clinic', (q) =>
          q.eq('tenantId', args.tenantId).eq('clinicId', undefined)
        )
        .collect()
    }

    return {
      recurring: effectiveHours.filter((h) => h.isRecurring),
      overrides: effectiveHours.filter(
        (h) =>
          !h.isRecurring &&
          h.overrideDate &&
          h.overrideDate >= args.startDate &&
          h.overrideDate <= args.endDate
      ),
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Set opening hours for a day (company or clinic level)
 * Creates or updates the entry for the specified day.
 */
export const setDayOpeningHours = mutation({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
    userEmail: v.string(),
    dayOfWeek: dayOfWeekValidator,
    startTime: v.string(), // HH:mm format
    endTime: v.string(), // HH:mm format
    isClosed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // If clinicId is provided, verify clinic belongs to tenant
    if (args.clinicId) {
      const clinic = await ctx.db.get(args.clinicId);
      if (!clinic || clinic.tenantId !== args.tenantId) {
        throw new Error("Clinic not found or does not belong to tenant");
      }
    }

    const now = Date.now()

    // Find existing entry for this day
    const existing = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic_day', (q) =>
        q
          .eq('tenantId', args.tenantId)
          .eq('clinicId', args.clinicId ?? undefined)
          .eq('dayOfWeek', args.dayOfWeek)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .first()

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        startTime: args.startTime,
        endTime: args.endTime,
        isClosed: args.isClosed ?? false,
        updatedAt: now,
      })
      return existing._id
    } else {
      // Create new entry
      return await ctx.db.insert('openingHours', {
        tenantId: args.tenantId,
        clinicId: args.clinicId,
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
        isRecurring: true,
        isClosed: args.isClosed ?? false,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

/**
 * Set complete weekly schedule at once
 */
export const setWeeklySchedule = mutation({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
    userEmail: v.string(),
    schedule: v.array(
      v.object({
        dayOfWeek: dayOfWeekValidator,
        startTime: v.string(),
        endTime: v.string(),
        isClosed: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // If clinicId is provided, verify clinic belongs to tenant
    if (args.clinicId) {
      const clinic = await ctx.db.get(args.clinicId);
      if (!clinic || clinic.tenantId !== args.tenantId) {
        throw new Error("Clinic not found or does not belong to tenant");
      }
    }

    const now = Date.now()

    // Delete existing recurring schedule for this entity
    const existingHours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q
          .eq('tenantId', args.tenantId)
          .eq('clinicId', args.clinicId ?? undefined)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .collect()

    for (const hour of existingHours) {
      await ctx.db.delete(hour._id)
    }

    // Insert new schedule
    const insertedIds: Id<'openingHours'>[] = []
    for (const entry of args.schedule) {
      const id = await ctx.db.insert('openingHours', {
        tenantId: args.tenantId,
        clinicId: args.clinicId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        isRecurring: true,
        isClosed: entry.isClosed ?? false,
        createdAt: now,
        updatedAt: now,
      })
      insertedIds.push(id)
    }

    return insertedIds
  },
})

/**
 * Remove opening hours for a specific day
 */
export const removeDayOpeningHours = mutation({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
    userEmail: v.string(),
    dayOfWeek: dayOfWeekValidator,
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // If clinicId is provided, verify clinic belongs to tenant
    if (args.clinicId) {
      const clinic = await ctx.db.get(args.clinicId);
      if (!clinic || clinic.tenantId !== args.tenantId) {
        throw new Error("Clinic not found or does not belong to tenant");
      }
    }
    const existing = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic_day', (q) =>
        q
          .eq('tenantId', args.tenantId)
          .eq('clinicId', args.clinicId ?? undefined)
          .eq('dayOfWeek', args.dayOfWeek)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return true
    }
    return false
  },
})

/**
 * Add a date-specific override (special hours or closure)
 */
export const addDateOverride = mutation({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
    userEmail: v.string(),
    overrideDate: v.string(), // YYYY-MM-DD
    startTime: v.optional(v.string()), // HH:mm format (optional if closed)
    endTime: v.optional(v.string()), // HH:mm format (optional if closed)
    isClosed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // If clinicId is provided, verify clinic belongs to tenant
    if (args.clinicId) {
      const clinic = await ctx.db.get(args.clinicId);
      if (!clinic || clinic.tenantId !== args.tenantId) {
        throw new Error("Clinic not found or does not belong to tenant");
      }
    }

    const now = Date.now()

    // Validate: either have times or be closed
    if (!args.isClosed && (!args.startTime || !args.endTime)) {
      throw new Error('Start and end times are required unless marking as closed')
    }

    // Get the day of week from the date
    const date = new Date(args.overrideDate + 'T12:00:00Z')
    const days: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
    const dayOfWeek = days[date.getUTCDay()]

    // Check for existing override on this date
    const existing = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_override_date', (q) =>
        q.eq('tenantId', args.tenantId).eq('overrideDate', args.overrideDate)
      )
      .filter((q) =>
        q.eq(q.field('clinicId'), args.clinicId ?? undefined)
      )
      .first()

    if (existing) {
      // Update existing override
      await ctx.db.patch(existing._id, {
        startTime: args.startTime ?? '00:00',
        endTime: args.endTime ?? '00:00',
        isClosed: args.isClosed ?? false,
        updatedAt: now,
      })
      return existing._id
    } else {
      // Create new override
      return await ctx.db.insert('openingHours', {
        tenantId: args.tenantId,
        clinicId: args.clinicId,
        dayOfWeek,
        startTime: args.startTime ?? '00:00',
        endTime: args.endTime ?? '00:00',
        isRecurring: false,
        overrideDate: args.overrideDate,
        isClosed: args.isClosed ?? false,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

/**
 * Remove a date-specific override
 */
export const removeDateOverride = mutation({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
    userEmail: v.string(),
    overrideDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // If clinicId is provided, verify clinic belongs to tenant
    if (args.clinicId) {
      const clinic = await ctx.db.get(args.clinicId);
      if (!clinic || clinic.tenantId !== args.tenantId) {
        throw new Error("Clinic not found or does not belong to tenant");
      }
    }
    const existing = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_override_date', (q) =>
        q.eq('tenantId', args.tenantId).eq('overrideDate', args.overrideDate)
      )
      .filter((q) =>
        q.eq(q.field('clinicId'), args.clinicId ?? undefined)
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return true
    }
    return false
  },
})

/**
 * Clear all opening hours for a clinic (to reset to company defaults)
 */
export const clearClinicOpeningHours = mutation({
  args: {
    tenantId: v.string(),
    clinicId: v.id('clinics'),
    userEmail: v.string(),
    clearOverridesOnly: v.optional(v.boolean()), // If true, only clear overrides, keep recurring
  },
  handler: async (ctx, args) => {
    // Verify user has access to this tenant
    const authResult = await verifyClinicUserAccess(ctx, args.userEmail, args.tenantId);
    if (!authResult.authorized) {
      throw new Error(authResult.error || "Unauthorized");
    }

    // Verify clinic belongs to tenant
    const clinic = await ctx.db.get(args.clinicId);
    if (!clinic || clinic.tenantId !== args.tenantId) {
      throw new Error("Clinic not found or does not belong to tenant");
    }
    const hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', args.clinicId)
      )
      .collect()

    let deleted = 0
    for (const hour of hours) {
      if (args.clearOverridesOnly && hour.isRecurring) {
        continue
      }
      await ctx.db.delete(hour._id)
      deleted++
    }

    return { deleted }
  },
})

// ============================================================================
// UTILITY QUERIES
// ============================================================================

/**
 * Check if a clinic has custom opening hours
 */
export const hasCustomOpeningHours = query({
  args: {
    tenantId: v.string(),
    clinicId: v.id('clinics'),
  },
  handler: async (ctx, args) => {
    const hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', args.clinicId)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .first()

    return hours !== null
  },
})

/**
 * Get a formatted summary of opening hours for display
 * Returns human-readable format like "Mon-Fri: 9:00 AM - 5:00 PM"
 */
export const getOpeningHoursSummary = query({
  args: {
    tenantId: v.string(),
    clinicId: v.optional(v.id('clinics')),
  },
  handler: async (ctx, args) => {
    // Get effective hours
    const targetClinicId = args.clinicId ?? undefined

    let hours = await ctx.db
      .query('openingHours')
      .withIndex('by_tenant_clinic', (q) =>
        q.eq('tenantId', args.tenantId).eq('clinicId', targetClinicId)
      )
      .filter((q) => q.eq(q.field('isRecurring'), true))
      .collect()

    // Fall back to company hours if clinic-specific and none found
    if (args.clinicId && hours.length === 0) {
      hours = await ctx.db
        .query('openingHours')
        .withIndex('by_tenant_clinic', (q) =>
          q.eq('tenantId', args.tenantId).eq('clinicId', undefined)
        )
        .filter((q) => q.eq(q.field('isRecurring'), true))
        .collect()
    }

    if (hours.length === 0) {
      return null
    }

    // Build day-indexed map
    const dayOrder: DayOfWeek[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]

    const dayMap = new Map(hours.map((h) => [h.dayOfWeek, h]))

    // Group consecutive days with same hours
    const groups: { days: DayOfWeek[]; startTime: string; endTime: string; isClosed: boolean }[] = []
    let currentGroup: { days: DayOfWeek[]; startTime: string; endTime: string; isClosed: boolean } | null = null

    for (const day of dayOrder) {
      const entry = dayMap.get(day)
      if (!entry) continue

      const isClosed = entry.isClosed ?? false

      if (
        currentGroup &&
        currentGroup.startTime === entry.startTime &&
        currentGroup.endTime === entry.endTime &&
        currentGroup.isClosed === isClosed
      ) {
        currentGroup.days.push(day)
      } else {
        if (currentGroup) {
          groups.push(currentGroup)
        }
        currentGroup = {
          days: [day],
          startTime: entry.startTime,
          endTime: entry.endTime,
          isClosed,
        }
      }
    }
    if (currentGroup) {
      groups.push(currentGroup)
    }

    // Format each group
    const dayLabels: Record<DayOfWeek, string> = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    }

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      const suffix = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${suffix}`
    }

    const formatDayRange = (days: DayOfWeek[]) => {
      if (days.length === 1) {
        return dayLabels[days[0]]
      }
      return `${dayLabels[days[0]]}-${dayLabels[days[days.length - 1]]}`
    }

    const lines = groups.map((group) => {
      const dayRange = formatDayRange(group.days)
      if (group.isClosed) {
        return `${dayRange}: Closed`
      }
      return `${dayRange}: ${formatTime(group.startTime)} - ${formatTime(group.endTime)}`
    })

    return {
      lines,
      summary: lines.join(', '),
      hasHours: true,
    }
  },
})

