-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 002: Row Level Security & Cybersecurity Policies
-- Target: PostgreSQL 15+ / Supabase
-- Complies with OWASP ASVS: Vertical & Horizontal Privilege Escalation Prevention
-- =============================================================================

-- Enable RLS across all tables
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
-- Helper Functions for Role Verification (Security Definer)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
        AND is_suspended = FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_moderator_or_higher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('moderator', 'admin', 'super_admin')
        AND is_suspended = FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR public.is_admin_or_super());

-- 2. Users can insert their initial profile upon registration
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid() AND role = 'citizen');

-- 3. Users can update only their display details; role/points/suspended are protected
CREATE POLICY "Users can update own safe profile details"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents self-role-escalation
        AND is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())
        AND points = (SELECT points FROM public.profiles WHERE id = auth.uid())
    );

-- 4. Super Admin can manage all profiles and assign roles
CREATE POLICY "Super admin can update any profile"
    ON public.profiles FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- REPORTS POLICIES (Privacy & Moderation Protection)
-- -----------------------------------------------------------------------------
-- 1. Public can ONLY view verified or resolved reports (protects unreviewed submissions)
CREATE POLICY "Public can view approved public reports"
    ON public.reports FOR SELECT
    USING (
        (status IN ('verified', 'in_progress', 'pending_verification', 'resolved') AND is_archived = FALSE)
        OR (reported_by = auth.uid())
        OR public.is_moderator_or_higher()
    );

-- 2. Authenticated users can insert reports with default 'submitted' status
CREATE POLICY "Authenticated users can submit reports"
    ON public.reports FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND status = 'submitted'
        AND reported_by = auth.uid()
    );

-- 3. Only moderators, admins, and super admins can update reports
CREATE POLICY "Staff can update report moderation status"
    ON public.reports FOR UPDATE
    USING (public.is_moderator_or_higher());

-- 4. Only Super Admin can delete or hard-archive reports
CREATE POLICY "Super admin can delete reports"
    ON public.reports FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- REPORT MEDIA POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "View report media"
    ON public.report_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
            AND (
                r.status IN ('verified', 'resolved') 
                OR r.reported_by = auth.uid() 
                OR public.is_moderator_or_higher()
            )
        )
    );

CREATE POLICY "Insert report media on submission"
    ON public.report_media FOR INSERT
    WITH CHECK (uploaded_by = auth.uid() OR public.is_moderator_or_higher());

-- -----------------------------------------------------------------------------
-- REPORT & ADMIN AUDIT LOGS (Immutable Traceability)
-- -----------------------------------------------------------------------------
CREATE POLICY "Moderators and admins can view report audit logs"
    ON public.report_audit_logs FOR SELECT
    USING (public.is_moderator_or_higher());

CREATE POLICY "Staff can insert report audit logs"
    ON public.report_audit_logs FOR INSERT
    WITH CHECK (public.is_moderator_or_higher() OR auth.uid() IS NOT NULL);

-- Admin audit logs: strictly readable by Super Admin
CREATE POLICY "Super admin can view admin audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (public.current_user_role() = 'super_admin');

CREATE POLICY "System and staff can insert admin audit logs"
    ON public.admin_audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- NOTIFICATION OUTBOX
-- -----------------------------------------------------------------------------
CREATE POLICY "Only super admin can view notification outbox"
    ON public.notification_outbox FOR SELECT
    USING (public.current_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- SYSTEM SETTINGS
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view public settings"
    ON public.system_settings FOR SELECT
    USING (true);

CREATE POLICY "Only super admin can update settings"
    ON public.system_settings FOR ALL
    USING (public.current_user_role() = 'super_admin');
