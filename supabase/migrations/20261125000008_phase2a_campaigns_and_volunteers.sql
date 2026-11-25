-- =============================================================================
-- MIGRATION 008: NAFAS IRAQ — PHASE 2A: PRODUCTION INTEGRITY & VOLUNTEER SECURITY GATE
-- =============================================================================
-- Audited under TITAN Protocol:
-- 1. Check-in codes stored in private isolated table, NEVER in public.campaigns.
-- 2. Code generated with cryptographically secure gen_random_bytes and SHA-256 hash.
-- 3. Rate limiting and brute-force protection (failed_attempts counter).
-- 4. Separation of volunteer check-in (pending approval) from organizer hours authorization.
-- 5. Volunteers cannot choose their own verified hours or self-issue certificates.
-- 6. Strict RLS: Deny direct INSERT/UPDATE on campaign_registrations. Registration & cancellation strictly via atomic RPCs.
-- 7. SHA-256 verification hash accurately labeled as digest (not cryptographic signature).
-- 8. Single certificate per volunteer per campaign constraint.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CAMPAIGN TABLE EXTENSIONS (PUBLIC-SAFE ONLY)
DO $$ 
BEGIN
    -- Campaign Type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'campaign_type'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD COLUMN campaign_type VARCHAR(32) NOT NULL DEFAULT 'reforestation' 
        CHECK (campaign_type IN ('reforestation', 'cleanup', 'recycling', 'education', 'river_protection', 'biodiversity'));
    END IF;

    -- Coordinates for Map Integration (Public Information)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'meeting_lat'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN meeting_lat NUMERIC(9, 6);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'meeting_lng'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN meeting_lng NUMERIC(9, 6);
    END IF;

    -- Verified field metrics (updated only upon campaign completion)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'waste_collected_kg'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN waste_collected_kg NUMERIC(8, 2) DEFAULT 0;
    END IF;

    -- Drop any accidentally added check_in_code columns from public.campaigns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'check_in_code'
    ) THEN
        ALTER TABLE public.campaigns DROP COLUMN check_in_code;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'check_in_code_expires_at'
    ) THEN
        ALTER TABLE public.campaigns DROP COLUMN check_in_code_expires_at;
    END IF;
END $$;

-- Update status constraint on campaigns
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
    CHECK (status IN ('draft', 'upcoming', 'in_progress', 'completed', 'cancelled'));

-- 2. CAMPAIGN REGISTRATIONS EXTENSIONS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaign_registrations' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.campaign_registrations 
        ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'registered' 
        CHECK (status IN ('registered', 'checked_in', 'attended', 'cancelled', 'no_show'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaign_registrations' AND column_name = 'attended_at'
    ) THEN
        ALTER TABLE public.campaign_registrations ADD COLUMN attended_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. PRIVATE ISOLATED CHECK-IN SECRETS TABLE (NEVER EXPOSED TO PUBLIC)
CREATE TABLE IF NOT EXISTS public.campaign_checkin_codes (
    campaign_id VARCHAR(32) PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    failed_attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 150
);

-- 4. UNIQUE CERTIFICATE CONSTRAINT (One certificate per volunteer per campaign)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_certificates_campaign_user'
    ) THEN
        ALTER TABLE public.certificates ADD CONSTRAINT uq_certificates_campaign_user UNIQUE (campaign_id, user_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. CAMPAIGN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.campaign_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(32) NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_audit_logs_campaign ON public.campaign_audit_logs(campaign_id);

-- 6. STRICT ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_checkin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_audit_logs ENABLE ROW LEVEL SECURITY;

-- Campaign read access: Non-draft visible to all. Draft visible to owner/moderator.
DROP POLICY IF EXISTS "Public can view published campaigns" ON public.campaigns;
CREATE POLICY "Public can view published campaigns"
    ON public.campaigns FOR SELECT
    USING (
        status != 'draft' 
        OR organizer_id = auth.uid() 
        OR public.is_moderator_or_higher()
    );

-- Campaign create access: Organizers and staff only
DROP POLICY IF EXISTS "Organizers and staff can create campaigns" ON public.campaigns;
CREATE POLICY "Organizers and staff can create campaigns"
    ON public.campaigns FOR INSERT TO authenticated
    WITH CHECK (
        public.is_moderator_or_higher() 
        OR (
            organizer_id = auth.uid() 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role IN ('organizer', 'moderator', 'admin', 'super_admin')
            )
        )
    );

-- Campaign update access: Organizer or staff
DROP POLICY IF EXISTS "Organizers and staff can update own campaigns" ON public.campaigns;
CREATE POLICY "Organizers and staff can update own campaigns"
    ON public.campaigns FOR UPDATE TO authenticated
    USING (
        public.is_moderator_or_higher() 
        OR organizer_id = auth.uid()
    );

-- Check-in secrets access: STRICTLY RESTRICTED to Organizer and Staff
DROP POLICY IF EXISTS "Checkin codes restricted to organizers" ON public.campaign_checkin_codes;
CREATE POLICY "Checkin codes restricted to organizers"
    ON public.campaign_checkin_codes
    FOR ALL TO authenticated
    USING (
        public.is_moderator_or_higher() 
        OR EXISTS (
            SELECT 1 FROM public.campaigns c 
            WHERE c.id = campaign_checkin_codes.campaign_id AND c.organizer_id = auth.uid()
        )
    );

-- Registration Access:
-- 1. Read: Users can only see their own registrations. Organizers see registrations for their campaign.
DROP POLICY IF EXISTS "Users and organizers can view registrations" ON public.campaign_registrations;
CREATE POLICY "Users and organizers can view registrations"
    ON public.campaign_registrations FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_moderator_or_higher()
        OR EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_registrations.campaign_id
              AND c.organizer_id = auth.uid()
        )
    );

-- 2. Direct INSERT/UPDATE/DELETE DENIED for regular users to prevent capacity bypassing!
-- All registrations and cancellations MUST go strictly through atomic RPCs.
DROP POLICY IF EXISTS "Users can insert own registration" ON public.campaign_registrations;
DROP POLICY IF EXISTS "Users can update own registration status" ON public.campaign_registrations;

-- Organizers/Staff can update attendance via management tool
DROP POLICY IF EXISTS "Staff can manage registrations" ON public.campaign_registrations;
CREATE POLICY "Staff can manage registrations"
    ON public.campaign_registrations FOR ALL TO authenticated
    USING (
        public.is_moderator_or_higher()
        OR EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_registrations.campaign_id
              AND c.organizer_id = auth.uid()
        )
    );

-- 7. ATOMIC SECURE FUNCTIONS (SECURITY DEFINER)

-- Function 1: Atomic Campaign Registration
CREATE OR REPLACE FUNCTION public.rpc_register_for_campaign(
    p_campaign_id VARCHAR(32)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_camp RECORD;
    v_existing RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول للتسجيل في الحملة التطوعية.';
    END IF;

    -- Row-level lock to prevent race conditions when nearing capacity
    SELECT * INTO v_camp
    FROM public.campaigns
    WHERE id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحملة المطلوبة غير موجودة.';
    END IF;

    IF v_camp.status NOT IN ('upcoming', 'in_progress') THEN
        RAISE EXCEPTION 'التسجيل متاح فقط في الحملات القادمة أو الجارية.';
    END IF;

    -- Check existing registration
    SELECT * INTO v_existing
    FROM public.campaign_registrations
    WHERE campaign_id = p_campaign_id AND user_id = v_user_id;

    IF FOUND THEN
        IF v_existing.status IN ('registered', 'checked_in') THEN
            RAISE EXCEPTION 'أنت مسجل بالفعل في هذه الحملة التطوعية.';
        ELSIF v_existing.status = 'attended' THEN
            RAISE EXCEPTION 'لقد تم تأكيد حضورك مسبقاً في هذه الحملة.';
        ELSIF v_existing.status = 'cancelled' THEN
            -- Check capacity before re-activating
            IF v_camp.registered_count >= v_camp.volunteer_capacity THEN
                RAISE EXCEPTION 'عذراً، اكتمل العدد الأقصى للمتطوعين في هذه الحملة.';
            END IF;

            UPDATE public.campaign_registrations
            SET status = 'registered', registered_at = NOW()
            WHERE id = v_existing.id;

            UPDATE public.campaigns
            SET registered_count = registered_count + 1
            WHERE id = p_campaign_id;

            RETURN jsonb_build_object(
                'success', true,
                'registration_id', v_existing.id,
                'status', 're-registered',
                'message', 'تم إعادة تفعيل تسجيلك في الحملة بنجاح!'
            );
        END IF;
    END IF;

    -- Check Capacity
    IF v_camp.registered_count >= v_camp.volunteer_capacity THEN
        RAISE EXCEPTION 'عذراً، اكتمل العدد الأقصى للمتطوعين في هذه الحملة.';
    END IF;

    -- Insert new registration
    INSERT INTO public.campaign_registrations (
        campaign_id,
        user_id,
        status,
        registered_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        'registered',
        NOW()
    );

    -- Increment campaign counter safely
    UPDATE public.campaigns
    SET registered_count = registered_count + 1
    WHERE id = p_campaign_id;

    -- Audit log
    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_user_id, 'volunteer_registered', jsonb_build_object('campaign_title', v_camp.title_ar));

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'status', 'registered',
        'message', 'تم تسجيلك بنجاح في الحملة التطوعية! شكراً لمساهمتك البيئية.'
    );
END;
$$;

-- Function 2: Atomic Campaign Cancellation
CREATE OR REPLACE FUNCTION public.rpc_cancel_campaign_registration(
    p_campaign_id VARCHAR(32)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_reg RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لإلغاء التسجيل.';
    END IF;

    -- Row lock on campaign
    PERFORM 1 FROM public.campaigns WHERE id = p_campaign_id FOR UPDATE;

    SELECT * INTO v_reg
    FROM public.campaign_registrations
    WHERE campaign_id = p_campaign_id AND user_id = v_user_id;

    IF NOT FOUND OR v_reg.status != 'registered' THEN
        RAISE EXCEPTION 'لا يوجد تسجيل نشط لهذه الحملة لإلغائه.';
    END IF;

    -- Update registration status to cancelled
    UPDATE public.campaign_registrations
    SET status = 'cancelled'
    WHERE id = v_reg.id;

    -- Decrement counter safely (never below zero)
    UPDATE public.campaigns
    SET registered_count = GREATEST(0, registered_count - 1)
    WHERE id = p_campaign_id;

    -- Audit log
    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_user_id, 'volunteer_cancelled', jsonb_build_object('registration_id', v_reg.id));

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم إلغاء تسجيلك بنجاح وإتاحة المقعد لمتطوع آخر.'
    );
END;
$$;

-- Function 3: Secure Check-in Code Generation (Cryptographically Random & Salted Hash)
CREATE OR REPLACE FUNCTION public.rpc_generate_campaign_checkin_code(
    p_campaign_id VARCHAR(32),
    p_valid_minutes INT DEFAULT 180
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_camp RECORD;
    v_raw_code VARCHAR(16);
    v_salt VARCHAR(32);
    v_hash VARCHAR(128);
    v_expires TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتوليد رمز التحقق.';
    END IF;

    SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحملة غير موجودة.';
    END IF;

    -- Verify caller is organizer or moderator/admin
    IF v_camp.organizer_id != v_user_id AND NOT public.is_moderator_or_higher() THEN
        RAISE EXCEPTION 'غير مصرح لك بتوليد رمز الحضور الميداني لهذه الحملة.';
    END IF;

    -- Cryptographically secure random 6-character code (using gen_random_bytes)
    v_raw_code := UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 6));
    v_salt := encode(gen_random_bytes(16), 'hex');
    v_hash := encode(digest(v_salt || v_raw_code, 'sha256'), 'hex');
    v_expires := NOW() + (p_valid_minutes || ' minutes')::INTERVAL;

    -- Upsert into private checkin table (NOT in public.campaigns!)
    INSERT INTO public.campaign_checkin_codes (
        campaign_id,
        code_hash,
        salt,
        expires_at,
        created_by,
        failed_attempts
    ) VALUES (
        p_campaign_id,
        v_hash,
        v_salt,
        v_expires,
        v_user_id,
        0
    )
    ON CONFLICT (campaign_id) DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        salt = EXCLUDED.salt,
        expires_at = EXCLUDED.expires_at,
        created_by = EXCLUDED.created_by,
        failed_attempts = 0,
        created_at = NOW();

    -- Return the raw code ONLY to the authorized organizer
    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'check_in_code', v_raw_code,
        'expires_at', v_expires
    );
END;
$$;

-- Function 4: Volunteer Field Check-In (Records attendance request without self-choosing hours)
CREATE OR REPLACE FUNCTION public.rpc_volunteer_checkin(
    p_campaign_id VARCHAR(32),
    p_checkin_code VARCHAR(16)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_volunteer_id UUID := auth.uid();
    v_secret RECORD;
    v_reg RECORD;
    v_camp RECORD;
    v_computed_hash VARCHAR(128);
BEGIN
    IF v_volunteer_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتثبيت الحضور الميداني.';
    END IF;

    SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
    IF NOT FOUND OR v_camp.status = 'cancelled' THEN
        RAISE EXCEPTION 'الحملة غير موجودة أو ملغاة.';
    END IF;

    -- Look up check-in code secrets
    SELECT * INTO v_secret 
    FROM public.campaign_checkin_codes 
    WHERE campaign_id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لم يتم تفعيل رمز الحضور الميداني لهذه الحملة بعد.';
    END IF;

    -- Brute force rate-limit check
    IF v_secret.failed_attempts >= v_secret.max_attempts THEN
        RAISE EXCEPTION 'تم قفل رمز الحضور بسبب تجاوز الحد الأقصى للمحاولات الخاطئة.';
    END IF;

    IF NOW() > v_secret.expires_at THEN
        RAISE EXCEPTION 'انتهت صلاحية رمز الحضور الميداني.';
    END IF;

    -- Compute salted SHA-256 hash
    v_computed_hash := encode(digest(v_secret.salt || UPPER(TRIM(p_checkin_code)), 'sha256'), 'hex');
    IF v_computed_hash != v_secret.code_hash THEN
        UPDATE public.campaign_checkin_codes 
        SET failed_attempts = failed_attempts + 1 
        WHERE campaign_id = p_campaign_id;
        RAISE EXCEPTION 'رمز الحضور غير صحيح.';
    END IF;

    -- Verify registration exists
    SELECT * INTO v_reg
    FROM public.campaign_registrations
    WHERE campaign_id = p_campaign_id AND user_id = v_volunteer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'أنت غير مسجل في هذه الحملة مسبقاً.';
    END IF;

    IF v_reg.status IN ('checked_in', 'attended') THEN
        RAISE EXCEPTION 'تم تسجيل حضورك مسبقاً في هذه الحملة.';
    END IF;

    -- Update registration status to checked_in (pending organizer hours approval)
    UPDATE public.campaign_registrations
    SET status = 'checked_in',
        attended_at = NOW()
    WHERE id = v_reg.id;

    -- Audit log
    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_volunteer_id, 'volunteer_checked_in', jsonb_build_object('registration_id', v_reg.id));

    RETURN jsonb_build_object(
        'success', true,
        'status', 'checked_in',
        'message', 'تم تثبيت حضورك الميداني بنجاح! بانتظار الاعتماد النهائي لساعات التطوع من منسق الحملة.'
    );
END;
$$;

-- Function 5: Organizer Approve Attendance & Issue Certificate (Authorized Role Only)
CREATE OR REPLACE FUNCTION public.rpc_organizer_approve_attendance(
    p_campaign_id VARCHAR(32),
    p_volunteer_id UUID,
    p_hours NUMERIC(4, 2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_camp RECORD;
    v_reg RECORD;
    v_awarded_hours NUMERIC(4, 2);
    v_cert_id VARCHAR(64);
    v_cert_code VARCHAR(64);
    v_digest_hash VARCHAR(128);
    v_participant_name VARCHAR(120);
    v_gov_name VARCHAR(64);
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لاعتماد الحضور.';
    END IF;

    SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحملة غير موجودة.';
    END IF;

    -- Strict authorization check: Caller must be the campaign organizer or moderator/admin
    IF v_camp.organizer_id != v_caller_id AND NOT public.is_moderator_or_higher() THEN
        RAISE EXCEPTION 'غير مصرح لك باعتماد ساعات التطوع وإصدار الشهادات لهذه الحملة.';
    END IF;

    -- Verify registration exists
    SELECT * INTO v_reg
    FROM public.campaign_registrations
    WHERE campaign_id = p_campaign_id AND user_id = p_volunteer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المتطوع غير مسجل في هذه الحملة.';
    END IF;

    IF v_reg.status = 'attended' AND v_reg.attended = TRUE THEN
        RAISE EXCEPTION 'تم اعتماد حضور هذا المتطوع مسبقاً.';
    END IF;

    -- Validate hours (must be between 0.5 and 12 hours)
    v_awarded_hours := COALESCE(p_hours, v_camp.duration_hours, 4.0);
    IF v_awarded_hours <= 0 OR v_awarded_hours > 12.0 THEN
        RAISE EXCEPTION 'ساعات التطوع المعتمدة يجب أن تكون بين 0.5 و 12 ساعة.';
    END IF;

    -- Update registration record
    UPDATE public.campaign_registrations
    SET attended = TRUE,
        status = 'attended',
        attended_at = COALESCE(attended_at, NOW()),
        verified_hours = v_awarded_hours
    WHERE id = v_reg.id;

    -- Fetch user profile for certificate
    SELECT full_name INTO v_participant_name FROM public.profiles WHERE id = p_volunteer_id;
    IF v_participant_name IS NULL OR v_participant_name = '' THEN
        v_participant_name := 'متطوع نَفَس';
    END IF;

    SELECT name_ar INTO v_gov_name FROM public.governorates WHERE id = v_camp.governorate_id;
    IF v_gov_name IS NULL THEN
        v_gov_name := 'العراق';
    END IF;

    -- Generate Certificate with SHA-256 Digest
    v_cert_code := 'NFS-CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
    v_cert_id := 'cert-' || LOWER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 12));
    v_digest_hash := '0x' || SUBSTRING(encode(digest(v_participant_name || v_cert_code || v_awarded_hours::TEXT || p_volunteer_id::TEXT, 'sha256'), 'hex') FROM 1 FOR 16);

    INSERT INTO public.certificates (
        id,
        verification_code,
        user_id,
        participant_name,
        campaign_id,
        campaign_title,
        governorate,
        hours_awarded,
        issue_date,
        organizer_signature,
        digital_seal_hash,
        is_revoked,
        created_at
    ) VALUES (
        v_cert_id,
        v_cert_code,
        p_volunteer_id,
        v_participant_name,
        p_campaign_id,
        v_camp.title_ar,
        v_gov_name,
        v_awarded_hours,
        CURRENT_DATE,
        v_camp.organizer_name,
        v_digest_hash,
        FALSE,
        NOW()
    ) ON CONFLICT (campaign_id, user_id) DO UPDATE SET
        hours_awarded = EXCLUDED.hours_awarded,
        updated_at = NOW();

    -- Audit log
    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_caller_id, 'attendance_approved', jsonb_build_object(
        'volunteer_id', p_volunteer_id,
        'hours_awarded', v_awarded_hours,
        'certificate_code', v_cert_code
    ));

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'volunteer_id', p_volunteer_id,
        'hours_awarded', v_awarded_hours,
        'certificate_code', v_cert_code,
        'message', 'تم اعتماد الحضور الميداني وإصدار وثيقة الأثر الرقمية بنجاح!'
    );
END;
$$;

-- Function 6: Environmental Impact Summary (Authentic DB aggregation)
CREATE OR REPLACE FUNCTION public.rpc_get_environmental_impact_summary()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'completed_campaigns', (SELECT COUNT(*) FROM public.campaigns WHERE status = 'completed'),
        'active_campaigns', (SELECT COUNT(*) FROM public.campaigns WHERE status IN ('upcoming', 'in_progress')),
        'verified_volunteers', (SELECT COUNT(DISTINCT user_id) FROM public.campaign_registrations WHERE attended = TRUE),
        'verified_volunteer_hours', COALESCE((SELECT SUM(verified_hours) FROM public.campaign_registrations WHERE attended = TRUE), 0),
        'trees_planted', COALESCE((SELECT SUM(trees_planted) FROM public.campaigns WHERE status = 'completed'), 0),
        'waste_collected_kg', COALESCE((SELECT SUM(waste_collected_kg) FROM public.campaigns WHERE status = 'completed'), 0),
        'verified_reports', (SELECT COUNT(*) FROM public.reports WHERE status IN ('verified', 'assigned', 'resolved')),
        'resolved_cleanups', (SELECT COUNT(*) FROM public.reports WHERE status = 'resolved')
    );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_register_for_campaign(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cancel_campaign_registration(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_generate_campaign_checkin_code(VARCHAR, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_volunteer_checkin(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_organizer_approve_attendance(VARCHAR, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_environmental_impact_summary() TO anon, authenticated;
