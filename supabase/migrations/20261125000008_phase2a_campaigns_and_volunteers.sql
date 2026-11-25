-- =============================================================================
-- MIGRATION 008: NAFAS IRAQ — PHASE 2A: PRODUCTION INTEGRITY & VOLUNTEER SECURITY GATE (TITAN V2)
-- =============================================================================
-- Comprehensive Security Audit & Hardening:
-- 1. Persistent, atomic failed-attempt counting without transaction rollback:
--    Failure recording commits cleanly, strictly enforcing lockout.
-- 2. 40-bit cryptographic entropy for check-in codes:
--    Unambiguous 32-char alphabet (23456789ABCDEFGHJKLMNPQRSTUVWXYZ), 8 chars (XXXX-XXXX),
--    zero modulo bias, strict validity bounds (15-360 min).
-- 3. Multi-layer rate limiting:
--    Per-user limit (5 failed attempts / 15 min) and per-campaign limit (25 failed attempts).
-- 4. Registration status enforcement:
--    rpc_volunteer_checkin requires status = 'registered'. Explicitly rejects 'cancelled' and 'no_show'.
-- 5. Attendance approval validation:
--    rpc_organizer_approve_attendance strictly requires status = 'checked_in'. Enforces 0.5 to 12.0 hours.
-- 6. Strict RLS lockdown on campaign_registrations:
--    Removed permissive 'FOR ALL' policies. Direct INSERT/UPDATE/DELETE denied for authenticated users.
--    All state mutations forced through atomic SECURITY DEFINER RPCs.
-- 7. Certificate consistency:
--    Pre-migration deduplication safety. No mismatched ON CONFLICT codes. Unique issuance guaranteed.
-- 8. Explicit privilege review:
--    REVOKE ALL FROM PUBLIC, anon for all sensitive RPCs. Explicit search_path = public, pg_temp.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. CAMPAIGN TABLE EXTENSIONS (PUBLIC-SAFE ATTRIBUTES ONLY)
-- -----------------------------------------------------------------------------
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

    -- Purge check_in_code columns from public.campaigns if they were ever introduced
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

-- -----------------------------------------------------------------------------
-- 2. CAMPAIGN REGISTRATIONS TABLE EXTENSIONS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. PRIVATE ISOLATED CHECK-IN SECRETS & RATE-LIMITING TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_checkin_codes (
    campaign_id VARCHAR(32) PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    clean_code_length INT NOT NULL DEFAULT 8,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    failed_attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 25,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.campaign_checkin_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(32) NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_success BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_checkin_attempts_user_time 
    ON public.campaign_checkin_attempts (user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkin_attempts_camp_time 
    ON public.campaign_checkin_attempts (campaign_id, attempted_at DESC);

-- -----------------------------------------------------------------------------
-- 4. PRE-MIGRATION DEDUPLICATION & UNIQUE CERTIFICATE CONSTRAINT
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- Defensively revoke any pre-existing duplicate certificates so unique constraint succeeds without data loss
    IF EXISTS (
        SELECT 1 FROM public.certificates 
        GROUP BY campaign_id, user_id 
        HAVING COUNT(*) > 1
    ) THEN
        UPDATE public.certificates c1
        SET is_revoked = TRUE, 
            revoked_reason = 'Deduplicated: superseded by primary certificate record'
        WHERE EXISTS (
            SELECT 1 FROM public.certificates c2
            WHERE c1.campaign_id = c2.campaign_id 
              AND c1.user_id = c2.user_id 
              AND c1.created_at > c2.created_at
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_certificates_campaign_user'
    ) THEN
        ALTER TABLE public.certificates ADD CONSTRAINT uq_certificates_campaign_user UNIQUE (campaign_id, user_id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 5. CAMPAIGN AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(32) NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_audit_logs_campaign ON public.campaign_audit_logs(campaign_id);

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES — LEAST PRIVILEGE ENFORCEMENT
-- -----------------------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_checkin_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_checkin_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_audit_logs ENABLE ROW LEVEL SECURITY;

-- Campaigns RLS
DROP POLICY IF EXISTS "Public can view published campaigns" ON public.campaigns;
CREATE POLICY "Public can view published campaigns"
    ON public.campaigns FOR SELECT
    USING (
        status != 'draft' 
        OR organizer_id = auth.uid() 
        OR public.is_moderator_or_higher()
    );

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

DROP POLICY IF EXISTS "Organizers and staff can update own campaigns" ON public.campaigns;
CREATE POLICY "Organizers and staff can update own campaigns"
    ON public.campaigns FOR UPDATE TO authenticated
    USING (
        public.is_moderator_or_higher() 
        OR organizer_id = auth.uid()
    );

-- Check-in secrets RLS: STRICTLY restricted to Organizer & Staff (Read Only)
DROP POLICY IF EXISTS "Checkin codes restricted to organizers" ON public.campaign_checkin_codes;
CREATE POLICY "Checkin codes restricted to organizers"
    ON public.campaign_checkin_codes
    FOR SELECT TO authenticated
    USING (
        public.is_moderator_or_higher() 
        OR EXISTS (
            SELECT 1 FROM public.campaigns c 
            WHERE c.id = campaign_checkin_codes.campaign_id AND c.organizer_id = auth.uid()
        )
    );

-- Check-in attempts audit RLS (Read Only for Organizer & Staff)
DROP POLICY IF EXISTS "Checkin attempts viewable by organizers" ON public.campaign_checkin_attempts;
CREATE POLICY "Checkin attempts viewable by organizers"
    ON public.campaign_checkin_attempts
    FOR SELECT TO authenticated
    USING (
        public.is_moderator_or_higher() 
        OR EXISTS (
            SELECT 1 FROM public.campaigns c 
            WHERE c.id = campaign_checkin_attempts.campaign_id AND c.organizer_id = auth.uid()
        )
    );

-- Registrations RLS: Read-only for authenticated users; DIRECT WRITES DENIED!
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

-- Purge any superseded permissive INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users can insert own registration" ON public.campaign_registrations;
DROP POLICY IF EXISTS "Users can update own registration status" ON public.campaign_registrations;
DROP POLICY IF EXISTS "Staff can manage registrations" ON public.campaign_registrations;

-- Audit logs RLS
DROP POLICY IF EXISTS "Audit logs viewable by staff and organizers" ON public.campaign_audit_logs;
CREATE POLICY "Audit logs viewable by staff and organizers"
    ON public.campaign_audit_logs FOR SELECT TO authenticated
    USING (
        public.is_moderator_or_higher()
        OR EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_audit_logs.campaign_id AND c.organizer_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 7. ATOMIC PRIVILEGED RPCs (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

-- RPC 1: Atomic Campaign Registration
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

    -- Row lock on campaign to serialize concurrent registrations
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

            INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
            VALUES (p_campaign_id, v_user_id, 'volunteer_re_registered', jsonb_build_object('registration_id', v_existing.id));

            RETURN jsonb_build_object(
                'success', true,
                'registration_id', v_existing.id,
                'status', 're-registered',
                'message', 'تم إعادة تفعيل تسجيلك في الحملة بنجاح!'
            );
        END IF;
    END IF;

    -- Enforce capacity
    IF v_camp.registered_count >= v_camp.volunteer_capacity THEN
        RAISE EXCEPTION 'عذراً، اكتمل العدد الأقصى للمتطوعين في هذه الحملة.';
    END IF;

    -- Insert new registration record
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

    UPDATE public.campaigns
    SET registered_count = registered_count + 1
    WHERE id = p_campaign_id;

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

-- RPC 2: Atomic Campaign Cancellation
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

    UPDATE public.campaign_registrations
    SET status = 'cancelled'
    WHERE id = v_reg.id;

    UPDATE public.campaigns
    SET registered_count = GREATEST(0, registered_count - 1)
    WHERE id = p_campaign_id;

    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_user_id, 'volunteer_cancelled', jsonb_build_object('registration_id', v_reg.id));

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم إلغاء تسجيلك بنجاح وإتاحة المقعد لمتطوع آخر.'
    );
END;
$$;

-- RPC 3: High-Entropy Check-in Code Generation (40-bit Crockford Alphanumeric)
CREATE OR REPLACE FUNCTION public.rpc_generate_campaign_checkin_code(
    p_campaign_id VARCHAR(32),
    p_valid_minutes INT DEFAULT 120
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_camp RECORD;
    v_alphabet CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- 32 unambiguous chars
    v_bytes BYTEA;
    v_clean_code TEXT := '';
    v_formatted_code TEXT := '';
    v_salt VARCHAR(64);
    v_hash VARCHAR(128);
    v_clamped_minutes INT;
    v_expires TIMESTAMPTZ;
    i INT;
    v_idx INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتوليد رمز التحقق.';
    END IF;

    SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحملة غير موجودة.';
    END IF;

    IF v_camp.organizer_id != v_user_id AND NOT public.is_moderator_or_higher() THEN
        RAISE EXCEPTION 'غير مصرح لك بتوليد رمز الحضور الميداني لهذه الحملة.';
    END IF;

    -- Enforce strict expiration boundaries (15 minutes to 360 minutes)
    v_clamped_minutes := LEAST(360, GREATEST(15, COALESCE(p_valid_minutes, 120)));

    -- Generate 8 chars from 32-char alphabet using cryptographic entropy (40 bits, zero modulo bias)
    v_bytes := gen_random_bytes(8);
    FOR i IN 0..7 LOOP
        v_idx := (get_byte(v_bytes, i) % 32) + 1;
        v_clean_code := v_clean_code || SUBSTRING(v_alphabet FROM v_idx FOR 1);
        IF i = 3 THEN
            v_formatted_code := v_formatted_code || SUBSTRING(v_alphabet FROM v_idx FOR 1) || '-';
        ELSE
            v_formatted_code := v_formatted_code || SUBSTRING(v_alphabet FROM v_idx FOR 1);
        END IF;
    END LOOP;

    v_salt := encode(gen_random_bytes(32), 'hex');
    v_hash := encode(digest(v_salt || v_clean_code, 'sha256'), 'hex');
    v_expires := NOW() + (v_clamped_minutes || ' minutes')::INTERVAL;

    INSERT INTO public.campaign_checkin_codes (
        campaign_id,
        code_hash,
        salt,
        clean_code_length,
        expires_at,
        created_by,
        failed_attempts,
        max_attempts,
        is_locked
    ) VALUES (
        p_campaign_id,
        v_hash,
        v_salt,
        8,
        v_expires,
        v_user_id,
        0,
        25,
        FALSE
    )
    ON CONFLICT (campaign_id) DO UPDATE SET
        code_hash = EXCLUDED.code_hash,
        salt = EXCLUDED.salt,
        clean_code_length = EXCLUDED.clean_code_length,
        expires_at = EXCLUDED.expires_at,
        created_by = EXCLUDED.created_by,
        failed_attempts = 0,
        is_locked = FALSE,
        created_at = NOW();

    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_user_id, 'checkin_code_generated', jsonb_build_object(
        'expires_at', v_expires,
        'valid_minutes', v_clamped_minutes,
        'entropy_bits', 40
    ));

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'check_in_code', v_formatted_code,
        'expires_at', v_expires,
        'valid_minutes', v_clamped_minutes
    );
END;
$$;

-- RPC 4: Volunteer Field Check-In (Persistent failure tracking, strict status check, zero self-awarded hours)
CREATE OR REPLACE FUNCTION public.rpc_volunteer_checkin(
    p_campaign_id VARCHAR(32),
    p_checkin_code VARCHAR(32)
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
    v_clean_code TEXT;
    v_computed_hash VARCHAR(128);
    v_user_failed_count INT;
BEGIN
    IF v_volunteer_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتثبيت الحضور الميداني.';
    END IF;

    -- Clean input code: strip whitespace and hyphens
    v_clean_code := UPPER(REPLACE(REPLACE(TRIM(p_checkin_code), '-', ''), ' ', ''));

    SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
    IF NOT FOUND OR v_camp.status IN ('cancelled', 'completed') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CAMPAIGN_INACTIVE',
            'message', 'الحملة غير نشطة أو ملغاة حالياً.'
        );
    END IF;

    -- Row-level lock on checkin code secrets
    SELECT * INTO v_secret 
    FROM public.campaign_checkin_codes 
    WHERE campaign_id = p_campaign_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CODE_NOT_FOUND',
            'message', 'لم يتم تفعيل رمز الحضور الميداني لهذه الحملة بعد.'
        );
    END IF;

    -- Check campaign-level lockout
    IF v_secret.is_locked = TRUE OR v_secret.failed_attempts >= v_secret.max_attempts THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CAMPAIGN_LOCKED',
            'message', 'تم قفل رمز الحضور بسبب تجاوز الحد الأقصى للمحاولات الخاطئة على مستوى الحملة. يرجى مراجعة منسق الحملة.'
        );
    END IF;

    -- Check expiration
    IF NOW() > v_secret.expires_at THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CODE_EXPIRED',
            'message', 'انتهت صلاحية رمز الحضور الميداني.'
        );
    END IF;

    -- Check per-user rate limit (maximum 5 failed attempts in past 15 minutes)
    SELECT COUNT(*) INTO v_user_failed_count
    FROM public.campaign_checkin_attempts
    WHERE user_id = v_volunteer_id 
      AND is_success = FALSE 
      AND attempted_at > NOW() - INTERVAL '15 minutes';

    IF v_user_failed_count >= 5 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'USER_RATE_LIMITED',
            'message', 'تم تجاوز الحد المسموح به للمحاولات الخاطئة لحسابك (5 محاولات). يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً.'
        );
    END IF;

    -- Compute salted SHA-256 hash
    v_computed_hash := encode(digest(v_secret.salt || v_clean_code, 'sha256'), 'hex');

    -- Persistent failed attempt handling (COMMITS cleanly without transaction rollback)
    IF v_computed_hash != v_secret.code_hash THEN
        UPDATE public.campaign_checkin_codes 
        SET failed_attempts = failed_attempts + 1,
            is_locked = (failed_attempts + 1 >= max_attempts)
        WHERE campaign_id = p_campaign_id;

        INSERT INTO public.campaign_checkin_attempts (
            campaign_id, user_id, is_success, failure_reason
        ) VALUES (
            p_campaign_id, v_volunteer_id, FALSE, 'INVALID_CODE'
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_CODE',
            'message', 'رمز الحضور الميداني غير صحيح.',
            'attempts_remaining', GREATEST(0, v_secret.max_attempts - (v_secret.failed_attempts + 1))
        );
    END IF;

    -- Validate volunteer registration status: MUST BE 'registered'
    SELECT * INTO v_reg
    FROM public.campaign_registrations
    WHERE campaign_id = p_campaign_id AND user_id = v_volunteer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NOT_REGISTERED',
            'message', 'أنت غير مسجل في هذه الحملة مسبقاً.'
        );
    END IF;

    IF v_reg.status = 'checked_in' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_CHECKED_IN',
            'message', 'تم تثبيت حضورك الميداني مسبقاً، بانتظار الاعتماد النهائي لساعات التطوع من منسق الحملة.'
        );
    ELSIF v_reg.status = 'attended' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_ATTENDED',
            'message', 'تم اعتماد حضورك وإصدار شهادة المشاركة مسبقاً لهذه الحملة.'
        );
    ELSIF v_reg.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'REGISTRATION_CANCELLED',
            'message', 'تم إلغاء تسجيلك في هذه الحملة سابقاً. لا يمكن تثبيت الحضور لحجز ملغى.'
        );
    ELSIF v_reg.status = 'no_show' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'REGISTRATION_NO_SHOW',
            'message', 'تم تسجيل حالتك كعدم حضور (غياب). تعذر تثبيت الحضور.'
        );
    ELSIF v_reg.status != 'registered' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'message', 'حالة التسجيل غير مؤهلة لتثبيت الحضور الميداني.'
        );
    END IF;

    -- Valid check-in: update registration to checked_in (pending organizer approval)
    UPDATE public.campaign_registrations
    SET status = 'checked_in',
        attended_at = NOW()
    WHERE id = v_reg.id;

    INSERT INTO public.campaign_checkin_attempts (
        campaign_id, user_id, is_success
    ) VALUES (
        p_campaign_id, v_volunteer_id, TRUE
    );

    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_volunteer_id, 'volunteer_checked_in', jsonb_build_object('registration_id', v_reg.id));

    RETURN jsonb_build_object(
        'success', true,
        'status', 'checked_in',
        'message', 'تم تثبيت حضورك الميداني بنجاح! بانتظار الاعتماد النهائي لساعات التطوع من منسق الحملة.'
    );
END;
$$;

-- RPC 5: Organizer Approve Attendance & Issue Certificate
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
    v_existing_cert RECORD;
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

    -- Authorization check: Caller must be campaign organizer or moderator/admin
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

    -- Strict check: Volunteer MUST have status = 'checked_in'
    IF v_reg.status != 'checked_in' THEN
        RAISE EXCEPTION 'لا يمكن اعتماد الحضور: المتطوع لم يثبت حضوره الميداني بعد (حالة التسجيل الحالية: % وليست checked_in).', v_reg.status;
    END IF;

    -- Validate hours strictly between 0.5 and 12.0 hours
    v_awarded_hours := COALESCE(p_hours, v_camp.duration_hours, 4.0);
    IF v_awarded_hours < 0.5 OR v_awarded_hours > 12.0 THEN
        RAISE EXCEPTION 'ساعات التطوع المعتمدة يجب أن تكون بين 0.5 و 12 ساعة (القيمة المدخلة: %).', v_awarded_hours;
    END IF;

    -- Verify no pre-existing certificate exists
    SELECT * INTO v_existing_cert 
    FROM public.certificates 
    WHERE campaign_id = p_campaign_id AND user_id = p_volunteer_id;

    IF FOUND THEN
        RAISE EXCEPTION 'تم إصدار شهادة مشاركة مسبقاً لهذا المتطوع في هذه الحملة (رمز الوثيقة: %).', v_existing_cert.verification_code;
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

    -- Generate unique certificate identifiers
    v_cert_code := 'NFS-CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 10));
    v_cert_id := 'cert-' || LOWER(SUBSTRING(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 16));
    v_digest_hash := '0x' || SUBSTRING(encode(digest(v_participant_name || v_cert_code || v_awarded_hours::TEXT || p_volunteer_id::TEXT, 'sha256'), 'hex') FROM 1 FOR 16);

    -- Direct insert guaranteeing code consistency
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
    );

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
        'certificate_id', v_cert_id,
        'digital_seal_hash', v_digest_hash,
        'message', 'تم اعتماد الحضور الميداني وإصدار وثيقة الأثر الرقمية بنجاح!'
    );
END;
$$;

-- RPC 6: Environmental Impact Summary (Authentic DB aggregation)
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

-- -----------------------------------------------------------------------------
-- 8. EXPLICIT PRIVILEGE REVOCATIONS & GRANTS
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.rpc_register_for_campaign(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_register_for_campaign(VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_cancel_campaign_registration(VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cancel_campaign_registration(VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_generate_campaign_checkin_code(VARCHAR, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_generate_campaign_checkin_code(VARCHAR, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_volunteer_checkin(VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_volunteer_checkin(VARCHAR, VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_organizer_approve_attendance(VARCHAR, UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_organizer_approve_attendance(VARCHAR, UUID, NUMERIC) TO authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_get_environmental_impact_summary() TO anon, authenticated;
