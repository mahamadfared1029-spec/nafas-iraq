-- =============================================================================
-- NAFAS | نَفَس — National Environmental & Volunteer Platform Schema
-- Target Database: PostgreSQL 15+ with PostGIS
-- Production Ready: Strict Integrity Constraints, Spatial Indexing & Row Level Security (RLS)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- 1. USERS & IDENTITY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'citizen' CHECK (role IN ('guest', 'citizen', 'volunteer', 'organizer', 'moderator', 'admin')),
    national_id_hash VARCHAR(64), -- SHA-256 for privacy preservation
    governorate_id VARCHAR(32) NOT NULL,
    is_verified_volunteer BOOLEAN DEFAULT FALSE,
    points INT DEFAULT 0 CHECK (points >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ENVIRONMENTAL REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('garbage', 'dumping', 'burning', 'water', 'debris', 'flora', 'other')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    governorate_id VARCHAR(32) NOT NULL,
    neighborhood VARCHAR(120) NOT NULL,
    
    -- Explicit GIS Coordinates (No default centroids allowed)
    geom GEOMETRY(Point, 4326) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL CHECK (lat >= 28.5 AND lat <= 38.5),
    lng NUMERIC(9, 6) NOT NULL CHECK (lng >= 38.0 AND lng <= 49.5),
    location_source VARCHAR(32) NOT NULL CHECK (location_source IN ('gps', 'manual_picker', 'initial_coords', 'governorate_center_approximate')),
    accuracy_m NUMERIC(8, 2),
    source_layer_version VARCHAR(64) DEFAULT 'gbOpen-IRQ-ADM1-2022',

    image_before_url TEXT NOT NULL,
    image_after_url TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'verified', 'in_progress', 'pending_verification', 'resolved', 'duplicate', 'rejected', 'reopened')),
    
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_hazardous BOOLEAN DEFAULT FALSE,
    assigned_entity VARCHAR(150),
    verification_evidence TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_geom ON reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_reports_gov ON reports (governorate_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- -----------------------------------------------------------------------------
-- 3. REPORT AUDIT LOGS (Immutable Traceability)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(20) NOT NULL,
    previous_status VARCHAR(24) NOT NULL,
    new_status VARCHAR(24) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_report ON report_audit_logs (report_id);

-- -----------------------------------------------------------------------------
-- 4. VOLUNTEER CAMPAIGNS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(32) PRIMARY KEY,
    title_ar VARCHAR(200) NOT NULL,
    title_ku VARCHAR(200),
    title_en VARCHAR(200),
    description_ar TEXT NOT NULL,
    governorate_id VARCHAR(32) NOT NULL,
    meeting_area VARCHAR(200) NOT NULL,
    meeting_point GEOMETRY(Point, 4326),
    campaign_date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    duration_hours NUMERIC(4, 2) NOT NULL CHECK (duration_hours > 0),
    
    volunteer_capacity INT NOT NULL CHECK (volunteer_capacity > 0),
    registered_count INT NOT NULL DEFAULT 0 CHECK (registered_count >= 0),
    confirmed_count INT NOT NULL DEFAULT 0 CHECK (confirmed_count >= 0),
    target_trees INT DEFAULT 0 CHECK (target_trees >= 0),
    trees_planted INT DEFAULT 0 CHECK (trees_planted >= 0), -- Actual verified count
    
    organizer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    organizer_name VARCHAR(120) NOT NULL,
    organizer_role VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    certificate_eligible BOOLEAN DEFAULT TRUE,
    partner_rewards_notice TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. CAMPAIGN REGISTRATIONS (Duplicate Prevention Enforced at DB Level)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(32) NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attended BOOLEAN DEFAULT FALSE,
    verified_hours NUMERIC(4, 2) DEFAULT 0 CHECK (verified_hours >= 0),
    certificate_issued BOOLEAN DEFAULT FALSE,
    
    -- Strict Constraint: A volunteer can only register once per campaign
    CONSTRAINT uq_user_campaign UNIQUE (campaign_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 6. ISSUED CERTIFICATES (Cryptographically Verifiable)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(64) PRIMARY KEY,
    verification_code VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    participant_name VARCHAR(120) NOT NULL,
    campaign_id VARCHAR(32) NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    campaign_title VARCHAR(200) NOT NULL,
    governorate_id VARCHAR(32) NOT NULL,
    hours_awarded NUMERIC(4, 2) NOT NULL CHECK (hours_awarded > 0),
    issue_date DATE NOT NULL,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organizer_signature VARCHAR(120) NOT NULL,
    digital_seal_hash VARCHAR(64) NOT NULL,
    
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_reason TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_code ON certificates (verification_code);
CREATE INDEX IF NOT EXISTS idx_cert_user ON certificates (user_id);

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Reports Policies
CREATE POLICY "Public can view non-rejected reports"
    ON reports FOR SELECT
    USING (status != 'rejected');

CREATE POLICY "Authenticated users can submit reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND status = 'submitted');

CREATE POLICY "Only moderators and admins can update report status"
    ON reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('moderator', 'admin')
        )
    );

-- Certificates Policies
CREATE POLICY "Public can view valid certificates for verification"
    ON certificates FOR SELECT
    USING (is_revoked = FALSE);

CREATE POLICY "Only organizers and admins can issue certificates"
    ON certificates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('organizer', 'admin')
        )
    );

CREATE POLICY "Only organizers and admins can revoke certificates"
    ON certificates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('organizer', 'admin')
        )
    );

-- Campaign Registration Policies
CREATE POLICY "Users can only view their own registrations"
    ON campaign_registrations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can register themselves for campaigns"
    ON campaign_registrations FOR INSERT
    WITH CHECK (user_id = auth.uid());
