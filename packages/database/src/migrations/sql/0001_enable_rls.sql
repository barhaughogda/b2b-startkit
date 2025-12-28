-- Enable Row-Level Security on all tenant-scoped tables
-- This migration sets up RLS policies for multi-tenancy

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create helper function to get current org ID from session
-- ============================================

CREATE OR REPLACE FUNCTION app.current_org_id()
RETURNS uuid AS $$
  SELECT current_setting('app.current_org_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- ============================================
-- Create helper function to get current user ID from session
-- ============================================

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid AS $$
  SELECT current_setting('app.current_user_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- ============================================
-- Create helper function to check if user is superadmin
-- ============================================

CREATE OR REPLACE FUNCTION app.is_superadmin()
RETURNS boolean AS $$
  SELECT COALESCE(current_setting('app.is_superadmin', true)::boolean, false);
$$ LANGUAGE sql STABLE;

-- ============================================
-- RLS Policy: users
-- Users can only read their own record
-- ============================================

CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (
    id = app.current_user_id()
    OR app.is_superadmin()
  );

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (
    id = app.current_user_id()
    OR app.is_superadmin()
  );

-- Superadmins can insert/delete users (for webhooks)
CREATE POLICY users_insert_superadmin ON users
  FOR INSERT
  WITH CHECK (app.is_superadmin());

CREATE POLICY users_delete_superadmin ON users
  FOR DELETE
  USING (app.is_superadmin());

-- ============================================
-- RLS Policy: organizations
-- Members can read their organization
-- Only owners/admins can update
-- ============================================

CREATE POLICY organizations_select_member ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

CREATE POLICY organizations_update_admin ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

-- Superadmins can insert/delete organizations (for webhooks)
CREATE POLICY organizations_insert_superadmin ON organizations
  FOR INSERT
  WITH CHECK (app.is_superadmin());

CREATE POLICY organizations_delete_superadmin ON organizations
  FOR DELETE
  USING (app.is_superadmin());

-- ============================================
-- RLS Policy: organization_members
-- Members can read their org's members
-- Only admins can update/delete members
-- ============================================

CREATE POLICY organization_members_select_member ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

CREATE POLICY organization_members_insert_admin ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

CREATE POLICY organization_members_update_admin ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

CREATE POLICY organization_members_delete_admin ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

-- ============================================
-- RLS Policy: subscriptions
-- Only org admins can read subscriptions
-- Updates handled by webhooks (superadmin)
-- ============================================

CREATE POLICY subscriptions_select_admin ON subscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

-- Superadmins can insert/update/delete subscriptions (for webhooks)
CREATE POLICY subscriptions_insert_superadmin ON subscriptions
  FOR INSERT
  WITH CHECK (app.is_superadmin());

CREATE POLICY subscriptions_update_superadmin ON subscriptions
  FOR UPDATE
  USING (app.is_superadmin());

CREATE POLICY subscriptions_delete_superadmin ON subscriptions
  FOR DELETE
  USING (app.is_superadmin());

-- ============================================
-- RLS Policy: audit_logs
-- Admins can read their org's audit logs
-- Only system can insert (via superadmin)
-- ============================================

CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

-- Only superadmin can insert audit logs (system operations)
CREATE POLICY audit_logs_insert_superadmin ON audit_logs
  FOR INSERT
  WITH CHECK (app.is_superadmin());

-- Audit logs are immutable - no update/delete policies

-- ============================================
-- RLS Policy: organization_feature_flags
-- Members can read their org's feature flags
-- Only admins can update
-- ============================================

CREATE POLICY org_feature_flags_select_member ON organization_feature_flags
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

CREATE POLICY org_feature_flags_insert_admin ON organization_feature_flags
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

CREATE POLICY org_feature_flags_update_admin ON organization_feature_flags
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

CREATE POLICY org_feature_flags_delete_admin ON organization_feature_flags
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

-- ============================================
-- RLS Policy: usage_records
-- Members can read their org's usage
-- Only system can insert (via superadmin)
-- ============================================

CREATE POLICY usage_records_select_member ON usage_records
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

-- Only superadmin can insert usage records (system operations)
CREATE POLICY usage_records_insert_superadmin ON usage_records
  FOR INSERT
  WITH CHECK (app.is_superadmin());

-- Usage records are immutable - no update/delete policies

-- ============================================
-- Feature flag definitions (global, no RLS needed)
-- ============================================

-- Feature flag definitions are global and readable by all authenticated users
ALTER TABLE feature_flag_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY feature_flag_definitions_select_all ON feature_flag_definitions
  FOR SELECT
  USING (true); -- All authenticated users can read definitions

-- Only superadmin can modify definitions
CREATE POLICY feature_flag_definitions_insert_superadmin ON feature_flag_definitions
  FOR INSERT
  WITH CHECK (app.is_superadmin());

CREATE POLICY feature_flag_definitions_update_superadmin ON feature_flag_definitions
  FOR UPDATE
  USING (app.is_superadmin());

CREATE POLICY feature_flag_definitions_delete_superadmin ON feature_flag_definitions
  FOR DELETE
  USING (app.is_superadmin());
