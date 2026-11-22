-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 002: Row Level Security & Cybersecurity Policies
-- Target: PostgreSQL 15+ / Supabase
-- Complies with OWASP ASVS: Vertical & Horizontal Privilege Escalation Prevention,
-- Strict Citizen Privacy Projections, AAL2 Assurance, and Protected Storage Objects
-- =============================================================================

-- Enable RLS across all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. Helper Functions for Role & AAL2 MFA Verification (Security Definer)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.has_aal2_assurance()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (auth.jwt() ->> 'aal') = 'aal2',
        FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
        AND is_suspended = FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_moderator_or_higher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('moderator', 'admin', 'super_admin')
        AND is_suspended = FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 2. PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR public.is_admin_or_super());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid() AND role = 'citizen');

DROP POLICY IF EXISTS "Users can update own safe profile details" ON public.profiles;
CREATE POLICY "Users can update own safe profile details"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents self-role-escalation
        AND is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())
        AND points = (SELECT points FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;
CREATE POLICY "Super admin can update any profile"
    ON public.profiles FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- 3. REPORTS POLICIES (Raw Table Protected; Citizens View Own Only; Staff Inspect All)
-- -----------------------------------------------------------------------------
-- Privacy Guard: Public queries go through `public_reports` view.
-- Direct queries on `reports` table are restricted to report owners or authorized staff.
DROP POLICY IF EXISTS "Public can view approved public reports" ON public.reports;
DROP POLICY IF EXISTS "Authorized access to raw reports table" ON public.reports;
CREATE POLICY "Authorized access to raw reports table"
    ON public.reports FOR SELECT
    USING (
        reported_by = auth.uid()
        OR public.is_moderator_or_higher()
    );

DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports"
    ON public.reports FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND status = 'submitted'
        AND reported_by = auth.uid()
    );

DROP POLICY IF EXISTS "Staff can update report moderation status" ON public.reports;
CREATE POLICY "Staff can update report moderation status"
    ON public.reports FOR UPDATE
    USING (public.is_moderator_or_higher());

DROP POLICY IF EXISTS "Super admin can delete reports" ON public.reports;
CREATE POLICY "Super admin can delete reports"
    ON public.reports FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- 4. REPORT MEDIA POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "View report media" ON public.report_media;
CREATE POLICY "View report media"
    ON public.report_media FOR SELECT
    USING (
        uploaded_by = auth.uid() 
        OR public.is_moderator_or_higher()
    );

DROP POLICY IF EXISTS "Insert report media on submission" ON public.report_media;
CREATE POLICY "Insert report media on submission"
    ON public.report_media FOR INSERT
    WITH CHECK (uploaded_by = auth.uid() OR public.is_moderator_or_higher());

-- -----------------------------------------------------------------------------
-- 5. REPORT & ADMIN AUDIT LOGS (Immutable; Inserts Handled by Database Triggers/RPC)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Moderators and admins can view report audit logs" ON public.report_audit_logs;
CREATE POLICY "Moderators and admins can view report audit logs"
    ON public.report_audit_logs FOR SELECT
    USING (public.is_moderator_or_higher());

-- Revoke direct user insert on audit logs; populated exclusively by triggers / service_role
REVOKE INSERT, UPDATE, DELETE ON public.report_audit_logs FROM anon, authenticated;

DROP POLICY IF EXISTS "Super admin can view admin audit logs" ON public.admin_audit_logs;
CREATE POLICY "Super admin can view admin audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (public.current_user_role() = 'super_admin');

REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_logs FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. NOTIFICATION OUTBOX (Server-Controlled Outbox; Populated by Triggers)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only super admin can view notification outbox" ON public.notification_outbox;
CREATE POLICY "Only super admin can view notification outbox"
    ON public.notification_outbox FOR SELECT
    USING (public.current_user_role() = 'super_admin');

-- Revoke direct user insert and update on notification outbox
REVOKE INSERT, UPDATE, DELETE ON public.notification_outbox FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. SYSTEM SETTINGS (Secrets & Private Settings Isolated)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view public settings" ON public.system_settings;
CREATE POLICY "Public can view public settings"
    ON public.system_settings FOR SELECT
    USING (is_public = TRUE);

DROP POLICY IF EXISTS "Only super admin can update settings" ON public.system_settings;
CREATE POLICY "Only super admin can update settings"
    ON public.system_settings FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- 8. STORAGE OBJECT POLICIES (Private Evidence Bucket Security)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload report evidence" ON storage.objects;
CREATE POLICY "Authenticated users can upload report evidence"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'report-evidence-private'
        AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
    );

DROP POLICY IF EXISTS "Authorized users can read report evidence" ON storage.objects;
CREATE POLICY "Authorized users can read report evidence"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'report-evidence-private' AND (
            -- Staff members can inspect evidence for verification
            public.is_moderator_or_higher()
            OR
            -- Citizen owner can view their own uploaded evidence
            EXISTS (
                SELECT 1 FROM public.reports r
                WHERE r.reported_by = auth.uid()
                  AND (r.image_before_storage_path = name OR r.image_after_storage_path = name)
            )
        )
    );
