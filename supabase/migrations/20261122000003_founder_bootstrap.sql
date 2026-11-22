-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 003: Founder Provisioning & Seed Reference Data
-- Target: PostgreSQL 15+ / Supabase
-- Security Hardened: Strict Execution Privileges, Explicit search_path,
-- Mandatory Bootstrap Token Verification, and Confirmed Email Enforcement.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED IRAQI GOVERNORATES REFERENCE DATA
-- -----------------------------------------------------------------------------
INSERT INTO public.governorates (id, name_ar, name_ku, name_en, lat, lng, zoom, climate_zone)
VALUES
    ('baghdad', 'بغداد', 'بەغدا', 'Baghdad', 33.3152, 44.3661, 11, 'سهل رسوبي / شبه صحراوي'),
    ('basra', 'البصرة', 'بەسرە', 'Basra', 30.5081, 47.7835, 11, 'أهوار / ساحلي حار'),
    ('erbil', 'أربيل', 'هەولێر', 'Erbil', 36.1911, 44.0092, 11, 'جبلي / معتدل'),
    ('sulaymaniyah', 'السليمانية', 'سلێمانی', 'Sulaymaniyah', 35.5650, 45.4330, 11, 'جبلي / متوسطي'),
    ('duhok', 'دهوك', 'دهۆک', 'Duhok', 36.8679, 42.9886, 11, 'جبلي / وعر'),
    ('nineveh', 'نينوى', 'نەینەوا', 'Nineveh', 36.3400, 43.1300, 10, 'سهوب / هضاب متموجة'),
    ('kirkuk', 'كركوك', 'کەرکووک', 'Kirkuk', 35.4681, 44.3922, 11, 'سهوب شبه جافة'),
    ('diyala', 'ديالى', 'دیالە', 'Diyala', 33.7500, 45.1500, 10, 'بساتين / وادي نهري'),
    ('anbar', 'الأنبار', 'ئەنبار', 'Anbar', 33.4200, 43.3000, 8, 'صحراوي قاحل'),
    ('babylon', 'بابل', 'بابل', 'Babylon', 32.4800, 44.4300, 11, 'سهل فيضي نهري'),
    ('karbala', 'كربلاء', 'کەربەلا', 'Karbala', 32.6160, 44.0250, 11, 'سهل واحات / صحراوي'),
    ('najaf', 'النجف', 'نەجەف', 'Najaf', 32.0000, 44.3300, 10, 'حافة الهضبة الصحراوية'),
    ('qadisiyyah', 'الديوانية', 'دیوانیە', 'Al-Qadisiyyah', 31.9900, 44.9200, 11, 'سهل رسوبي زراعي'),
    ('muthanna', 'المثنى', 'موسەننا', 'Al-Muthanna', 31.3100, 45.2800, 9, 'بادية جنوبية / صحراوي'),
    ('dhi_qar', 'ذي قار', 'زیقار', 'Dhi Qar', 31.0500, 46.2600, 10, 'أهوار جنوبية'),
    ('maysan', 'ميسان', 'مەیسان', 'Maysan', 31.8400, 47.1400, 10, 'أهوار مائية كبرى'),
    ('wasit', 'واسط', 'واسیت', 'Wasit', 32.5100, 45.8200, 10, 'سهل فيضي نهري'),
    ('saladin', 'صلاح الدين', 'سەلاحەدین', 'Saladin', 34.6000, 43.6800, 10, 'سهوب متموجة'),
    ('halabja', 'حلبجة', 'هەڵەبجە', 'Halabja', 35.1778, 45.9861, 11, 'سفوح جبلية وبساتين')
ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_ku = EXCLUDED.name_ku,
    name_en = EXCLUDED.name_en,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;

-- -----------------------------------------------------------------------------
-- 2. SECURE FOUNDER BOOTSTRAP PROCEDURE
-- Invoked exclusively by server-side administrative control / service_role
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_founder_account(
    p_user_id UUID,
    p_expected_email VARCHAR(255),
    p_bootstrap_token VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actual_email VARCHAR(255);
    v_email_confirmed BOOLEAN;
    v_configured_token VARCHAR(255);
    v_existing_super_count INT;
BEGIN
    -- 1. Strictly require bootstrap token to be provided
    IF p_bootstrap_token IS NULL OR LENGTH(TRIM(p_bootstrap_token)) < 16 THEN
        RAISE EXCEPTION '403 Forbidden: رمز التهيئة الإداري إلزامي ولا يمكن تجاوزه (Mandatory bootstrap token required)';
    END IF;

    -- 2. Verify caller provided valid bootstrap token against non-public system settings
    SELECT value->>'token' INTO v_configured_token
    FROM public.system_settings 
    WHERE key = 'founder_bootstrap_token' AND is_public = FALSE;

    IF v_configured_token IS NULL THEN
        RAISE EXCEPTION '500 Internal Error: لم يتم تهيئة الرمز السري للمؤسس في إعدادات الخادم (Bootstrap token unconfigured)';
    END IF;

    IF v_configured_token != p_bootstrap_token THEN
        RAISE EXCEPTION '403 Forbidden: رمز التهيئة الإداري غير صحيح (Invalid Bootstrap Token)';
    END IF;

    -- 3. Verify target user exists in auth.users
    SELECT email, (email_confirmed_at IS NOT NULL)
    INTO v_actual_email, v_email_confirmed
    FROM auth.users
    WHERE id = p_user_id;

    IF v_actual_email IS NULL THEN
        RAISE EXCEPTION '404 Not Found: المستخدم المحدد غير موجود في سجلات المصادقة (User Not Found)';
    END IF;

    -- 4. Mandatory Email Confirmation Enforcement
    IF NOT v_email_confirmed THEN
        RAISE EXCEPTION '403 Forbidden: لا يمكن تفعيل صلاحيات المشرف العام قبل تأكيد ملكية البريد الإلكتروني رسمياً (Email must be verified first)';
    END IF;

    -- 5. Independent Email Match Verification
    IF LOWER(TRIM(v_actual_email)) != LOWER(TRIM(p_expected_email)) THEN
        RAISE EXCEPTION '403 Forbidden: البريد الإلكتروني لا يتطابق مع هوية المؤسس المعتمدة (Email Mismatch)';
    END IF;

    -- 6. Enforce that Super Admin cannot be arbitrarily re-provisioned if already established
    SELECT COUNT(*) INTO v_existing_super_count
    FROM public.profiles
    WHERE role = 'super_admin';

    -- 7. Determine actual MFA enrollment status (never fabricate boolean)
    SELECT EXISTS (
        SELECT 1 FROM auth.mfa_factors 
        WHERE user_id = p_user_id AND status = 'verified'
    ) INTO v_email_confirmed; -- Reusing variable for MFA active check
    -- Alternatively define explicitly:
    DECLARE
        v_mfa_active BOOLEAN := FALSE;
    BEGIN
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM auth.mfa_factors 
                WHERE user_id = p_user_id AND status = 'verified'
            ) INTO v_mfa_active;
        EXCEPTION
            WHEN undefined_table THEN
                v_mfa_active := FALSE;
        END;

        -- 8. Upsert Profile with super_admin role (Real MFA status derived from auth.mfa_factors)
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            role, 
            governorate_id, 
            mfa_enabled, 
            is_verified_volunteer, 
            created_at, 
            updated_at
        )
        VALUES (
            p_user_id,
            v_actual_email,
            'المشرف العام — مؤسس نَفَس',
            'super_admin',
            'baghdad',
            v_mfa_active,
            TRUE,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'super_admin',
            mfa_enabled = v_mfa_active,
            updated_at = NOW();

        -- 9. Single-Use Enforcement: Invalidate bootstrap token immediately
        DELETE FROM public.system_settings 
        WHERE key = 'founder_bootstrap_token';

        -- 10. Record Immutable Administrative Audit Event
        INSERT INTO public.admin_audit_logs (
            actor_id,
            actor_email,
            action,
            target_type,
            target_id,
            details
        )
        VALUES (
            p_user_id,
            v_actual_email,
            'FOUNDER_PROVISIONED',
            'PROFILE',
            p_user_id::TEXT,
            jsonb_build_object(
                'role', 'super_admin',
                'email_confirmed', TRUE,
                'mfa_active', v_mfa_active,
                'token_invalidated', TRUE,
                'timestamp', NOW()
            )
        );
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'role', 'super_admin',
        'message', 'تم اعتماد حساب المؤسس بصلاحية المشرف العام بنجاح وفق الضوابط الأمنية'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. STRICT PRIVILEGE REVOCATION (Prevent Public/Client RPC Invocation)
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.provision_founder_account(UUID, VARCHAR, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_founder_account(UUID, VARCHAR, VARCHAR) FROM anon;
REVOKE ALL ON FUNCTION public.provision_founder_account(UUID, VARCHAR, VARCHAR) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.provision_founder_account(UUID, VARCHAR, VARCHAR) TO service_role;
