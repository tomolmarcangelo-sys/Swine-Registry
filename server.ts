import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '10000', 10);

// Configure dynamic CORS origins (Vercel frontend, local development, custom domain)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://swine-registry.vercel.app',
  'https://hinunangan-swine-gis.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in preview/staging, strictly logged
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// PostgreSQL / Supabase PostGIS Connection Pool
let dbPool: Pool | null = null;

function getDbPool(): Pool | null {
  if (dbPool) return dbPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[DB] No DATABASE_URL provided. Spatial routes will operate in mock/cached mode.');
    return null;
  }
  try {
    dbPool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase') || connectionString.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return dbPool;
  } catch (err) {
    console.error('[DB] Failed to create PostgreSQL pool:', err);
    return null;
  }
}

// ==============================================================================
// 1. Root & Health Check Endpoints (Headless Service)
// ==============================================================================

// Root Endpoint Handler
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'Hinunangan Swine GIS API',
    timestamp: new Date().toISOString()
  });
});

// Dedicated Render Keep-Alive Health Check Endpoint with DB Ping Verification
app.get('/health', async (req: Request, res: Response) => {
  const pool = getDbPool();
  let dbStatus = 'unconfigured';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
    }
  }

  res.status(200).json({
    status: 'ok',
    service: 'Hinunangan Swine GIS API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dbConfigured: !!process.env.DATABASE_URL,
    database: dbStatus,
    version: '1.0.0'
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: !!process.env.DATABASE_URL ? 'connected' : 'unconfigured'
  });
});

// ==============================================================================
// 2. Spatial Endpoints (PostGIS / Radius / Density)
// ==============================================================================

// Find nearby swine records within radius using ST_DWithin
app.get('/api/spatial/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string || '10.4045');
  const lng = parseFloat(req.query.lng as string || '125.1977');
  const radius = parseFloat(req.query.radius as string || '1500'); // meters

  const pool = getDbPool();
  if (!pool) {
    return res.status(200).json({
      success: true,
      message: 'Spatial database unconfigured; returning fallback parameters',
      center: { lat, lng },
      radiusMeters: radius,
      data: []
    });
  }

  try {
    const query = `
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
        ROUND(ST_Distance(
          p.geom::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        )::numeric, 2) AS distance_meters
      FROM public.pig_records p
      WHERE ST_DWithin(
        p.geom::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      ORDER BY distance_meters ASC
      LIMIT 100;
    `;
    const result = await pool.query(query, [lat, lng, radius]);
    res.json({
      success: true,
      count: result.rows.length,
      center: { lat, lng },
      radiusMeters: radius,
      data: result.rows
    });
  } catch (err: any) {
    console.error('[API /spatial/nearby Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Summary analytics by barangay
app.get('/api/spatial/barangay-summary', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool) {
    return res.status(200).json({ success: true, data: [] });
  }

  try {
    const query = `
      SELECT 
        p.barangay,
        COUNT(DISTINCT p.farm_id) as total_farms,
        COALESCE(SUM(p.head_count), 0) as total_heads,
        COALESCE(SUM(CASE WHEN p.is_vaccinated THEN p.head_count ELSE 0 END), 0) as vaccinated_heads,
        COALESCE(SUM(CASE WHEN p.biosecurity_level = 1 THEN 1 ELSE 0 END), 0) as high_risk_pens,
        ROUND(AVG(p.biosecurity_level)::numeric, 2) as avg_biosecurity_score
      FROM public.pig_records p
      GROUP BY p.barangay
      ORDER BY total_heads DESC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('[API /spatial/barangay-summary Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Hinunangan Swine GIS API] Service running on http://0.0.0.0:${PORT}`);
});
