import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { createHIPAAAuditLogger } from "../auditLogger";

/**
 * Migration: Locations to Clinics
 * 
 * This migration unifies the separate `locations` and `clinics` tables into
 * a single `clinics` table. The `clinics` table is the canonical source
 * of truth after migration.
 * 
 * Steps:
 * 1. Create clinic records from existing locations
 * 2. Build a mapping of locationId → clinicId
 * 3. Update all references:
 *    - appointments.locationId → appointments.clinicId
 *    - providerLocations.locationId → providerLocations.clinicId
 *    - providerAvailability.locationId → providerAvailability.clinicId
 *    - patients.preferredLocationId → patients.preferredClinicId
 * 
 * The migration is idempotent - locations that have already been migrated
 * (tracked via migratedFromLocationId) will be skipped.
 */

interface LocationData {
  _id: Id<"locations">;
  name: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  phone?: string;
  type: "office" | "hospital" | "telehealth";
  tenantId: string;
  createdAt: number;
  updatedAt: number;
}

interface MigrationMapping {
  locationId: string;
  clinicId: string;
  locationName: string;
  tenantId: string;
}

/**
 * Preview migration - shows what will be migrated without making changes
 */
export const previewLocationsToClinics = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all locations
    let locations = await ctx.db.query("locations").collect();
    if (args.tenantId) {
      locations = locations.filter(l => l.tenantId === args.tenantId);
    }

    // Get all existing clinics to check for already-migrated locations
    let clinics = await ctx.db.query("clinics").collect();
    if (args.tenantId) {
      clinics = clinics.filter(c => c.tenantId === args.tenantId);
    }

    // Build set of already-migrated location IDs
    const migratedLocationIds = new Set(
      clinics
        .filter(c => c.migratedFromLocationId)
        .map(c => c.migratedFromLocationId)
    );

    // Categorize locations
    const locationsToMigrate: LocationData[] = [];
    const locationsAlreadyMigrated: LocationData[] = [];

    for (const location of locations) {
      if (migratedLocationIds.has(location._id)) {
        locationsAlreadyMigrated.push(location as LocationData);
      } else {
        locationsToMigrate.push(location as LocationData);
      }
    }

    // Count references that will be updated
    let appointments = await ctx.db.query("appointments").collect();
    if (args.tenantId) {
      appointments = appointments.filter(a => a.tenantId === args.tenantId);
    }
    const appointmentsWithLocation = appointments.filter(a => a.locationId && !a.clinicId);

    let providerLocations = await ctx.db.query("providerLocations").collect();
    if (args.tenantId) {
      providerLocations = providerLocations.filter(pl => pl.tenantId === args.tenantId);
    }
    const providerLocationsToUpdate = providerLocations.filter(pl => pl.locationId && !pl.clinicId);

    let providerAvailability = await ctx.db.query("providerAvailability").collect();
    if (args.tenantId) {
      providerAvailability = providerAvailability.filter(pa => pa.tenantId === args.tenantId);
    }
    const providerAvailabilityWithLocation = providerAvailability.filter(pa => pa.locationId && !pa.clinicId);

    let patients = await ctx.db.query("patients").collect();
    if (args.tenantId) {
      patients = patients.filter(p => p.tenantId === args.tenantId);
    }
    const patientsWithPreferredLocation = patients.filter(p => p.preferredLocationId && !p.preferredClinicId);

    return {
      summary: {
        totalLocations: locations.length,
        locationsToMigrate: locationsToMigrate.length,
        locationsAlreadyMigrated: locationsAlreadyMigrated.length,
        existingClinics: clinics.length,
      },
      referencesToUpdate: {
        appointments: appointmentsWithLocation.length,
        providerLocations: providerLocationsToUpdate.length,
        providerAvailability: providerAvailabilityWithLocation.length,
        patients: patientsWithPreferredLocation.length,
      },
      locationsToMigrate: locationsToMigrate.map(l => ({
        id: l._id,
        name: l.name,
        type: l.type,
        tenantId: l.tenantId,
        hasAddress: !!l.address,
        hasPhone: !!l.phone,
      })),
      locationsAlreadyMigrated: locationsAlreadyMigrated.map(l => ({
        id: l._id,
        name: l.name,
        tenantId: l.tenantId,
      })),
    };
  },
});

/**
 * Run the migration - creates clinics from locations and updates all references
 */
export const runLocationsToClinics = mutation({
  args: {
    tenantId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const logger = createHIPAAAuditLogger(ctx);
    const now = Date.now();
    
    const results = {
      clinicsCreated: 0,
      clinicsSkipped: 0,
      appointmentsUpdated: 0,
      providerLocationsUpdated: 0,
      providerAvailabilityUpdated: 0,
      patientsUpdated: 0,
      errors: [] as Array<{ context: string; error: string }>,
    };

    // Build mapping of locationId → clinicId
    const locationToClinicMap = new Map<string, Id<"clinics">>();

    // Step 1: Get all locations
    let locations = await ctx.db.query("locations").collect();
    if (args.tenantId) {
      locations = locations.filter(l => l.tenantId === args.tenantId);
    }

    // Step 2: Get existing clinics to check for already-migrated
    let existingClinics = await ctx.db.query("clinics").collect();
    if (args.tenantId) {
      existingClinics = existingClinics.filter(c => c.tenantId === args.tenantId);
    }

    // Build map of already-migrated locations
    for (const clinic of existingClinics) {
      if (clinic.migratedFromLocationId) {
        locationToClinicMap.set(clinic.migratedFromLocationId, clinic._id);
      }
    }

    // Step 3: Create clinic records for each location not yet migrated
    for (const location of locations) {
      const locationId = location._id as string;
      
      // Skip if already migrated
      if (locationToClinicMap.has(locationId)) {
        results.clinicsSkipped++;
        continue;
      }

      try {
        if (!args.dryRun) {
          const clinicId = await ctx.db.insert("clinics", {
            tenantId: location.tenantId,
            name: location.name,
            address: location.address,
            phone: location.phone,
            type: location.type,
            timezone: undefined, // Will inherit from tenant
            isActive: true,
            migratedFromLocationId: locationId,
            createdAt: location.createdAt,
            updatedAt: now,
          });

          locationToClinicMap.set(locationId, clinicId);

          // Audit log
          await logger.logModification(
            location.tenantId,
            undefined,
            "clinic_migrated_from_location",
            "clinics",
            clinicId,
            {
              sourceLocationId: locationId,
              locationName: location.name,
              locationType: location.type,
            }
          );
        } else {
          // For dry run, use a placeholder ID for mapping
          locationToClinicMap.set(locationId, `dry-run-${locationId}` as Id<"clinics">);
        }

        results.clinicsCreated++;
      } catch (error) {
        results.errors.push({
          context: `Creating clinic from location ${locationId}`,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Step 4: Update appointments
    let appointments = await ctx.db.query("appointments").collect();
    if (args.tenantId) {
      appointments = appointments.filter(a => a.tenantId === args.tenantId);
    }

    for (const appointment of appointments) {
      if (appointment.locationId && !appointment.clinicId) {
        const clinicId = locationToClinicMap.get(appointment.locationId as string);
        if (clinicId && !args.dryRun) {
          try {
            await ctx.db.patch(appointment._id, {
              clinicId,
              updatedAt: now,
            });
            results.appointmentsUpdated++;
          } catch (error) {
            results.errors.push({
              context: `Updating appointment ${appointment._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else if (clinicId) {
          results.appointmentsUpdated++;
        }
      }
    }

    // Step 5: Update providerLocations
    let providerLocations = await ctx.db.query("providerLocations").collect();
    if (args.tenantId) {
      providerLocations = providerLocations.filter(pl => pl.tenantId === args.tenantId);
    }

    for (const pl of providerLocations) {
      if (pl.locationId && !pl.clinicId) {
        const clinicId = locationToClinicMap.get(pl.locationId as string);
        if (clinicId && !args.dryRun) {
          try {
            await ctx.db.patch(pl._id, {
              clinicId,
              updatedAt: now,
            });
            results.providerLocationsUpdated++;
          } catch (error) {
            results.errors.push({
              context: `Updating providerLocation ${pl._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else if (clinicId) {
          results.providerLocationsUpdated++;
        }
      }
    }

    // Step 6: Update providerAvailability
    let providerAvailability = await ctx.db.query("providerAvailability").collect();
    if (args.tenantId) {
      providerAvailability = providerAvailability.filter(pa => pa.tenantId === args.tenantId);
    }

    for (const pa of providerAvailability) {
      if (pa.locationId && !pa.clinicId) {
        const clinicId = locationToClinicMap.get(pa.locationId as string);
        if (clinicId && !args.dryRun) {
          try {
            await ctx.db.patch(pa._id, {
              clinicId,
              updatedAt: now,
            });
            results.providerAvailabilityUpdated++;
          } catch (error) {
            results.errors.push({
              context: `Updating providerAvailability ${pa._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else if (clinicId) {
          results.providerAvailabilityUpdated++;
        }
      }
    }

    // Step 7: Update patients (preferredLocationId → preferredClinicId)
    let patients = await ctx.db.query("patients").collect();
    if (args.tenantId) {
      patients = patients.filter(p => p.tenantId === args.tenantId);
    }

    for (const patient of patients) {
      if (patient.preferredLocationId && !patient.preferredClinicId) {
        const clinicId = locationToClinicMap.get(patient.preferredLocationId as string);
        if (clinicId && !args.dryRun) {
          try {
            await ctx.db.patch(patient._id, {
              preferredClinicId: clinicId,
              updatedAt: now,
            });
            results.patientsUpdated++;
          } catch (error) {
            results.errors.push({
              context: `Updating patient ${patient._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else if (clinicId) {
          results.patientsUpdated++;
        }
      }
    }

    // Log overall migration completion
    if (!args.dryRun && results.clinicsCreated > 0) {
      await logger.logModification(
        args.tenantId || "all-tenants",
        undefined,
        "locations_to_clinics_migration_completed",
        "migration",
        "locations-to-clinics",
        {
          ...results,
          mapping: Array.from(locationToClinicMap.entries()).map(([locId, clinicId]) => ({
            locationId: locId,
            clinicId,
          })),
        }
      );
    }

    return {
      dryRun: args.dryRun || false,
      ...results,
      mappingCount: locationToClinicMap.size,
    };
  },
});

/**
 * Rollback migration - removes clinics that were created from locations
 * and clears clinicId references (but preserves locationId references)
 * 
 * WARNING: This is a destructive operation. Use with caution.
 */
export const rollbackLocationsToClinics = mutation({
  args: {
    tenantId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const results = {
      clinicsDeleted: 0,
      appointmentsReverted: 0,
      providerLocationsReverted: 0,
      providerAvailabilityReverted: 0,
      patientsReverted: 0,
      errors: [] as Array<{ context: string; error: string }>,
    };

    const now = Date.now();

    // Get clinics that were migrated from locations
    let clinics = await ctx.db.query("clinics").collect();
    if (args.tenantId) {
      clinics = clinics.filter(c => c.tenantId === args.tenantId);
    }
    const migratedClinics = clinics.filter(c => c.migratedFromLocationId);

    // Build set of clinic IDs to revert
    const clinicIdsToDelete = new Set(migratedClinics.map(c => c._id));

    // Revert appointments (clear clinicId where it matches a migrated clinic)
    let appointments = await ctx.db.query("appointments").collect();
    if (args.tenantId) {
      appointments = appointments.filter(a => a.tenantId === args.tenantId);
    }

    for (const appointment of appointments) {
      if (appointment.clinicId && clinicIdsToDelete.has(appointment.clinicId)) {
        if (!args.dryRun) {
          try {
            await ctx.db.patch(appointment._id, {
              clinicId: undefined,
              updatedAt: now,
            });
            results.appointmentsReverted++;
          } catch (error) {
            results.errors.push({
              context: `Reverting appointment ${appointment._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else {
          results.appointmentsReverted++;
        }
      }
    }

    // Revert providerLocations
    let providerLocations = await ctx.db.query("providerLocations").collect();
    if (args.tenantId) {
      providerLocations = providerLocations.filter(pl => pl.tenantId === args.tenantId);
    }

    for (const pl of providerLocations) {
      if (pl.clinicId && clinicIdsToDelete.has(pl.clinicId)) {
        if (!args.dryRun) {
          try {
            await ctx.db.patch(pl._id, {
              clinicId: undefined,
              updatedAt: now,
            });
            results.providerLocationsReverted++;
          } catch (error) {
            results.errors.push({
              context: `Reverting providerLocation ${pl._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else {
          results.providerLocationsReverted++;
        }
      }
    }

    // Revert providerAvailability
    let providerAvailability = await ctx.db.query("providerAvailability").collect();
    if (args.tenantId) {
      providerAvailability = providerAvailability.filter(pa => pa.tenantId === args.tenantId);
    }

    for (const pa of providerAvailability) {
      if (pa.clinicId && clinicIdsToDelete.has(pa.clinicId)) {
        if (!args.dryRun) {
          try {
            await ctx.db.patch(pa._id, {
              clinicId: undefined,
              updatedAt: now,
            });
            results.providerAvailabilityReverted++;
          } catch (error) {
            results.errors.push({
              context: `Reverting providerAvailability ${pa._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else {
          results.providerAvailabilityReverted++;
        }
      }
    }

    // Revert patients (clear preferredClinicId where it matches a migrated clinic)
    let patients = await ctx.db.query("patients").collect();
    if (args.tenantId) {
      patients = patients.filter(p => p.tenantId === args.tenantId);
    }

    for (const patient of patients) {
      if (patient.preferredClinicId && clinicIdsToDelete.has(patient.preferredClinicId)) {
        if (!args.dryRun) {
          try {
            await ctx.db.patch(patient._id, {
              preferredClinicId: undefined,
              updatedAt: now,
            });
            results.patientsReverted++;
          } catch (error) {
            results.errors.push({
              context: `Reverting patient ${patient._id}`,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        } else {
          results.patientsReverted++;
        }
      }
    }

    // Delete migrated clinics
    for (const clinic of migratedClinics) {
      if (!args.dryRun) {
        try {
          await ctx.db.delete(clinic._id);
          results.clinicsDeleted++;
        } catch (error) {
          results.errors.push({
            context: `Deleting clinic ${clinic._id}`,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        results.clinicsDeleted++;
      }
    }

    return {
      dryRun: args.dryRun || false,
      ...results,
    };
  },
});

/**
 * Get migration status - check if migration has been run and its current state
 */
export const getMigrationStatus = query({
  args: {
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all locations
    let locations = await ctx.db.query("locations").collect();
    if (args.tenantId) {
      locations = locations.filter(l => l.tenantId === args.tenantId);
    }

    // Get all clinics
    let clinics = await ctx.db.query("clinics").collect();
    if (args.tenantId) {
      clinics = clinics.filter(c => c.tenantId === args.tenantId);
    }

    const migratedClinics = clinics.filter(c => c.migratedFromLocationId);
    const originalClinics = clinics.filter(c => !c.migratedFromLocationId);

    // Check references
    let appointments = await ctx.db.query("appointments").collect();
    if (args.tenantId) {
      appointments = appointments.filter(a => a.tenantId === args.tenantId);
    }
    const appointmentsWithLocationOnly = appointments.filter(a => a.locationId && !a.clinicId);
    const appointmentsWithClinicId = appointments.filter(a => a.clinicId);
    const appointmentsWithBoth = appointments.filter(a => a.locationId && a.clinicId);

    let providerLocations = await ctx.db.query("providerLocations").collect();
    if (args.tenantId) {
      providerLocations = providerLocations.filter(pl => pl.tenantId === args.tenantId);
    }
    const plWithLocationOnly = providerLocations.filter(pl => pl.locationId && !pl.clinicId);
    const plWithClinicId = providerLocations.filter(pl => pl.clinicId);

    // Determine migration status
    const allLocationsMigrated = locations.length === migratedClinics.length;
    const allReferencesMigrated = 
      appointmentsWithLocationOnly.length === 0 && 
      plWithLocationOnly.length === 0;

    let status: "not_started" | "in_progress" | "completed" | "partial";
    if (migratedClinics.length === 0) {
      status = "not_started";
    } else if (allLocationsMigrated && allReferencesMigrated) {
      status = "completed";
    } else if (allLocationsMigrated) {
      status = "partial"; // Clinics migrated but references not fully updated
    } else {
      status = "in_progress";
    }

    return {
      status,
      locations: {
        total: locations.length,
        migrated: migratedClinics.length,
        remaining: locations.length - migratedClinics.length,
      },
      clinics: {
        total: clinics.length,
        migratedFromLocations: migratedClinics.length,
        original: originalClinics.length,
      },
      references: {
        appointments: {
          total: appointments.length,
          withLocationOnly: appointmentsWithLocationOnly.length,
          withClinicId: appointmentsWithClinicId.length,
          withBoth: appointmentsWithBoth.length,
        },
        providerLocations: {
          total: providerLocations.length,
          withLocationOnly: plWithLocationOnly.length,
          withClinicId: plWithClinicId.length,
        },
      },
      recommendation: status === "completed" 
        ? "Migration complete. You can now safely remove location-based code paths."
        : status === "partial"
        ? "Clinics created but some references not yet updated. Run migration again."
        : status === "in_progress"
        ? "Migration partially complete. Run migration again to finish."
        : "Run migration to unify locations and clinics.",
    };
  },
});

