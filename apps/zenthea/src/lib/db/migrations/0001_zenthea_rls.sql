-- Enable Row-Level Security on Zenthea product tables
-- Every table has organization_id for tenant isolation

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE zenthea_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_appointment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_slot_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_medical_record_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_message_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_insurance_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_support_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_website_builder_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zenthea_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policy: Generic Tenant Isolation
-- Most Zenthea tables follow the same pattern:
-- Only members of the organization can read/write.
-- ============================================

-- Helper to create a standard isolation policy
-- Note: app.current_org_id() and app.is_superadmin() are defined in the core StartKit migrations

-- Clinics
CREATE POLICY clinics_isolation ON zenthea_clinics
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Patients
CREATE POLICY patients_isolation ON zenthea_patients
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Providers
CREATE POLICY providers_isolation ON zenthea_providers
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Appointments
CREATE POLICY appointments_isolation ON zenthea_appointments
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Appointment Members
CREATE POLICY appointment_members_isolation ON zenthea_appointment_members
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Slot Locks
CREATE POLICY slot_locks_isolation ON zenthea_slot_locks
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Medical Records
CREATE POLICY medical_records_isolation ON zenthea_medical_records
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Medical Record Members
CREATE POLICY medical_record_members_isolation ON zenthea_medical_record_members
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Messages
CREATE POLICY messages_isolation ON zenthea_messages
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Message Assignments
CREATE POLICY message_assignments_isolation ON zenthea_message_assignments
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Invoices
CREATE POLICY invoices_isolation ON zenthea_invoices
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Insurance Payers
CREATE POLICY insurance_payers_isolation ON zenthea_insurance_payers
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Insurance Claims
CREATE POLICY insurance_claims_isolation ON zenthea_insurance_claims
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Support Access Requests
CREATE POLICY support_access_requests_isolation ON zenthea_support_access_requests
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Website Builder Versions
CREATE POLICY website_builder_versions_isolation ON zenthea_website_builder_versions
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Notifications
CREATE POLICY notifications_isolation ON zenthea_notifications
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Provider Profiles
CREATE POLICY provider_profiles_isolation ON zenthea_provider_profiles
  USING (organization_id = app.current_org_id() OR app.is_superadmin());

-- Invitations
CREATE POLICY invitations_isolation ON zenthea_invitations
  USING (organization_id = app.current_org_id() OR app.is_superadmin());
