-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 004: Enforce Mandatory AAL2 for Administrative Operations
-- Target: PostgreSQL 15+ / Supabase
-- Purpose:
-- Enforce Authenticator Assurance Level 2 (AAL2) unconditionally across all
-- security-sensitive administrative database access and mutations.
-- Super admins and staff at AAL1 (password only) are blocked from privileged
-- operations until secondary factor (TOTP) verification is achieved.
-- Citizen access and ordinary user flows are preserved at standard assurance.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper Functions with Explicit AAL2 Enforcement (Security Definer)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_aal2_assurance()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (auth.jwt() ->> 'aal') = 'aal2',
        FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin_aal2()
RETURNS BOOLEAN AS $$
    SELECT (
        public.current_user_role() = 'super_admin'
        AND public.has_aal2_assurance()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_aal2()
RETURNS BOOLEAN AS $$
    SELECT (
        public.is_admin_or_super()
        AND public.has_aal2_assurance()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 2. PROFILES: Enforce AAL2 on Privileged Access & Cross-User Mutations
-- -----------------------------------------------------------------------------
-- Citizens view their own profile at AAL1; Staff/Admins inspecting other profiles require AAL2
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (
        id = auth.uid() 
        OR (public.is_admin_or_super() AND public.has_aal2_assurance())
    );

-- Super Admin updating user roles / profile state unconditionally requires AAL2
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;
CREATE POLICY "Super admin can update any profile"
    ON public.profiles FOR ALL
    USING (public.is_super_admin_aal2())
    WITH CHECK (public.is_super_admin_aal2());

-- -----------------------------------------------------------------------------
-- 3. REPORTS: Enforce AAL2 on Destructive Admin Operations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin can delete reports" ON public.reports;
CREATE POLICY "Super admin can delete reports"
    ON public.reports FOR DELETE
    USING (public.is_super_admin_aal2());

-- -----------------------------------------------------------------------------
-- 4. ADMIN AUDIT LOGS: Enforce AAL2 on Security Audit Inspection
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin can view admin audit logs" ON public.admin_audit_logs;
CREATE POLICY "Super admin can view admin audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (public.is_super_admin_aal2());

-- -----------------------------------------------------------------------------
-- 5. NOTIFICATION OUTBOX: Enforce AAL2 on Broadcast Queue Inspection
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only super admin can view notification outbox" ON public.notification_outbox;
CREATE POLICY "Only super admin can view notification outbox"
    ON public.notification_outbox FOR SELECT
    USING (public.is_super_admin_aal2());

-- -----------------------------------------------------------------------------
-- 6. SYSTEM SETTINGS: Enforce AAL2 on Platform Configuration Mutations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only super admin can update settings" ON public.system_settings;
CREATE POLICY "Only super admin can update settings"
    ON public.system_settings FOR ALL
    USING (public.is_super_admin_aal2())
    WITH CHECK (public.is_super_admin_aal2());
