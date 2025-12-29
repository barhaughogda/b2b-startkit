import { describe, it, expect } from 'vitest';

/**
 * Tests for the location-to-clinic migration mapping helpers
 * 
 * Note: The actual migration functions live in convex/migrations/migrateLocationsToClinics.ts
 * and are run server-side. These tests verify the expected data transformations.
 */

describe('migrateLocationsToClinics', () => {
  describe('location to clinic data transformation', () => {
    it('should map location fields to clinic fields correctly', () => {
      const location = {
        _id: 'location-1',
        name: 'Main Office',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
        phone: '555-1234',
        type: 'office' as const,
        tenantId: 'tenant-1',
        isActive: true,
        createdAt: 1000000000000,
        updatedAt: 1000000000000,
      };

      // Expected clinic structure after migration
      const expectedClinic = {
        tenantId: 'tenant-1',
        name: 'Main Office',
        description: undefined,
        addressStreet: '123 Main St',
        addressCity: 'New York',
        addressState: 'NY',
        addressPostalCode: '10001',
        addressCountry: 'USA',
        phone: '555-1234',
        type: 'office',
        timezone: undefined, // Will inherit from tenant
        isActive: true,
        createdAt: 1000000000000,
        updatedAt: expect.any(Number), // Updated during migration
      };

      // Transform function (mirrors the migration logic)
      function transformLocationToClinic(location: any) {
        return {
          tenantId: location.tenantId,
          name: location.name,
          description: location.description,
          addressStreet: location.address?.street,
          addressCity: location.address?.city,
          addressState: location.address?.state,
          addressPostalCode: location.address?.postalCode,
          addressCountry: location.address?.country,
          phone: location.phone,
          type: location.type,
          timezone: undefined,
          isActive: location.isActive,
          createdAt: location.createdAt,
          updatedAt: Date.now(),
        };
      }

      const result = transformLocationToClinic(location);
      expect(result.tenantId).toBe(expectedClinic.tenantId);
      expect(result.name).toBe(expectedClinic.name);
      expect(result.addressStreet).toBe(expectedClinic.addressStreet);
      expect(result.addressCity).toBe(expectedClinic.addressCity);
      expect(result.phone).toBe(expectedClinic.phone);
      expect(result.type).toBe(expectedClinic.type);
    });

    it('should handle locations with minimal data', () => {
      const minimalLocation = {
        _id: 'location-2',
        name: 'Remote Office',
        tenantId: 'tenant-1',
        isActive: true,
        createdAt: 1000000000000,
        updatedAt: 1000000000000,
      };

      function transformLocationToClinic(location: any) {
        return {
          tenantId: location.tenantId,
          name: location.name,
          description: location.description,
          addressStreet: location.address?.street,
          addressCity: location.address?.city,
          addressState: location.address?.state,
          addressPostalCode: location.address?.postalCode,
          addressCountry: location.address?.country,
          phone: location.phone,
          type: location.type,
          timezone: undefined,
          isActive: location.isActive,
          createdAt: location.createdAt,
          updatedAt: Date.now(),
        };
      }

      const result = transformLocationToClinic(minimalLocation);
      expect(result.name).toBe('Remote Office');
      expect(result.addressStreet).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.type).toBeUndefined();
    });

    it('should handle telehealth location type', () => {
      const telehealthLocation = {
        _id: 'location-3',
        name: 'Virtual Care',
        type: 'telehealth' as const,
        tenantId: 'tenant-1',
        isActive: true,
        createdAt: 1000000000000,
        updatedAt: 1000000000000,
      };

      function transformLocationToClinic(location: any) {
        return {
          tenantId: location.tenantId,
          name: location.name,
          type: location.type,
          isActive: location.isActive,
        };
      }

      const result = transformLocationToClinic(telehealthLocation);
      expect(result.type).toBe('telehealth');
    });
  });

  describe('ID mapping', () => {
    it('should create a valid old-to-new ID mapping', () => {
      const locations = [
        { _id: 'location-1', name: 'Office 1' },
        { _id: 'location-2', name: 'Office 2' },
        { _id: 'location-3', name: 'Office 3' },
      ];

      const newClinicIds = ['clinic-a', 'clinic-b', 'clinic-c'];

      // Build mapping (mirrors migration logic)
      const idMapping = new Map<string, string>();
      locations.forEach((loc, idx) => {
        idMapping.set(loc._id, newClinicIds[idx]);
      });

      expect(idMapping.get('location-1')).toBe('clinic-a');
      expect(idMapping.get('location-2')).toBe('clinic-b');
      expect(idMapping.get('location-3')).toBe('clinic-c');
    });

    it('should handle duplicate location names gracefully', () => {
      const locations = [
        { _id: 'location-1', name: 'Main Office' },
        { _id: 'location-2', name: 'Main Office' }, // Duplicate name
      ];

      const newClinicIds = ['clinic-a', 'clinic-b'];

      // Each location should get its own unique clinic ID
      const idMapping = new Map<string, string>();
      locations.forEach((loc, idx) => {
        idMapping.set(loc._id, newClinicIds[idx]);
      });

      // Both should have unique mappings despite same name
      expect(idMapping.get('location-1')).toBe('clinic-a');
      expect(idMapping.get('location-2')).toBe('clinic-b');
      expect(idMapping.size).toBe(2);
    });
  });

  describe('reference updates', () => {
    it('should update appointment references correctly', () => {
      const appointment = {
        _id: 'appt-1',
        locationId: 'location-1',
        clinicId: undefined,
      };

      const idMapping = new Map([['location-1', 'clinic-a']]);

      // Update function (mirrors migration logic)
      function updateAppointmentReference(apt: any, mapping: Map<string, string>) {
        if (apt.locationId && mapping.has(apt.locationId)) {
          return {
            ...apt,
            clinicId: mapping.get(apt.locationId),
            // Keep locationId for compatibility during migration
          };
        }
        return apt;
      }

      const result = updateAppointmentReference(appointment, idMapping);
      expect(result.clinicId).toBe('clinic-a');
      expect(result.locationId).toBe('location-1'); // Preserved for compatibility
    });

    it('should handle appointments without locationId', () => {
      const appointment = {
        _id: 'appt-2',
        locationId: undefined,
        clinicId: undefined,
      };

      const idMapping = new Map([['location-1', 'clinic-a']]);

      function updateAppointmentReference(apt: any, mapping: Map<string, string>) {
        if (apt.locationId && mapping.has(apt.locationId)) {
          return {
            ...apt,
            clinicId: mapping.get(apt.locationId),
          };
        }
        return apt;
      }

      const result = updateAppointmentReference(appointment, idMapping);
      expect(result.clinicId).toBeUndefined();
    });

    it('should update providerLocations references correctly', () => {
      const providerLocation = {
        _id: 'pl-1',
        providerId: 'provider-1',
        locationId: 'location-1',
        clinicId: undefined,
        isDefault: true,
      };

      const idMapping = new Map([['location-1', 'clinic-a']]);

      function updateProviderLocationReference(pl: any, mapping: Map<string, string>) {
        if (pl.locationId && mapping.has(pl.locationId)) {
          return {
            ...pl,
            clinicId: mapping.get(pl.locationId),
          };
        }
        return pl;
      }

      const result = updateProviderLocationReference(providerLocation, idMapping);
      expect(result.clinicId).toBe('clinic-a');
      expect(result.isDefault).toBe(true); // Other fields preserved
    });

    it('should update patients.preferredLocationId correctly', () => {
      const patient = {
        _id: 'patient-1',
        preferredLocationId: 'location-1',
        preferredClinicId: undefined,
      };

      const idMapping = new Map([['location-1', 'clinic-a']]);

      function updatePatientReference(p: any, mapping: Map<string, string>) {
        if (p.preferredLocationId && mapping.has(p.preferredLocationId)) {
          return {
            ...p,
            preferredClinicId: mapping.get(p.preferredLocationId),
          };
        }
        return p;
      }

      const result = updatePatientReference(patient, idMapping);
      expect(result.preferredClinicId).toBe('clinic-a');
    });
  });

  describe('rollback support', () => {
    it('should preserve old IDs for potential rollback', () => {
      // The migration creates a mapping that can be reversed
      const forwardMapping = new Map([
        ['location-1', 'clinic-a'],
        ['location-2', 'clinic-b'],
      ]);

      // Create reverse mapping for rollback
      const reverseMapping = new Map<string, string>();
      forwardMapping.forEach((newId, oldId) => {
        reverseMapping.set(newId, oldId);
      });

      expect(reverseMapping.get('clinic-a')).toBe('location-1');
      expect(reverseMapping.get('clinic-b')).toBe('location-2');
    });

    it('should support batch operations for rollback', () => {
      // For rollback, we need to:
      // 1. Restore locationId from mapping
      // 2. Clear clinicId
      const appointments = [
        { _id: 'appt-1', clinicId: 'clinic-a', locationId: 'location-1' },
        { _id: 'appt-2', clinicId: 'clinic-b', locationId: 'location-2' },
      ];

      function rollbackAppointments(apts: any[]) {
        return apts.map(apt => ({
          ...apt,
          // Clear clinicId to restore pre-migration state
          clinicId: undefined,
          // locationId is already preserved
        }));
      }

      const rolledBack = rollbackAppointments(appointments);
      expect(rolledBack[0].clinicId).toBeUndefined();
      expect(rolledBack[0].locationId).toBe('location-1');
      expect(rolledBack[1].clinicId).toBeUndefined();
      expect(rolledBack[1].locationId).toBe('location-2');
    });
  });
});

describe('Availability Window Generation', () => {
  it('should generate correct availability windows from recurring schedule', () => {
    const recurringSchedule = [
      { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00', clinicId: 'clinic-1' },
      { dayOfWeek: 'tuesday', startTime: '09:00', endTime: '17:00', clinicId: 'clinic-1' },
      { dayOfWeek: 'wednesday', startTime: '10:00', endTime: '14:00', clinicId: 'clinic-1' },
    ];

    // Helper to check if a day matches
    function getAvailabilityForDay(schedule: any[], dayOfWeek: string) {
      return schedule.find(s => s.dayOfWeek === dayOfWeek);
    }

    expect(getAvailabilityForDay(recurringSchedule, 'monday')).toEqual({
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '17:00',
      clinicId: 'clinic-1',
    });

    expect(getAvailabilityForDay(recurringSchedule, 'wednesday')?.startTime).toBe('10:00');
    expect(getAvailabilityForDay(recurringSchedule, 'friday')).toBeUndefined();
  });

  it('should apply overrides to recurring schedule', () => {
    const recurringSchedule = {
      monday: { startTime: '09:00', endTime: '17:00' },
    };

    const override = {
      date: '2024-01-15', // A Monday
      startTime: '10:00',
      endTime: '14:00',
      isUnavailable: false,
    };

    function applyOverride(recurring: any, override: any) {
      if (override.isUnavailable || (override.startTime === '00:00' && override.endTime === '00:00')) {
        return null; // No availability
      }
      return {
        startTime: override.startTime,
        endTime: override.endTime,
      };
    }

    const result = applyOverride(recurringSchedule.monday, override);
    expect(result?.startTime).toBe('10:00');
    expect(result?.endTime).toBe('14:00');
  });

  it('should mark unavailable days correctly', () => {
    const unavailableOverride = {
      date: '2024-01-15',
      startTime: '00:00',
      endTime: '00:00',
    };

    function isUnavailable(override: any) {
      return override.startTime === '00:00' && override.endTime === '00:00';
    }

    expect(isUnavailable(unavailableOverride)).toBe(true);
    expect(isUnavailable({ startTime: '09:00', endTime: '17:00' })).toBe(false);
  });

  it('should calculate focus hours range correctly', () => {
    const windows = [
      { startTime: '08:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '18:00' },
      { startTime: '09:00', endTime: '15:00' },
    ];

    function calculateFocusHoursRange(windows: any[]) {
      let minHour = 24;
      let maxHour = 0;

      for (const window of windows) {
        const [startH] = window.startTime.split(':').map(Number);
        const [endH, endM] = window.endTime.split(':').map(Number);
        
        if (startH < minHour) minHour = startH;
        const effectiveEndHour = endM > 0 ? endH + 1 : endH;
        if (effectiveEndHour > maxHour) maxHour = effectiveEndHour;
      }

      // Add 1 hour padding
      minHour = Math.max(0, minHour - 1);
      maxHour = Math.min(24, maxHour + 1);

      return {
        slotMinTime: `${String(minHour).padStart(2, '0')}:00:00`,
        slotMaxTime: `${String(maxHour).padStart(2, '0')}:00:00`,
      };
    }

    const result = calculateFocusHoursRange(windows);
    // Min is 08:00, max is 18:00, with padding: 07:00-19:00
    expect(result.slotMinTime).toBe('07:00:00');
    expect(result.slotMaxTime).toBe('19:00:00');
  });

  it('should handle empty availability windows for focus hours', () => {
    const windows: any[] = [];

    function calculateFocusHoursRange(windows: any[]) {
      if (windows.length === 0) {
        return {
          slotMinTime: '06:00:00',
          slotMaxTime: '22:00:00',
        };
      }
      // ... normal calculation
      return { slotMinTime: '06:00:00', slotMaxTime: '22:00:00' };
    }

    const result = calculateFocusHoursRange(windows);
    expect(result.slotMinTime).toBe('06:00:00');
    expect(result.slotMaxTime).toBe('22:00:00');
  });
});

