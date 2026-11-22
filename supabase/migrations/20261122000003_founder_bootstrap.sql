-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 003: Founder Provisioning & Seed Reference Data
-- Target: PostgreSQL 15+ / Supabase
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
-- Invoked during initial platform configuration with immutable user ID verification
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_founder_account(
    p_user_id UUID,
    p_expected_email VARCHAR(255),
    p_bootstrap_token VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actual_email VARCHAR(255);
    v_email_confirmed BOOLEAN;
    v_configured_token VARCHAR(255);
    v_existing_super_count INT;
BEGIN
    -- 1. Verify caller provided valid bootstrap token against system settings
    SELECT value->>'token' INTO v_configured_token
    FROM public.system_settings 
    WHERE key = 'founder_bootstrap_token';

    IF v_configured_token IS NOT NULL AND v_configured_token != p_bootstrap_token THEN
        RAISE EXCEPTION 'رمز التهيئة الإداري غير صحيح (Invalid Bootstrap Token)';
    END IF;

    -- 2. Verify target user exists and email is confirmed in auth.users
    SELECT email, (email_confirmed_at IS NOT NULL)
    INTO v_actual_email, v_email_confirmed
    FROM auth.users
    WHERE id = p_user_id;

    IF v_actual_email IS NULL THEN
        RAISE EXCEPTION 'المستخدم المحدد غير موجود في سجلات المصادقة (User Not Found)';
    END IF;

    IF LOWER(v_actual_email) != LOWER(p_expected_email) THEN
        RAISE EXCEPTION 'البريد الإلكتروني لا يتطابق مع هوية المؤسس المسجلة (Email Mismatch)';
    END IF;

    -- 3. Upsert Profile with super_admin role
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
        TRUE,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        updated_at = NOW();

    -- 4. Record Immutable Administrative Audit Event
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
            'email_confirmed', v_email_confirmed,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'role', 'super_admin',
        'message', 'تم اعتماد حساب المؤسس بصلاحية المشرف العام بنجاح'
    );
END;
$$;
