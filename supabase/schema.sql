-- ==============================================================================
-- Hinunangan Swine Biosecurity GIS - Supabase PostgreSQL + PostGIS Schema
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Barangays Spatial Table (Hinunangan 40 Barangays)
CREATE TABLE IF NOT EXISTS public.barangays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    is_coastal BOOLEAN DEFAULT false,
    zone VARCHAR(50) DEFAULT 'Zone 1',
    description TEXT,
    centroid GEOMETRY(Point, 4326),
    boundary GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Farms / Holdings Spatial Table
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(50),
    barangay VARCHAR(100) NOT NULL,
    sitio VARCHAR(100),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    farm_type VARCHAR(50) DEFAULT 'Backyard', -- Backyard, Semi-Commercial, Commercial
    biosecurity_level INTEGER DEFAULT 1,     -- 1: Basic/Low, 2: Moderate, 3: Advanced
    total_heads INTEGER DEFAULT 0,
    water_source VARCHAR(100),
    waste_disposal VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Swine / Pig Records Spatial Table
CREATE TABLE IF NOT EXISTS public.pig_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id VARCHAR(50) UNIQUE NOT NULL,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    tag_id VARCHAR(50),
    owner_name VARCHAR(150) NOT NULL,
    contact VARCHAR(50),
    barangay VARCHAR(100) NOT NULL,
    sitio VARCHAR(100),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    head_count INTEGER DEFAULT 1,
    breed VARCHAR(80) DEFAULT 'Native / Crossbred',
    age_category VARCHAR(50) DEFAULT 'Grower', -- Piglet, Grower, Finisher, Sow, Boar
    health_status VARCHAR(50) DEFAULT 'Healthy', -- Healthy, Under Observation, Vaccinated, Sick
    biosecurity_level INTEGER DEFAULT 1,
    is_vaccinated BOOLEAN DEFAULT false,
    vaccine_type VARCHAR(100),
    feed_type VARCHAR(80),
    pen_type VARCHAR(80),
    waste_management VARCHAR(80),
    water_source VARCHAR(80),
    notes TEXT,
    photos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Biosecurity Audit & Surveillance Logs
CREATE TABLE IF NOT EXISTS public.biosecurity_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    barangay VARCHAR(100) NOT NULL,
    auditor_name VARCHAR(150),
    score INTEGER NOT NULL,
    risk_level VARCHAR(50) DEFAULT 'Low', -- Low, Medium, High, Critical
    fencing_score INTEGER DEFAULT 0,
    disinfection_score INTEGER DEFAULT 0,
    feed_safety_score INTEGER DEFAULT 0,
    waste_mgmt_score INTEGER DEFAULT 0,
    mortality_rate DOUBLE PRECISION DEFAULT 0.0,
    findings TEXT,
    recommendations TEXT,
    audit_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Spatial Indexes (GIST) for High-Performance Geospatial Queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_barangays_centroid ON public.barangays USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_barangays_boundary ON public.barangays USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_farms_geom ON public.farms USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_pig_records_geom ON public.pig_records USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_pig_records_barangay ON public.pig_records(barangay);
CREATE INDEX IF NOT EXISTS idx_pig_records_health ON public.pig_records(health_status);

-- ==============================================================================
-- Triggers for Automatic Geometry Generation & Synchronization
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_point_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_farms_geom
BEFORE INSERT OR UPDATE OF lat, lng ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

CREATE OR REPLACE TRIGGER trg_sync_pigs_geom
BEFORE INSERT OR UPDATE OF lat, lng ON public.pig_records
FOR EACH ROW EXECUTE FUNCTION public.sync_point_geom();

-- ==============================================================================
-- PostGIS Spatial RPC Functions
-- ==============================================================================

-- 1. Find Swine Records within Radius (ST_DWithin with geodesic meter calculation)
CREATE OR REPLACE FUNCTION public.get_nearby_pigs(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 1000.0
)
RETURNS TABLE (
    id UUID,
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
        p.record_id,
        p.owner_name,
        p.barangay,
        p.head_count,
        p.health_status,
        p.biosecurity_level,
        p.is_vaccinated,
        p.lat,
        p.lng,
        ST_Distance(
            p.geom::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) AS distance_meters,
        ST_AsGeoJSON(p.geom) AS geojson
    FROM public.pig_records p
    WHERE ST_DWithin(
        p.geom::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Export All Barangays as GeoJSON FeatureCollection
CREATE OR REPLACE FUNCTION public.get_barangays_geojson()
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(COALESCE(b.boundary, b.centroid))::jsonb,
                    'properties', jsonb_build_object(
                        'id', b.id,
                        'name', b.name,
                        'lat', b.lat,
                        'lng', b.lng,
                        'is_coastal', b.is_coastal,
                        'zone', b.zone
                    )
                )
            ), '[]'::jsonb)
        )
        FROM public.barangays b
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Biosecurity Risk Density & Cluster Analysis
CREATE OR REPLACE FUNCTION public.get_biosecurity_summary_by_barangay()
RETURNS TABLE (
    barangay VARCHAR,
    total_farms BIGINT,
    total_heads BIGINT,
    vaccinated_heads BIGINT,
    critical_risk_count BIGINT,
    avg_biosecurity DOUBLE PRECISION,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.barangay,
        COUNT(DISTINCT p.farm_id)::BIGINT as total_farms,
        COALESCE(SUM(p.head_count), 0)::BIGINT as total_heads,
        COALESCE(SUM(CASE WHEN p.is_vaccinated THEN p.head_count ELSE 0 END), 0)::BIGINT as vaccinated_heads,
        COALESCE(SUM(CASE WHEN p.biosecurity_level = 1 THEN 1 ELSE 0 END), 0)::BIGINT as critical_risk_count,
        COALESCE(AVG(p.biosecurity_level), 1.0)::DOUBLE PRECISION as avg_biosecurity,
        AVG(p.lat)::DOUBLE PRECISION as centroid_lat,
        AVG(p.lng)::DOUBLE PRECISION as centroid_lng
    FROM public.pig_records p
    GROUP BY p.barangay;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- Row-Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pig_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biosecurity_audits ENABLE ROW LEVEL SECURITY;

-- Public read policies for GIS public viewing
CREATE POLICY "Public read access for barangays" ON public.barangays FOR SELECT USING (true);
CREATE POLICY "Public read access for farms" ON public.farms FOR SELECT USING (true);
CREATE POLICY "Public read access for pig records" ON public.pig_records FOR SELECT USING (true);
CREATE POLICY "Public read access for audits" ON public.biosecurity_audits FOR SELECT USING (true);

-- Authenticated / Service Role full write access
CREATE POLICY "Service role full access on barangays" ON public.barangays USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
CREATE POLICY "Service role full access on farms" ON public.farms USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
CREATE POLICY "Service role full access on pig records" ON public.pig_records USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
CREATE POLICY "Service role full access on audits" ON public.biosecurity_audits USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
