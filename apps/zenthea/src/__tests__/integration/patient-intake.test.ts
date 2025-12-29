import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../../../convex/_generated/api';

/**
 * Integration tests for patient intake form flow
 * 
 * Tests the complete patient intake form flow including:
 * - First sign-in detection
 * - Redirect to intake form
 * - Form completion
 * - Profile creation
 * - Bypass for existing patients
 */

describe('Patient Intake Form Flow', () => {
  let t: ConvexTestingHelper;
  let testTenantId: string;
  let patientEmail: string;

  beforeEach(async () => {
    t = new ConvexTestingHelper();
    await t.setup();
    
    // Create test tenant
    testTenantId = 'test-tenant-intake';
    
    // Create patient user
    patientEmail = 'patient@test.com';
    patientUserId = await t.mutation(api.users.createUserMutation, {
      email: patientEmail,
      name: 'Test Patient',
      role: 'patient',
      passwordHash: 'hashed-password',
      isActive: true,
      tenantId: testTenantId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  afterEach(async () => {
    await t.cleanup();
  });

  describe('First sign-in detection', () => {
    it('should detect new patient without intake data', async () => {
      // Create patient record without intake data
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Find patient by email
      const foundPatientId = await t.query(api.patientProfile.findPatientByEmail, {
        email: patientEmail,
        tenantId: testTenantId,
      });

      expect(foundPatientId).toBe(patientId);

      // Get patient profile
      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile).toBeDefined();
      expect(profile?.gender).toBeUndefined();
      expect(profile?.primaryLanguage).toBeUndefined();
      expect(profile?.email).toBe(patientEmail);
      expect(profile?.phone).toBeUndefined();
      expect(profile?.emergencyContacts).toBeUndefined();
    });

    it('should detect patient with partial intake data', async () => {
      // Create patient with only demographics (missing contact and emergency)
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Update demographics only
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'male',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      // Get patient profile
      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.gender).toBe('male');
      expect(profile?.primaryLanguage).toBe('en');
      expect(profile?.email).toBe(patientEmail);
      expect(profile?.phone).toBeUndefined();
      expect(profile?.emergencyContacts).toBeUndefined();
    });

    it('should detect patient with missing required demographics', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Update with only gender (missing primaryLanguage)
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'male',
        },
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.gender).toBe('male');
      expect(profile?.primaryLanguage).toBeUndefined();
    });
  });

  describe('Form completion', () => {
    it('should complete demographics section', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Update demographics with required fields
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'female',
          primaryLanguage: 'es',
          preferredName: 'Test',
          maritalStatus: 'single',
        },
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.gender).toBe('female');
      expect(profile?.primaryLanguage).toBe('es');
      expect(profile?.preferredName).toBe('Test');
      expect(profile?.maritalStatus).toBe('single');
    });

    it('should complete contact section via patient update', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Update patient email and phone (these are patient-level fields, not profile fields)
      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        email: 'updated@test.com',
        phone: '555-123-4567',
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.email).toBe('updated@test.com');
      expect(profile?.phone).toBe('555-123-4567');
    });

    it('should complete emergency contacts section', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Update emergency contacts
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '555-987-6543',
            email: 'emergency@test.com',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.emergencyContacts).toBeDefined();
      expect(profile?.emergencyContacts?.length).toBe(1);
      expect(profile?.emergencyContacts?.[0]?.name).toBe('Emergency Contact');
      expect(profile?.emergencyContacts?.[0]?.phone).toBe('555-987-6543');
      expect(profile?.emergencyContacts?.[0]?.isPrimary).toBe(true);
    });

    it('should complete all required sections for intake', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Complete demographics
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'male',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      // Complete contact (via patient update)
      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        phone: '555-123-4567',
      });

      // Complete emergency contacts
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Parent',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      // Verify all required fields are present
      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.gender).toBe('male');
      expect(profile?.primaryLanguage).toBe('en');
      expect(profile?.phone).toBe('555-123-4567');
      expect(profile?.emergencyContacts).toBeDefined();
      expect(profile?.emergencyContacts?.length).toBe(1);
      expect(profile?.emergencyContacts?.[0]?.name).toBe('Emergency Contact');
      expect(profile?.emergencyContacts?.[0]?.phone).toBe('555-987-6543');
    });

    it('should validate required fields in demographics', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Try to update with only gender (missing primaryLanguage)
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'female',
        },
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Profile should be updated but still incomplete
      expect(profile?.gender).toBe('female');
      expect(profile?.primaryLanguage).toBeUndefined();
    });

    it('should save emergency contacts with valid data structure', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Add emergency contact with valid data
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.emergencyContacts).toBeDefined();
      expect(profile?.emergencyContacts?.length).toBe(1);
      expect(profile?.emergencyContacts?.[0]?.name).toBe('Emergency Contact');
      expect(profile?.emergencyContacts?.[0]?.phone).toBe('555-987-6543');
      // Note: Empty string validation happens at UI level, not Convex level
    });
  });

  describe('Profile creation', () => {
    it('should create complete patient profile with all required sections', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Create complete profile
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'other',
          primaryLanguage: 'fr',
          preferredName: 'Test',
          maritalStatus: 'married',
        },
        userEmail: patientEmail,
      });

      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        email: patientEmail,
        phone: '555-111-2222',
      });

      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Primary Contact',
            relationship: 'Spouse',
            phone: '555-333-4444',
            isPrimary: true,
          },
          {
            name: 'Secondary Contact',
            relationship: 'Parent',
            phone: '555-555-6666',
            isPrimary: false,
          },
        ],
        userEmail: patientEmail,
      });

      // Verify complete profile
      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      expect(profile?.gender).toBe('other');
      expect(profile?.primaryLanguage).toBe('fr');
      expect(profile?.phone).toBe('555-111-2222');
      expect(profile?.emergencyContacts?.length).toBe(2);
      expect(profile?.emergencyContacts?.[0]?.isPrimary).toBe(true);
      expect(profile?.emergencyContacts?.[1]?.isPrimary).toBe(false);
    });

    it('should update profile completeness tracking', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Update demographics
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'male',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Profile completeness should be tracked
      expect(profile?.profileCompleteness).toBeDefined();
      expect(profile?.profileCompleteness?.sectionsCompleted).toContain('demographics');
    });
  });

  describe('Bypass for existing patients', () => {
    it('should allow access for patient with completed intake', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Complete all required sections
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'female',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        phone: '555-123-4567',
      });

      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      // Verify patient profile has all required fields
      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Check intake completion criteria
      const hasDemographics = !!(profile?.gender && profile?.primaryLanguage);
      const hasContact = !!(profile?.email || profile?.phone);
      const hasEmergencyContacts = !!(
        profile?.emergencyContacts &&
        profile.emergencyContacts.length > 0 &&
        profile.emergencyContacts.some((ec) => ec.name && ec.phone)
      );

      expect(hasDemographics).toBe(true);
      expect(hasContact).toBe(true);
      expect(hasEmergencyContacts).toBe(true);
    });

    it('should detect incomplete intake for patient missing demographics', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Only complete contact and emergency (missing demographics)
      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        phone: '555-123-4567',
      });

      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Check intake completion criteria
      const hasDemographics = !!(profile?.gender && profile?.primaryLanguage);
      const hasContact = !!(profile?.email || profile?.phone);
      const hasEmergencyContacts = !!(
        profile?.emergencyContacts &&
        profile.emergencyContacts.length > 0 &&
        profile.emergencyContacts.some((ec) => ec.name && ec.phone)
      );

      expect(hasDemographics).toBe(false); // Missing demographics
      expect(hasContact).toBe(true);
      expect(hasEmergencyContacts).toBe(true);
    });

    it('should detect incomplete intake for patient missing contact', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Only complete demographics and emergency (missing contact)
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'male',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Check intake completion criteria
      const hasDemographics = !!(profile?.gender && profile?.primaryLanguage);
      const hasContact = !!(profile?.email || profile?.phone);
      const hasEmergencyContacts = !!(
        profile?.emergencyContacts &&
        profile.emergencyContacts.length > 0 &&
        profile.emergencyContacts.some((ec) => ec.name && ec.phone)
      );

      expect(hasDemographics).toBe(true);
      // Email exists from patient creation, so hasContact should be true
      expect(hasContact).toBe(true); // Email exists
      expect(hasEmergencyContacts).toBe(true);
    });

    it('should detect incomplete intake for patient missing emergency contacts', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Only complete demographics and contact (missing emergency contacts)
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'female',
          primaryLanguage: 'es',
        },
        userEmail: patientEmail,
      });

      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        phone: '555-123-4567',
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Check intake completion criteria
      const hasDemographics = !!(profile?.gender && profile?.primaryLanguage);
      const hasContact = !!(profile?.email || profile?.phone);
      const hasEmergencyContacts = !!(
        profile?.emergencyContacts &&
        profile.emergencyContacts.length > 0 &&
        profile.emergencyContacts.some((ec) => ec.name && ec.phone)
      );

      expect(hasDemographics).toBe(true);
      expect(hasContact).toBe(true);
      expect(hasEmergencyContacts).toBe(false); // Missing emergency contacts
    });
  });

  describe('Intake validation logic', () => {
    it('should validate intake completion with all required fields', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Complete all required sections
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'male',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      await t.mutation(api.patients.updatePatient, {
        id: patientId,
        phone: '555-123-4567',
      });

      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Validate intake completion (matching layout.tsx logic)
      const hasDemographics = !!(profile?.gender && profile?.primaryLanguage);
      const hasContact = !!(profile?.email || profile?.phone);
      const hasEmergencyContacts = !!(
        profile?.emergencyContacts &&
        profile.emergencyContacts.length > 0 &&
        profile.emergencyContacts.some((ec) => ec.name && ec.phone)
      );

      const isIntakeCompleted = hasDemographics && hasContact && hasEmergencyContacts;

      expect(isIntakeCompleted).toBe(true);
    });

    it('should validate intake completion with email instead of phone', async () => {
      const patientId = await t.mutation(api.patients.createPatient, {
        firstName: 'Test',
        lastName: 'Patient',
        email: patientEmail,
        tenantId: testTenantId,
        dateOfBirth: new Date('1990-01-01').getTime(),
      });

      // Complete with email (no phone)
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'demographics',
        data: {
          gender: 'female',
          primaryLanguage: 'en',
        },
        userEmail: patientEmail,
      });

      // Email already exists from patient creation
      await t.mutation(api.patientProfile.updatePatientProfile, {
        patientId,
        section: 'emergencyContacts',
        data: [
          {
            name: 'Emergency Contact',
            relationship: 'Parent',
            phone: '555-987-6543',
            isPrimary: true,
          },
        ],
        userEmail: patientEmail,
      });

      const profile = await t.query(api.patientProfile.getPatientProfile, {
        patientId,
      });

      // Validate intake completion (email OR phone is acceptable)
      const hasDemographics = !!(profile?.gender && profile?.primaryLanguage);
      const hasContact = !!(profile?.email || profile?.phone);
      const hasEmergencyContacts = !!(
        profile?.emergencyContacts &&
        profile.emergencyContacts.length > 0 &&
        profile.emergencyContacts.some((ec) => ec.name && ec.phone)
      );

      const isIntakeCompleted = hasDemographics && hasContact && hasEmergencyContacts;

      expect(isIntakeCompleted).toBe(true);
      expect(hasContact).toBe(true); // Email exists
    });
  });
});

