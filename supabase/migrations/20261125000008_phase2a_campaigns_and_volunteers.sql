-- =============================================================================
-- MIGRATION 008: NAFAS IRAQ — PHASE 2A: CAMPAIGN LIFECYCLE & VOLUNTEER ATTENDANCE
-- =============================================================================
-- Purpose:
-- 1. Extend campaigns with types (reforestation, cleanup, recycling, education, river_protection, biodiversity)
-- 2. Add geographic coordinates (meeting_lat, meeting_lng) for map integration
-- 3. Add field metrics (waste_collected_kg, trees_planted)
-- 4. Secure atomic campaign registration & cancellation RPCs with row-level locks
-- 5. Field check-in code generation and server-validated attendance verification
-- 6. Comprehensive RLS policies for campaigns and registrations
-- =============================================================================

-- 1. CAMPAIGN TABLE EXTENSIONS
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

    -- Coordinates for Map Integration
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

    -- Waste collected metric (for cleanups)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'waste_collected_kg'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN waste_collected_kg NUMERIC(8, 2) DEFAULT 0;
    END IF;

    -- Check-in Code & Expiration for Field Attendance
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'check_in_code'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN check_in_code VARCHAR(16);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'check_in_code_expires_at'
    ) THEN
        ALTER TABLE public.campaigns ADD COLUMN check_in_code_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update status constraint on campaigns to include 'draft'
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
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'registered' 
        CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'campaign_registrations' AND column_name = 'attended_at'
    ) THEN
        ALTER TABLE public.campaign_registrations ADD COLUMN attended_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. CAMPAIGN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.campaign_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(32) NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_audit_logs_campaign ON public.campaign_audit_logs(campaign_id);

-- 4. RLS POLICIES FOR CAMPAIGNS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_audit_logs ENABLE ROW LEVEL SECURITY;

-- Campaign read access:
-- Anyone (guests + authenticated) can view non-draft campaigns.
-- Organizers and staff can view draft campaigns they own or manage.
DROP POLICY IF EXISTS "Public can view published campaigns" ON public.campaigns;
CREATE POLICY "Public can view published campaigns"
    ON public.campaigns FOR SELECT
    USING (
        status != 'draft' 
        OR organizer_id = auth.uid() 
        OR public.is_moderator_or_higher()
    );

-- Campaign create access:
-- Organizers and staff can insert campaigns.
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

-- Campaign update access:
-- Campaign organizer or staff can update.
DROP POLICY IF EXISTS "Organizers and staff can update own campaigns" ON public.campaigns;
CREATE POLICY "Organizers and staff can update own campaigns"
    ON public.campaigns FOR UPDATE TO authenticated
    USING (
        public.is_moderator_or_higher() 
        OR organizer_id = auth.uid()
    );

-- 5. RLS POLICIES FOR REGISTRATIONS
-- Users can see their own registrations.
-- Organizers can see registrations for campaigns they organize.
-- Staff can see all registrations.
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

-- Direct user insert allowed for own registrations
DROP POLICY IF EXISTS "Users can insert own registration" ON public.campaign_registrations;
CREATE POLICY "Users can insert own registration"
    ON public.campaign_registrations FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- Direct update restricted: users can cancel own registration, organizers can update attendance
DROP POLICY IF EXISTS "Users can update own registration status" ON public.campaign_registrations;
CREATE POLICY "Users can update own registration status"
    ON public.campaign_registrations FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() 
        OR public.is_moderator_or_higher()
        OR EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = campaign_registrations.campaign_id
              AND c.organizer_id = auth.uid()
        )
    );

-- 6. ATOMIC SECURE FUNCTIONS (SECURITY DEFINER)

-- Function A: Register for Campaign (prevents race conditions via row lock)
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

    -- Lock campaign row to prevent race conditions when nearing capacity
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
        IF v_existing.status = 'registered' THEN
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

-- Function B: Cancel Registration
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

    -- Lock campaign row
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

-- Function C: Generate Attendance Code (Organizer/Staff only)
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
    v_code VARCHAR(16);
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

    -- Generate random 6-character uppercase alphanumeric code
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    v_expires := NOW() + (p_valid_minutes || ' minutes')::INTERVAL;

    UPDATE public.campaigns
    SET check_in_code = v_code,
        check_in_code_expires_at = v_expires
    WHERE id = p_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'campaign_id', p_campaign_id,
        'check_in_code', v_code,
        'expires_at', v_expires
    );
END;
$$;

-- Function D: Field Attendance Verification (Volunteer or Organizer Check-in)
CREATE OR REPLACE FUNCTION public.rpc_verify_campaign_attendance(
    p_campaign_id VARCHAR(32),
    p_volunteer_id UUID,
    p_checkin_code VARCHAR(16),
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
    v_profile RECORD;
    v_awarded_hours NUMERIC(4, 2);
    v_cert_id VARCHAR(64);
    v_cert_code VARCHAR(64);
    v_digital_hash VARCHAR(64);
    v_participant_name VARCHAR(120);
    v_gov_name VARCHAR(64);
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتأكيد الحضور الميداني.';
    END IF;

    SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحملة غير موجودة.';
    END IF;

    IF v_camp.status = 'cancelled' THEN
        RAISE EXCEPTION 'الحملة ملغاة ولا يمكن تسجيل الحضور فيها.';
    END IF;

    -- Determine volunteer being checked in
    -- If volunteer_id is omitted or caller is volunteer, check in caller
    IF p_volunteer_id IS NULL OR p_volunteer_id = v_caller_id THEN
        p_volunteer_id := v_caller_id;
        
        -- Self check-in requires a valid, unexpired check-in code
        IF v_camp.check_in_code IS NULL 
           OR UPPER(TRIM(p_checkin_code)) != UPPER(TRIM(v_camp.check_in_code)) 
           OR NOW() > v_camp.check_in_code_expires_at THEN
            RAISE EXCEPTION 'رمز الحضور غير صحيح أو انتهت صلاحيته.';
        END IF;
    ELSE
        -- Checking in another user requires organizer or moderator/admin privileges
        IF v_camp.organizer_id != v_caller_id AND NOT public.is_moderator_or_higher() THEN
            RAISE EXCEPTION 'غير مصرح لك بتأكيد حضور متطوع آخر دون صلاحية تنظيمية.';
        END IF;
    END IF;

    -- Verify registration exists
    SELECT * INTO v_reg
    FROM public.campaign_registrations
    WHERE campaign_id = p_campaign_id AND user_id = p_volunteer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المتطوع غير مسجل في هذه الحملة مسبقاً.';
    END IF;

    -- Idempotency check: prevent duplicate hours or certificates
    IF v_reg.attended = TRUE AND v_reg.status = 'attended' THEN
        RAISE EXCEPTION 'تم تأكيد حضور هذا المتطوع مسبقاً لهذه الحملة.';
    END IF;

    -- Calculate awarded hours
    v_awarded_hours := COALESCE(p_hours, v_camp.duration_hours, 4.0);

    -- Update registration record
    UPDATE public.campaign_registrations
    SET attended = TRUE,
        status = 'attended',
        attended_at = NOW(),
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

    -- Generate Unique Certificate
    v_cert_code := 'NFS-CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(MD5(p_volunteer_id::TEXT || p_campaign_id || NOW()::TEXT) FROM 1 FOR 8));
    v_cert_id := 'cert-' || LOWER(SUBSTRING(MD5(v_cert_code) FROM 1 FOR 12));
    v_digital_hash := '0x' || SUBSTRING(MD5(v_participant_name || v_cert_code || v_awarded_hours::TEXT) FROM 1 FOR 16);

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
        v_digital_hash,
        FALSE,
        NOW()
    ) ON CONFLICT (verification_code) DO NOTHING;

    -- Audit log
    INSERT INTO public.campaign_audit_logs (campaign_id, actor_id, action, details)
    VALUES (p_campaign_id, v_caller_id, 'attendance_verified', jsonb_build_object(
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
        'message', 'تم تأكيد الحضور الميداني وإصدار وثيقة المشاركة البيئية بنجاح!'
    );
END;
$$;

-- Function E: Real Impact Summary from Production Database Rows
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

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.rpc_register_for_campaign(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cancel_campaign_registration(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_generate_campaign_checkin_code(VARCHAR, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_campaign_attendance(VARCHAR, UUID, VARCHAR, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_environmental_impact_summary() TO anon, authenticated;
