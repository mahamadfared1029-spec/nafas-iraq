-- =============================================================================
-- NAFAS | نَفَس — MIGRATION 001: Foundation Schema
-- Target: PostgreSQL 15+ / Supabase with PostGIS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- 1. ENUMS & TYPES
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('citizen', 'volunteer', 'organizer', 'moderator', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status_type AS ENUM (
        'submitted', 
        'under_review', 
        'verified', 
        'assigned', 
        'in_progress', 
        'pending_verification', 
        'resolved', 
        'rejected', 
        'duplicate', 
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE pollution_category_type AS ENUM (
        'garbage', 
        'dumping', 
        'burning', 
        'water', 
        'debris', 
        'flora', 
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level_type AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_delivery_status AS ENUM (
        'pending', 
        'queued', 
        'sent', 
        'failed', 
        'retry_scheduled', 
        'unconfigured'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. USER PROFILES & IAM (Linked to auth.users in Supabase)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    role user_role_type NOT NULL DEFAULT 'citizen',
    governorate_id VARCHAR(32) NOT NULL DEFAULT 'baghdad',
    phone_masked VARCHAR(32),
    is_verified_volunteer BOOLEAN DEFAULT FALSE,
    points INT DEFAULT 0 CHECK (points >= 0),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- -----------------------------------------------------------------------------
-- 3. GOVERNORATES REFERENCE TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.governorates (
    id VARCHAR(32) PRIMARY KEY,
    name_ar VARCHAR(64) NOT NULL,
    name_ku VARCHAR(64) NOT NULL,
    name_en VARCHAR(64) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    zoom INT NOT NULL DEFAULT 8,
    climate_zone VARCHAR(64) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. ENVIRONMENTAL REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category pollution_category_type NOT NULL,
    severity severity_level_type NOT NULL DEFAULT 'medium',
    governorate_id VARCHAR(32) NOT NULL REFERENCES public.governorates(id),
    neighborhood VARCHAR(120) NOT NULL,
    
    -- Geospatial PostGIS Point (WGS 84, SRID 4326)
    geom GEOMETRY(Point, 4326) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL CHECK (lat >= 28.5 AND lat <= 38.5),
    lng NUMERIC(9, 6) NOT NULL CHECK (lng >= 38.0 AND lng <= 49.5),
    location_source VARCHAR(32) NOT NULL DEFAULT 'manual_picker',
    accuracy_m NUMERIC(8, 2),
    source_layer_version VARCHAR(64) DEFAULT 'gbOpen-IRQ-ADM1-2022',
    
    -- Evidence (Authoritative Storage Key + Optional Display URL)
    image_before_url TEXT,
    image_before_storage_path TEXT,
    image_after_url TEXT,
    image_after_storage_path TEXT,
    
    status report_status_type NOT NULL DEFAULT 'submitted',
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_display_name VARCHAR(120) DEFAULT 'مواطن عراقي',
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_hazardous BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    assigned_moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_entity VARCHAR(150),
    verification_evidence TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_geom ON public.reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_reports_gov ON public.reports (governorate_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_tracking ON public.reports (tracking_number);

-- -----------------------------------------------------------------------------
-- 5. REPORT MEDIA & ATTACHMENTS (Secure Private Storage Metadata)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    bucket_name VARCHAR(64) NOT NULL DEFAULT 'report-evidence-private',
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_checksum VARCHAR(64),
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_media_report ON public.report_media(report_id);

-- -----------------------------------------------------------------------------
-- 6. REPORT AUDIT LOGS (Immutable Traceability for Moderation Decisions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_role user_role_type NOT NULL,
    previous_status report_status_type NOT NULL,
    new_status report_status_type NOT NULL,
    notes TEXT,
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_audit_logs_report ON public.report_audit_logs(report_id);

-- -----------------------------------------------------------------------------
-- 7. ADMINISTRATIVE AUDIT LOGS (Super Admin & Moderator Actions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. NOTIFICATION OUTBOX & DELIVERY AUDIT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(64) NOT NULL UNIQUE,
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    recipient_masked VARCHAR(64) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    delivery_status notification_delivery_status NOT NULL DEFAULT 'pending',
    provider VARCHAR(64) NOT NULL DEFAULT 'resend',
    attempt_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    external_message_id VARCHAR(120),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON public.notification_outbox(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_report ON public.notification_outbox(report_id);

-- -----------------------------------------------------------------------------
-- 9. MINIMAL CAMPAIGNS & CERTIFICATES STRUCTURE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
    id VARCHAR(32) PRIMARY KEY,
    title_ar VARCHAR(200) NOT NULL,
    title_ku VARCHAR(200),
    title_en VARCHAR(200),
    description_ar TEXT NOT NULL,
    governorate_id VARCHAR(32) NOT NULL REFERENCES public.governorates(id),
    meeting_area VARCHAR(200) NOT NULL,
    campaign_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    duration_hours NUMERIC(4, 2) NOT NULL CHECK (duration_hours > 0),
    volunteer_capacity INT NOT NULL CHECK (volunteer_capacity > 0),
    registered_count INT NOT NULL DEFAULT 0 CHECK (registered_count >= 0),
    target_trees INT DEFAULT 0,
    trees_planted INT DEFAULT 0,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organizer_name VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaign_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(32) NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attended BOOLEAN DEFAULT FALSE,
    verified_hours NUMERIC(4, 2) DEFAULT 0,
    CONSTRAINT uq_campaign_user UNIQUE (campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id VARCHAR(64) PRIMARY KEY,
    verification_code VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    participant_name VARCHAR(120) NOT NULL,
    campaign_id VARCHAR(32) NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    campaign_title VARCHAR(200) NOT NULL,
    governorate VARCHAR(64) NOT NULL,
    hours_awarded NUMERIC(4, 2) NOT NULL CHECK (hours_awarded > 0),
    issue_date DATE NOT NULL,
    organizer_signature VARCHAR(120) NOT NULL,
    digital_seal_hash VARCHAR(64) NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. SYSTEM SETTINGS (Admin Configurable)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. SERVER-CONTROLLED COLLISION-RESISTANT TRACKING NUMBER GENERATOR
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.report_tracking_seq START WITH 1000 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.trg_fn_generate_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.tracking_number IS NULL OR TRIM(NEW.tracking_number) = '' THEN
        NEW.tracking_number := 'NFS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.report_tracking_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_tracking_number ON public.reports;
CREATE TRIGGER trg_reports_tracking_number
BEFORE INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_generate_tracking_number();

-- -----------------------------------------------------------------------------
-- 12. PROVISION PRIVATE EVIDENCE STORAGE BUCKET
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-evidence-private',
    'report-evidence-private',
    FALSE, -- Strictly private
    10485760, -- 10MB maximum file size
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- -----------------------------------------------------------------------------
-- 13. AUTOMATED NOTIFICATION OUTBOX TRIGGER (Server-Enforced)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_enqueue_report_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_urgent BOOLEAN;
    v_event_type VARCHAR(64);
BEGIN
    v_is_urgent := NEW.is_hazardous OR NEW.severity IN ('high', 'critical');
    
    IF (TG_OP = 'INSERT') THEN
        v_event_type := CASE WHEN v_is_urgent THEN 'REPORT_HAZARDOUS_ALERT' ELSE 'REPORT_SUBMITTED' END;
        
        INSERT INTO public.notification_outbox (
            event_id,
            report_id,
            event_type,
            recipient_masked,
            payload,
            delivery_status,
            provider,
            attempt_count
        ) VALUES (
            'EVT-' || NEW.tracking_number || '-SUBMIT',
            NEW.id,
            v_event_type,
            'adm***@nafas-iraq.org',
            jsonb_build_object(
                'trackingNumber', NEW.tracking_number,
                'title', NEW.title,
                'category', NEW.category,
                'severity', NEW.severity,
                'governorateId', NEW.governorate_id,
                'neighborhood', NEW.neighborhood,
                'isHazardous', NEW.is_hazardous,
                'lat', NEW.lat,
                'lng', NEW.lng,
                'createdAt', NEW.created_at
            ),
            'pending',
            'resend',
            0
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notification_outbox (
            event_id,
            report_id,
            event_type,
            recipient_masked,
            payload,
            delivery_status,
            provider,
            attempt_count
        ) VALUES (
            'EVT-' || NEW.tracking_number || '-STAT-' || NEW.status || '-' || EXTRACT(EPOCH FROM NOW())::INT,
            NEW.id,
            'REPORT_STATUS_CHANGE',
            'adm***@nafas-iraq.org',
            jsonb_build_object(
                'trackingNumber', NEW.tracking_number,
                'previousStatus', OLD.status,
                'newStatus', NEW.status,
                'updatedAt', NEW.updated_at
            ),
            'pending',
            'resend',
            0
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_notification ON public.reports;
CREATE TRIGGER trg_reports_notification
AFTER INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_enqueue_report_notification();

-- -----------------------------------------------------------------------------
-- 14. AUTOMATED AUDIT LOG TRIGGER (Tamper-Proof Traceability)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_log_report_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.report_audit_logs (
            report_id,
            actor_id,
            actor_name,
            actor_role,
            previous_status,
            new_status,
            notes
        ) VALUES (
            NEW.id,
            auth.uid(),
            COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), 'إشراف المنصة المعتمد'),
            COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'moderator'),
            OLD.status,
            NEW.status,
            COALESCE(NEW.verification_evidence, 'تحديث الحالة عبر بوابة الإشراف الرسمية')
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_audit_transition ON public.reports;
CREATE TRIGGER trg_reports_audit_transition
AFTER UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_log_report_status_transition();

-- -----------------------------------------------------------------------------
-- 15. CITIZEN PRIVACY SAFE PROJECTION VIEW (Excludes Identifiers & Private Evidence)
-- -----------------------------------------------------------------------------
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
WHERE r.status IN ('verified', 'in_progress', 'pending_verification', 'resolved')
  AND r.is_archived = FALSE;

