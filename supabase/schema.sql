-- ==============================================================================
-- Hinunangan Swine Registry & Biosecurity System
-- Supabase PostgreSQL Schema (Compatible with Frontend)
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 0. Cleanup old conflicting tables (if any)
DROP TABLE IF EXISTS public.pig_records CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.biosecurity_audits CASCADE;
DROP TABLE IF EXISTS public.farms CASCADE;
DROP TABLE IF EXISTS public.barangays CASCADE;

-- ==============================================================================
-- 1. Users Table
-- ==============================================================================
CREATE TABLE public.users (
    username VARCHAR(150) PRIMARY KEY,
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    full_name VARCHAR(255),
    barangay VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. Pig Records Table
-- ==============================================================================
CREATE TABLE public.pig_records (
    id VARCHAR(150) PRIMARY KEY,
    ear_tag VARCHAR(100),
    owner_name VARCHAR(255),
    contact VARCHAR(100),
    address TEXT,
    barangay VARCHAR(150) NOT NULL,
    breed VARCHAR(100),
    sex VARCHAR(50),
    age INTEGER DEFAULT 0,
    weight DOUBLE PRECISION DEFAULT 0.0,
    purpose VARCHAR(150),
    vaccinated BOOLEAN DEFAULT false,
    asf_cleared BOOLEAN DEFAULT true,
    date_registered TIMESTAMPTZ DEFAULT NOW(),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION,
    gps_altitude DOUBLE PRECISION,
    gps_timestamp TIMESTAMPTZ,
    registered_by VARCHAR(150),
    notes TEXT,
    biosecurity JSONB,
    photo_url TEXT,
    is_deceased BOOLEAN DEFAULT false,
    mortality_date TIMESTAMPTZ,
    mortality_reason TEXT,
    health_status VARCHAR(50) DEFAULT 'Healthy' CHECK (health_status IN ('Healthy', 'Suspect', 'Quarantined', 'Deceased')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row-Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pig_records ENABLE ROW LEVEL SECURITY;

-- Public read/write access (since frontend relies on public anon key)
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Enable read access for all pigs" ON public.pig_records FOR SELECT USING (true);
CREATE POLICY "Enable insert for all pigs" ON public.pig_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all pigs" ON public.pig_records FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all pigs" ON public.pig_records FOR DELETE USING (true);

-- ==============================================================================
-- Realtime Synchronization Setup
-- ==============================================================================
-- Add tables to the supabase_realtime publication to enable WebSocket events
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pig_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- ==============================================================================
-- 3. System Settings Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users on settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Enable update for all users on settings" ON public.system_settings FOR UPDATE USING (true);
CREATE POLICY "Enable insert for all users on settings" ON public.system_settings FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 3.5. Audit Logs Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    username VARCHAR(100) NOT NULL,
    user_full_name VARCHAR(150),
    role VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    entity_type VARCHAR(50),
    ip_address VARCHAR(50)
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old generic policies
DROP POLICY IF EXISTS "Enable read access for all users on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable insert for all users on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable update for all users on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Enable delete for all users on audit_logs" ON public.audit_logs;

-- Barangay-scoped SELECT policy: Admins see everything, focal persons see logs corresponding to their assigned barangay
CREATE POLICY "Enable read access for scoped users on audit_logs" ON public.audit_logs
FOR SELECT
USING (
    -- If the requester has admin privileges, they can view all logs
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.username = COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), CURRENT_USER)
          AND u.role = 'admin'
    )
    OR
    -- If they are focal persons, only allow reading logs where the author belongs to their same assigned barangay
    EXISTS (
        SELECT 1 FROM public.users requester
        JOIN public.users author ON author.username = audit_logs.username
        WHERE requester.username = COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), CURRENT_USER)
          AND (requester.role = 'admin' OR requester.barangay = author.barangay)
    )
);

-- INSERT policy: Allow users to write audit logs representing their actions
CREATE POLICY "Enable insert access for all users on audit_logs" ON public.audit_logs
FOR INSERT
WITH CHECK (
    true
);

-- UPDATE/DELETE policies: Restrict destructive actions to administrators only
CREATE POLICY "Enable update for admins only on audit_logs" ON public.audit_logs
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.username = COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), CURRENT_USER)
          AND u.role = 'admin'
    )
);

CREATE POLICY "Enable delete for admins only on audit_logs" ON public.audit_logs
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.username = COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), CURRENT_USER)
          AND u.role = 'admin'
    )
);

-- ==============================================================================
-- 4. Storage Bucket Setup (PostgreSQL)
-- ==============================================================================
-- Note: Supabase handles buckets differently, but we can attempt to insert into storage.buckets
-- If the user runs this from the SQL editor, it should work if the 'storage' schema exists.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('registry_images', 'registry_images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'registry_images' );

-- Allow authenticated and anon users to upload
CREATE POLICY "Allow public uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'registry_images' );


-- ==============================================================================
-- 5. PostGIS Spatial RPC Functions
-- ==============================================================================
-- Safely drop the existing function signatures first to avoid return type change conflicts (error 42P13)
DROP FUNCTION IF EXISTS public.get_nearby_pigs(double precision, double precision, double precision) CASCADE;
DROP FUNCTION IF EXISTS public.get_nearby_pigs(double precision, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_nearby_pigs(double precision, double precision) CASCADE;

-- Find Swine Records within Radius (ST_DWithin with geodesic meter calculation)
CREATE OR REPLACE FUNCTION public.get_nearby_pigs(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 1000.0)
RETURNS TABLE (
    id VARCHAR,
    record_id VARCHAR,
    owner_name VARCHAR,
    barangay VARCHAR,
    head_count INTEGER,
    health_status VARCHAR,
    biosecurity_level INTEGER,
    is_vaccinated BOOLEAN,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    geojson TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.ear_tag AS record_id,
        p.owner_name,
        p.barangay,
        p.age AS head_count,
        'Healthy'::VARCHAR AS health_status,
        (p.biosecurity->>'biosecurity_level')::INTEGER AS biosecurity_level,
        p.vaccinated AS is_vaccinated,
        p.lat,
        p.lng,
        ROUND(ST_Distance(
          ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        )::numeric, 2)::DOUBLE PRECISION AS distance_meters,
        ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)) AS geojson
    FROM public.pig_records p
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
6. Auto-updating Updated At Timestamp Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pig_records_updated_at
    BEFORE UPDATE ON public.pig_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
7. Swine-Assets Public Storage Bucket & Policies
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('swine-assets', 'swine-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access on swine-assets" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'swine-assets' );

CREATE POLICY "Public Upload Access on swine-assets" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'swine-assets' );

CREATE POLICY "Public Update Access on swine-assets"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'swine-assets' );

CREATE POLICY "Public Delete Access on swine-assets"
ON storage.objects FOR DELETE
USING ( bucket_id = 'swine-assets' );

-- ==============================================================================
8. PostGIS Spatial RPC geojson retrieval function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_farms_geojson()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(features), '[]'::json)
  )
  INTO result
  FROM (
    SELECT json_build_object(
      'type', 'Feature',
      'id', p.id,
      'geometry', ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326))::json,
      'properties', json_build_object(
        'id', p.id,
        'ear_tag', p.ear_tag,
        'owner_name', p.owner_name,
        'barangay', p.barangay,
        'breed', p.breed,
        'age', p.age,
        'weight', p.weight,
        'purpose', p.purpose,
        'vaccinated', p.vaccinated,
        'is_deceased', p.is_deceased,
        'health_status', p.health_status,
        'photo_url', p.photo_url,
        'biosecurity_level', (p.biosecurity->>'biosecurity_level')
      )
    ) AS features
    FROM public.pig_records p
  ) sub;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Ensure replication identity for real-time tracking is set to FULL
ALTER TABLE public.pig_records REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
