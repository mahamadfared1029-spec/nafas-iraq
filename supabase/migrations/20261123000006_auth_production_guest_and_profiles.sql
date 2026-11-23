-- =============================================================================
-- NAFAS (نَفَس) — MIGRATION 006
-- Authentication UX, Automatic Citizen Profile Trigger, Guest Read-Only RLS & Founder Admin PIN
-- Forward-only migration adhering to zero-trust security standards
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AUTOMATIC CITIZEN PROFILE CREATION TRIGGER (ON auth.users)
-- Ensures every new registration (Email or Google OAuth) gets an authoritative
-- citizen profile row immediately created by the database engine.
-- Prevents duplicate profiles via ON CONFLICT (id) DO NOTHING.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        governorate_id,
        points,
        is_verified_volunteer,
        mfa_enabled,
        is_suspended,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            'مواطن نَفَس'
        ),
        'citizen', -- Authoritative default: always citizen
        COALESCE(NEW.raw_user_meta_data->>'governorate_id', 'baghdad'),
        0,
        FALSE,
        FALSE,
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. TRUE GUEST READ-ONLY ACCESS TO CAMPAIGNS & CIVIC DATA
-- Guests (anon) may view campaigns, but cannot register, earn points or modify data.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published campaigns" ON public.campaigns;
CREATE POLICY "Public can view published campaigns"
    ON public.campaigns FOR SELECT
    USING (status != 'draft' OR public.is_admin_or_super() OR public.current_user_role() = 'organizer');

DROP POLICY IF EXISTS "Organizers and admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Organizers and admins can manage campaigns"
    ON public.campaigns FOR ALL
    USING (public.is_admin_or_super() OR public.current_user_role() = 'organizer');

GRANT SELECT ON public.campaigns TO anon, authenticated;

-- Campaign Registrations:
DROP POLICY IF EXISTS "Authenticated users can register for campaigns" ON public.campaign_registrations;
CREATE POLICY "Authenticated users can register for campaigns"
    ON public.campaign_registrations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Volunteers and staff can view registrations" ON public.campaign_registrations;
CREATE POLICY "Volunteers and staff can view registrations"
    ON public.campaign_registrations FOR SELECT
    USING (
        user_id = auth.uid() 
        OR public.is_admin_or_super() 
        OR public.current_user_role() = 'organizer'
    );

DROP POLICY IF EXISTS "Volunteers can cancel own registration" ON public.campaign_registrations;
CREATE POLICY "Volunteers can cancel own registration"
    ON public.campaign_registrations FOR DELETE
    USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.campaign_registrations TO authenticated;
REVOKE ALL ON public.campaign_registrations FROM anon;

-- Ensure reports table completely revokes anon insertion at SQL privilege level
REVOKE INSERT, UPDATE, DELETE ON public.reports FROM anon;

-- -----------------------------------------------------------------------------
-- 3. FOUNDER ADMIN PIN VAULT (OWNER-ONLY WITH AAL2 PROTECTION)
-- Dedicated encrypted vault for founder administrative secondary PIN.
-- Stored with high-cost salt and hash. Never accessible to anon or ordinary users.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_admin_pin (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.founder_admin_pin ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.founder_admin_pin FROM anon, authenticated;

DROP POLICY IF EXISTS "Founder PIN vault restricted to super admin with AAL2" ON public.founder_admin_pin;
CREATE POLICY "Founder PIN vault restricted to super admin with AAL2"
    ON public.founder_admin_pin FOR ALL
    USING (
        public.current_user_role() = 'super_admin'
        AND (auth.jwt() ->> 'aal') = 'aal2'
    );

-- Set / Change Founder PIN RPC
CREATE OR REPLACE FUNCTION public.set_founder_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT := public.current_user_role();
    v_aal TEXT := auth.jwt() ->> 'aal';
    v_clean_pin TEXT := trim(p_pin);
    v_salt TEXT;
    v_hash TEXT;
BEGIN
    IF v_user_id IS NULL OR v_role != 'super_admin' OR v_aal != 'aal2' THEN
        RAISE EXCEPTION 'غير مصرح: ضبط الرمز السري الإداري يتطلب جلسة موثقة للمشرف العام بمستوى AAL2.';
    END IF;

    IF length(v_clean_pin) < 4 OR length(v_clean_pin) > 8 OR v_clean_pin !~ '^[0-9]+$' THEN
        RAISE EXCEPTION 'الرمز السري يجب أن يتكون من 4 إلى 8 أرقام فقط.';
    END IF;

    v_salt := gen_random_uuid()::text;
    v_hash := crypt(v_clean_pin || v_salt, gen_salt('bf', 10));

    INSERT INTO public.founder_admin_pin (user_id, pin_hash, salt, failed_attempts, locked_until, updated_at)
    VALUES (v_user_id, v_hash, v_salt, 0, NULL, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        salt = EXCLUDED.salt,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW();

    INSERT INTO public.admin_audit_logs (actor_id, actor_email, action, target_type, target_id, details)
    VALUES (
        v_user_id, 
        COALESCE(auth.jwt() ->> 'email', 'super_admin'), 
        'SET_ADMIN_PIN', 
        'founder_pin', 
        v_user_id::text, 
        jsonb_build_object('event', 'Founder admin PIN configured with verified AAL2')
    );

    RETURN jsonb_build_object('success', true, 'message', 'تم حفظ الرمز السري الإداري بنجاح وتأمينه بالتشفير المتقدم.');
END;
$$;

-- Verify Founder PIN RPC (with strict rate limiting & lockout)
CREATE OR REPLACE FUNCTION public.verify_founder_pin(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT := public.current_user_role();
    v_aal TEXT := auth.jwt() ->> 'aal';
    v_record RECORD;
    v_clean_pin TEXT := trim(p_pin);
    v_is_valid BOOLEAN;
BEGIN
    IF v_user_id IS NULL OR v_role != 'super_admin' OR v_aal != 'aal2' THEN
        RAISE EXCEPTION 'غير مصرح: التحقق من الرمز الإداري يتطلب جلسة موثقة للمشرف العام بمستوى AAL2.';
    END IF;

    SELECT * INTO v_record FROM public.founder_admin_pin WHERE user_id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'configured', false, 'error', 'لم يتم ضبط رمز إداري بعد لهذا الحساب.');
    END IF;

    IF v_record.locked_until IS NOT NULL AND v_record.locked_until > NOW() THEN
        RETURN jsonb_build_object('success', false, 'locked', true, 'error', 'الحساب مقفل مؤقتاً بسبب المحاولات المتكررة الخاطئة. يرجى المحاولة لاحقاً.');
    END IF;

    v_is_valid := (v_record.pin_hash = crypt(v_clean_pin || v_record.salt, v_record.pin_hash));

    IF v_is_valid THEN
        UPDATE public.founder_admin_pin
        SET failed_attempts = 0, locked_until = NULL
        WHERE user_id = v_user_id;

        INSERT INTO public.admin_audit_logs (actor_id, actor_email, action, target_type, target_id, details)
        VALUES (
            v_user_id, 
            COALESCE(auth.jwt() ->> 'email', 'super_admin'), 
            'VERIFY_ADMIN_PIN', 
            'founder_pin', 
            v_user_id::text, 
            jsonb_build_object('success', true)
        );

        RETURN jsonb_build_object('success', true, 'message', 'تم التحقق من الرمز السري بنجاح.');
    ELSE
        IF v_record.failed_attempts + 1 >= 5 THEN
            UPDATE public.founder_admin_pin
            SET failed_attempts = v_record.failed_attempts + 1,
                locked_until = NOW() + INTERVAL '15 minutes'
            WHERE user_id = v_user_id;

            INSERT INTO public.admin_audit_logs (actor_id, actor_email, action, target_type, target_id, details)
            VALUES (
                v_user_id, 
                COALESCE(auth.jwt() ->> 'email', 'super_admin'), 
                'ADMIN_PIN_LOCKED', 
                'founder_pin', 
                v_user_id::text, 
                jsonb_build_object('attempts', v_record.failed_attempts + 1, 'locked_until', (NOW() + INTERVAL '15 minutes'))
            );

            RETURN jsonb_build_object('success', false, 'locked', true, 'error', 'تم إدخال الرمز بشكل خاطئ 5 مرات. تم قفل المحاولات لمدة 15 دقيقة لحماية الحساب.');
        ELSE
            UPDATE public.founder_admin_pin
            SET failed_attempts = v_record.failed_attempts + 1
            WHERE user_id = v_user_id;

            RETURN jsonb_build_object(
                'success', false, 
                'remainingAttempts', (5 - (v_record.failed_attempts + 1)),
                'error', 'الرمز السري غير صحيح. المحاولات المتبقية: ' || (5 - (v_record.failed_attempts + 1))
            );
        END IF;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_founder_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_founder_pin(TEXT) TO authenticated;
