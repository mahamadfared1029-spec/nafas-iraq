-- =============================================================================
-- Migration 007: Restrict public_reports view to explicitly verified and active public statuses
-- Target Environment: Supabase PostgreSQL (NAFAS Platform)
-- Security Standard: OWASP ASVS 5.0 Level 2 / Principle of Least Privilege
-- =============================================================================

-- Description:
-- Previously, public.public_reports included 'pending_verification'.
-- Unverified, pending citizen reports must NOT be visible to public or anonymous visitors
-- until a staff moderator has reviewed and verified their authenticity.
-- This migration updates the public projection view to strictly exclude:
-- 'submitted', 'under_review', 'pending_verification', 'rejected', 'duplicate', and 'archived'.

CREATE OR REPLACE VIEW public.public_reports AS
SELECT
    r.id,
    r.tracking_number,
    r.title,
    r.description,
    r.category,
    r.severity,
    r.status,
    r.governorate_id,
    r.neighborhood,
    -- Obfuscate exact coordinates to protect reporter privacy (~1.1km grid)
    ROUND(r.lat::numeric, 2) AS approximate_lat,
    ROUND(r.lng::numeric, 2) AS approximate_lng,
    r.location_source,
    r.is_hazardous,
    r.created_at,
    r.updated_at
FROM public.reports r
WHERE r.status IN ('verified', 'in_progress', 'resolved')
  AND r.is_archived = FALSE;

-- Ensure view is accessible to anonymous and authenticated users for reading
GRANT SELECT ON public.public_reports TO anon, authenticated;

COMMENT ON VIEW public.public_reports IS 
  'Privacy-preserving public view showing exclusively verified, active, and resolved reports. Unverified and pending reports are isolated from public queries.';
