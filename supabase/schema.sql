-- ==============================================================================
-- Hinunangan Swine Registry & Biosecurity System
-- Supabase PostgreSQL Schema (Compatible with Frontend)
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Cleanup old conflicting tables (if any)
DROP TABLE IF EXISTS public.pig_records CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
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
