/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin_analytics from "../admin/analytics.js";
import type * as admin_compliance from "../admin/compliance.js";
import type * as admin_complianceMetrics from "../admin/complianceMetrics.js";
import type * as admin_platformSettings from "../admin/platformSettings.js";
import type * as admin_reports from "../admin/reports.js";
import type * as admin_security from "../admin/security.js";
import type * as admin_securityEvents from "../admin/securityEvents.js";
import type * as admin_securityMetrics from "../admin/securityMetrics.js";
import type * as admin_systemMetrics from "../admin/systemMetrics.js";
import type * as admin_systemSettings from "../admin/systemSettings.js";
import type * as admin_tenants from "../admin/tenants.js";
import type * as admin_userMetrics from "../admin/userMetrics.js";
import type * as admin_users from "../admin/users.js";
import type * as appointmentMembers from "../appointmentMembers.js";
import type * as appointments from "../appointments.js";
import type * as audit from "../audit.js";
import type * as auditLogger from "../auditLogger.js";
import type * as auditLogs from "../auditLogs.js";
import type * as availability from "../availability.js";
import type * as billing from "../billing.js";
import type * as bookingConfig from "../bookingConfig.js";
import type * as bookingRequests from "../bookingRequests.js";
import type * as calendarShares from "../calendarShares.js";
import type * as calendarSync from "../calendarSync.js";
import type * as careTeam from "../careTeam.js";
import type * as clinic_clinics from "../clinic/clinics.js";
import type * as clinic_invitations from "../clinic/invitations.js";
import type * as clinic_owners from "../clinic/owners.js";
import type * as clinic_permissions from "../clinic/permissions.js";
import type * as clinic_reports from "../clinic/reports.js";
import type * as clinic_roles from "../clinic/roles.js";
import type * as clinic_sessionTimeout from "../clinic/sessionTimeout.js";
import type * as clinic_users from "../clinic/users.js";
import type * as clinics from "../clinics.js";
import type * as customRoles from "../customRoles.js";
import type * as dashboard from "../dashboard.js";
import type * as dataAccess from "../dataAccess.js";
import type * as domains from "../domains.js";
import type * as encryption from "../encryption.js";
import type * as invitations from "../invitations.js";
import type * as landingPage from "../landingPage.js";
import type * as locations from "../locations.js";
import type * as logo from "../logo.js";
import type * as medicalRecordMembers from "../medicalRecordMembers.js";
import type * as medicalRecords from "../medicalRecords.js";
import type * as messageAssignments from "../messageAssignments.js";
import type * as messages from "../messages.js";
import type * as mfa from "../mfa.js";
import type * as migrations_migrateViewScopeToSharing from "../migrations/migrateViewScopeToSharing.js";
import type * as notifications from "../notifications.js";
import type * as patientProfile from "../patientProfile.js";
import type * as patientShares from "../patientShares.js";
import type * as patients from "../patients.js";
import type * as providerProfiles from "../providerProfiles.js";
import type * as providers from "../providers.js";
import type * as publicLanding from "../publicLanding.js";
import type * as publicProfiles from "../publicProfiles.js";
import type * as scheduled_auditRetention from "../scheduled/auditRetention.js";
import type * as scheduled_calendarSync from "../scheduled/calendarSync.js";
import type * as sessions from "../sessions.js";
import type * as slotLocks from "../slotLocks.js";
import type * as superadmin_supportAccess from "../superadmin/supportAccess.js";
import type * as superadmin from "../superadmin.js";
import type * as tenantBranding from "../tenantBranding.js";
import type * as tenants from "../tenants.js";
import type * as userSharingSettings from "../userSharingSettings.js";
import type * as users from "../users.js";
import type * as utils_authorization from "../utils/authorization.js";
import type * as utils_shareValidation from "../utils/shareValidation.js";
import type * as validators from "../validators.js";
import type * as websiteBuilder from "../websiteBuilder.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "admin/analytics": typeof admin_analytics;
  "admin/compliance": typeof admin_compliance;
  "admin/complianceMetrics": typeof admin_complianceMetrics;
  "admin/platformSettings": typeof admin_platformSettings;
  "admin/reports": typeof admin_reports;
  "admin/security": typeof admin_security;
  "admin/securityEvents": typeof admin_securityEvents;
  "admin/securityMetrics": typeof admin_securityMetrics;
  "admin/systemMetrics": typeof admin_systemMetrics;
  "admin/systemSettings": typeof admin_systemSettings;
  "admin/tenants": typeof admin_tenants;
  "admin/userMetrics": typeof admin_userMetrics;
  "admin/users": typeof admin_users;
  appointmentMembers: typeof appointmentMembers;
  appointments: typeof appointments;
  audit: typeof audit;
  auditLogger: typeof auditLogger;
  auditLogs: typeof auditLogs;
  availability: typeof availability;
  billing: typeof billing;
  bookingConfig: typeof bookingConfig;
  bookingRequests: typeof bookingRequests;
  calendarShares: typeof calendarShares;
  calendarSync: typeof calendarSync;
  careTeam: typeof careTeam;
  "clinic/clinics": typeof clinic_clinics;
  "clinic/invitations": typeof clinic_invitations;
  "clinic/owners": typeof clinic_owners;
  "clinic/permissions": typeof clinic_permissions;
  "clinic/reports": typeof clinic_reports;
  "clinic/roles": typeof clinic_roles;
  "clinic/sessionTimeout": typeof clinic_sessionTimeout;
  "clinic/users": typeof clinic_users;
  clinics: typeof clinics;
  customRoles: typeof customRoles;
  dashboard: typeof dashboard;
  dataAccess: typeof dataAccess;
  domains: typeof domains;
  encryption: typeof encryption;
  invitations: typeof invitations;
  landingPage: typeof landingPage;
  locations: typeof locations;
  logo: typeof logo;
  medicalRecordMembers: typeof medicalRecordMembers;
  medicalRecords: typeof medicalRecords;
  messageAssignments: typeof messageAssignments;
  messages: typeof messages;
  mfa: typeof mfa;
  "migrations/migrateViewScopeToSharing": typeof migrations_migrateViewScopeToSharing;
  notifications: typeof notifications;
  patientProfile: typeof patientProfile;
  patientShares: typeof patientShares;
  patients: typeof patients;
  providerProfiles: typeof providerProfiles;
  providers: typeof providers;
  publicLanding: typeof publicLanding;
  publicProfiles: typeof publicProfiles;
  "scheduled/auditRetention": typeof scheduled_auditRetention;
  "scheduled/calendarSync": typeof scheduled_calendarSync;
  sessions: typeof sessions;
  slotLocks: typeof slotLocks;
  "superadmin/supportAccess": typeof superadmin_supportAccess;
  superadmin: typeof superadmin;
  tenantBranding: typeof tenantBranding;
  tenants: typeof tenants;
  userSharingSettings: typeof userSharingSettings;
  users: typeof users;
  "utils/authorization": typeof utils_authorization;
  "utils/shareValidation": typeof utils_shareValidation;
  validators: typeof validators;
  websiteBuilder: typeof websiteBuilder;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
