-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 005: Enforce Mandatory AAL2 for Staff Operations
-- Target: PostgreSQL 15+ / Supabase
-- Purpose:
-- 1. Require Authenticator Assurance Level 2 (AAL2) for staff/moderator access
--    to other citizens' private reports.
-- 2. Require AAL2 for report moderation and status updates.
-- 3. Require AAL2 for privileged access to private evidence and report media.
-- 4. Require AAL2 for staff access to report audit logs.
-- 5. Preserve citizens' access to their own reports and evidence at standard assurance (AAL1).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper Functions with Explicit AAL2 Assurance
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_moderator_or_higher_aal2()
RETURNS BOOLEAN AS $$
    SELECT (
        public.is_moderator_or_higher()
        AND public.has_aal2_assurance()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 2. REPORTS: Enforce AAL2 on Staff Inspection & Moderation
-- -----------------------------------------------------------------------------
-- Citizens can select their own reports at AAL1; Staff inspecting other citizens' reports MUST have AAL2
DROP POLICY IF EXISTS "Authorized access to raw reports table" ON public.reports;
CREATE POLICY "Authorized access to raw reports table"
    ON public.reports FOR SELECT
    USING (
        reported_by = auth.uid()
        OR public.is_moderator_or_higher_aal2()
    );

-- Report moderation status updates require AAL2
DROP POLICY IF EXISTS "Staff can update report moderation status" ON public.reports;
CREATE POLICY "Staff can update report moderation status"
    ON public.reports FOR UPDATE
    USING (public.is_moderator_or_higher_aal2())
    WITH CHECK (public.is_moderator_or_higher_aal2());

-- -----------------------------------------------------------------------------
-- 3. REPORT MEDIA: Enforce AAL2 for Staff Inspection
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "View report media" ON public.report_media;
CREATE POLICY "View report media"
    ON public.report_media FOR SELECT
    USING (
        uploaded_by = auth.uid() 
        OR public.is_moderator_or_higher_aal2()
    );

DROP POLICY IF EXISTS "Insert report media on submission" ON public.report_media;
CREATE POLICY "Insert report media on submission"
    ON public.report_media FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid() 
        OR public.is_moderator_or_higher_aal2()
    );

-- -----------------------------------------------------------------------------
-- 4. STORAGE OBJECTS: Enforce AAL2 for Staff Evidence Inspection
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorized users can read report evidence" ON storage.objects;
CREATE POLICY "Authorized users can read report evidence"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'report-evidence-private' AND (
            -- Privileged staff inspection requires AAL2
            public.is_moderator_or_higher_aal2()
            OR
            -- Citizen can access their own uploaded namespace at standard assurance (AAL1)
            ((storage.foldername(name))[1] = 'reports' AND (storage.foldername(name))[2] = auth.uid()::text)
            OR
            -- Confirmed report owner
            EXISTS (
                SELECT 1 FROM public.reports r
                WHERE r.reported_by = auth.uid()
                  AND (r.image_before_storage_path = name OR r.image_after_storage_path = name)
            )
        )
    );

-- -----------------------------------------------------------------------------
-- 5. REPORT AUDIT LOGS: Enforce AAL2 for Staff Log Inspection
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Moderators and admins can view report audit logs" ON public.report_audit_logs;
CREATE POLICY "Moderators and admins can view report audit logs"
    ON public.report_audit_logs FOR SELECT
    USING (public.is_moderator_or_higher_aal2());
