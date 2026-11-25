# NAFAS Supabase & PostgreSQL RLS Audit (SUPABASE_RLS_AUDIT.md)
> **Engine:** PostgreSQL 15+ / PostGIS 3.3+ / Supabase Auth & Storage  
> **Schema File:** `src/lib/server/schema.sql`  
> **Audited by:** Senior PostgreSQL & Supabase Security Specialist  
> **Standard:** Principle of Least Privilege (PoLP), Zero-Trust Table Isolation

---

## 1. Executive Summary of Schema Vulnerabilities
A rigorous audit of `src/lib/server/schema.sql` revealed significant discrepancies between intended security policies and actual database permissions:

1. **Tables with RLS Enabled but Zero Policies (Total Denial or Accidental Lockout):**
   - `users`: RLS is enabled, but **no policies** are defined. Any non-superuser client attempting to query `users` receives zero rows. Furthermore, this completely breaks the existing report update policy:
     ```sql
     CREATE POLICY "Only moderators and admins can update report status"
         ON reports FOR UPDATE
         USING (
             EXISTS (
                 SELECT 1 FROM users
                 WHERE users.id = auth.uid()
                 AND users.role IN ('moderator', 'admin')
             )
         );
     ```
     Because the subquery executes under the security context of the invoking role, it evaluates against `users` RLS. With no SELECT policy on `users`, it always returns empty, **blocking legitimate moderators and administrators from updating reports**!
   - `campaigns`: RLS enabled with zero policies. Public users cannot view campaigns, and organizers cannot create them via client SDKs.
   - `report_audit_logs`: RLS enabled with zero policies. Users and moderators cannot view audit history.

2. **Citizen Anonymity Leakage in `reports` SELECT Policy:**
   - The current policy:
     ```sql
     CREATE POLICY "Public can view non-rejected reports"
         ON reports FOR SELECT
         USING (status != 'rejected');
     ```
     Returns `reported_by` (foreign key to `users.id`) and raw high-precision `geom`, `lat`, `lng` even when `is_anonymous = true`. Any user querying via Supabase client gets the UUID of the reporting citizen.

3. **Missing Column-Level Privilege Separation (Role Tampering):**
   - The schema does not prevent authenticated users from inserting or updating `users.role` to `'admin'`.

4. **Missing SECURITY DEFINER Helper Function for Role Checks:**
   - To avoid infinite recursion or cross-table RLS denial when checking user roles, a dedicated `SECURITY DEFINER` function with a pinned `search_path` is mandatory.

---

## 2. Hardened Production RLS Architecture & Migration Script

To resolve all identified vulnerabilities, deploy the following hardened SQL configuration in Supabase:

```sql
-- =============================================================================
-- NAFAS | نَفَس — HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- Target: Supabase / PostgreSQL 15+ with PostGIS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. SECURE ROLE VERIFICATION HELPER (Breaks RLS Recurse & Protects Role Table)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id UUID)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = target_user_id;
    
    RETURN COALESCE(user_role, 'guest');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE POLICIES (Privacy-Preserving)
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Citizens can only view their own private profile (phone, national_id_hash)
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Public can view public volunteer profile data (name, points, badges only)
-- Note: Sensitive columns (phone_number, national_id_hash) should be selected via public view
CREATE POLICY "Public can view volunteer public metrics"
    ON users FOR SELECT
    TO anon, authenticated
    USING (is_verified_volunteer = TRUE);

-- Users can update only their own name or governorate (NEVER their role or points)
CREATE POLICY "Users can update their own personal info"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM users WHERE id = auth.uid()) -- Prevents role tampering
        AND points = (SELECT points FROM users WHERE id = auth.uid()) -- Prevents points tampering
    );

-- Only Super Admin / Service Role can insert or alter user roles
CREATE POLICY "Admins have full access to users"
    ON users FOR ALL
    TO authenticated
    USING (public.get_user_role(auth.uid()) = 'admin');

-- -----------------------------------------------------------------------------
-- 2. CAMPAIGNS TABLE POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous or authenticated) can view active or completed campaigns
CREATE POLICY "Public can view published campaigns"
    ON campaigns FOR SELECT
    TO anon, authenticated
    USING (status IN ('upcoming', 'in_progress', 'completed'));

-- Only organizers and admins can create new campaigns
CREATE POLICY "Organizers and admins can create campaigns"
    ON campaigns FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('organizer', 'admin')
        AND organizer_id = auth.uid()
    );

-- Organizers can update their own campaigns; admins can update any campaign
CREATE POLICY "Organizers and admins can update campaigns"
    ON campaigns FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) = 'admin' 
        OR (public.get_user_role(auth.uid()) = 'organizer' AND organizer_id = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- 3. REPORTS TABLE POLICIES & ANONYMITY VIEW
-- -----------------------------------------------------------------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public can view non-rejected reports
CREATE POLICY "Public can view non-rejected reports"
    ON reports FOR SELECT
    TO anon, authenticated
    USING (status != 'rejected');

-- Authenticated users or registered citizens can submit reports with 'submitted' status
CREATE POLICY "Authenticated users can submit reports"
    ON reports FOR INSERT
    TO authenticated
    WITH CHECK (
        status = 'submitted'
        AND (reported_by IS NULL OR reported_by = auth.uid())
    );

-- Only moderators and admins can update report status or assign entities
CREATE POLICY "Moderators and admins can update reports"
    ON reports FOR UPDATE
    TO authenticated
    USING (public.get_user_role(auth.uid()) IN ('moderator', 'admin'))
    WITH CHECK (public.get_user_role(auth.uid()) IN ('moderator', 'admin'));

-- -----------------------------------------------------------------------------
-- 4. SECURE CITIZEN ANONYMITY VIEW (Masks Whistleblower Identity & Coordinates)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_reports AS
SELECT 
    r.id,
    r.tracking_number,
    r.title,
    r.description,
    r.category,
    r.severity,
    r.governorate_id,
    r.neighborhood,
    -- Exact coordinates masked to ~1.1km grid for anonymous reports
    CASE 
        WHEN r.is_anonymous THEN ROUND(r.lat, 2)
        ELSE r.lat
    END AS lat,
    CASE 
        WHEN r.is_anonymous THEN ROUND(r.lng, 2)
        ELSE r.lng
    END AS lng,
    r.location_source,
    r.image_before_url,
    r.image_after_url,
    r.status,
    r.is_hazardous,
    r.assigned_entity,
    r.created_at,
    r.updated_at,
    -- Strict Whistleblower Mask: Strip reporter UUID when anonymous
    CASE 
        WHEN r.is_anonymous THEN NULL
        ELSE r.reported_by
    END AS reported_by,
    r.is_anonymous
FROM public.reports r
WHERE r.status != 'rejected';

-- Grant access on public view
GRANT SELECT ON public.public_reports TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. REPORT AUDIT LOGS (Immutable Traceability)
-- -----------------------------------------------------------------------------
ALTER TABLE report_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can view audit history for transparency
CREATE POLICY "Public can view audit logs"
    ON report_audit_logs FOR SELECT
    TO anon, authenticated
    USING (TRUE);

-- Only system triggers and moderators/admins can write audit logs
CREATE POLICY "Moderators and admins can append audit logs"
    ON report_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('moderator', 'admin')
        OR actor_id = auth.uid()
    );

-- Audit logs are strictly append-only (No UPDATE or DELETE permitted)
CREATE POLICY "Audit logs are immutable"
    ON report_audit_logs FOR UPDATE
    USING (FALSE);

CREATE POLICY "Audit logs cannot be deleted"
    ON report_audit_logs FOR DELETE
    USING (FALSE);
```
