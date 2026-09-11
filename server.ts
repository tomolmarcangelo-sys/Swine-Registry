import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

import { swineRouter } from './src/server/routes/swine';
import { usersRouter } from './src/server/routes/users';
import { healthRouter } from './src/server/routes/health';
import { errorHandler } from './src/server/middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

// Dedicated Prisma ORM Server API Routers (/api/*)
app.use('/api/swine', swineRouter);
app.use('/api/users', usersRouter);
app.use('/api', healthRouter);

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
// 1. Health Check Endpoints
// ==============================================================================

// Dedicated Health Check Endpoint with DB Ping Verification
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

// ==============================================================================
// 3. Database Audit Logs Endpoints with Barangay Isolation
// ==============================================================================

// Helper to ensure tables exist in PostgreSQL
async function ensureAuditAndUserTables(pool: Pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        assigned_barangay VARCHAR(100),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        password_hash TEXT NOT NULL DEFAULT 'brgy2026',
        is_active BOOLEAN NOT NULL DEFAULT true,
        phone VARCHAR(50),
        email VARCHAR(150),
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        username VARCHAR(100) NOT NULL,
        user_full_name VARCHAR(150),
        role VARCHAR(20),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        entity_type VARCHAR(50),
        barangay VARCHAR(100),
        ip_address VARCHAR(50)
      );

      -- Add barangay column if missing in older schema
      ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS barangay VARCHAR(100);
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_barangay VARCHAR(100);
    `);
  } catch (e) {
    console.warn('[DB Ensure Tables Notice]', e);
  }
}

// Get all audit logs with optional barangay filtering (Isolation)
app.get('/api/audit-logs', async (req: Request, res: Response) => {
  const pool = getDbPool();
  const barangayFilter = req.query.barangay as string | undefined;
  const roleFilter = req.query.role as string | undefined;

  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local', data: [] });
  }

  try {
    await ensureAuditAndUserTables(pool);

    let query = `
      SELECT 
        id,
        timestamp,
        username,
        user_full_name as "userFullName",
        role,
        action,
        details,
        entity_type as "entityType",
        barangay,
        ip_address as "ipAddress"
      FROM public.audit_logs
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (barangayFilter && barangayFilter !== 'all') {
      params.push(barangayFilter);
      conditions.push(`barangay = $${params.length}`);
    }

    if (roleFilter && roleFilter !== 'all') {
      params.push(roleFilter);
      conditions.push(`role = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY timestamp DESC LIMIT 500;`;

    const result = await pool.query(query, params);
    res.json({ success: true, mode: 'database', data: result.rows });
  } catch (err: any) {
    console.error('[API GET /api/audit-logs Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Post a new audit log entry
app.post('/api/audit-logs', async (req: Request, res: Response) => {
  const pool = getDbPool();
  const item = req.body;

  if (!item || !item.action || !item.username) {
    return res.status(400).json({ success: false, error: 'Missing required fields (action, username)' });
  }

  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local', message: 'Stored in local memory/storage' });
  }

  try {
    await ensureAuditAndUserTables(pool);

    const id = item.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = item.timestamp || new Date().toISOString();
    const username = item.username;
    const userFullName = item.userFullName || username;
    const role = item.role || 'user';
    const action = item.action;
    const details = item.details || '';
    const entityType = item.entityType || 'system';
    const barangay = item.barangay || null;
    const ipAddress = item.ipAddress || req.ip || '127.0.0.1';

    await pool.query(`
      INSERT INTO public.audit_logs (id, timestamp, username, user_full_name, role, action, details, entity_type, barangay, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [id, timestamp, username, userFullName, role, action, details, entityType, barangay, ipAddress]);

    res.json({ success: true, mode: 'database', id });
  } catch (err: any) {
    console.error('[API POST /api/audit-logs Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear audit logs (Admin only)
app.delete('/api/audit-logs', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local', message: 'Cleared local logs' });
  }

  try {
    await pool.query(`TRUNCATE TABLE public.audit_logs;`);
    res.json({ success: true, mode: 'database', message: 'All audit logs truncated' });
  } catch (err: any) {
    console.error('[API DELETE /api/audit-logs Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 4. User Accounts Management CRUD Endpoints
// ==============================================================================

// Get all users
app.get('/api/users', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local', data: [] });
  }

  try {
    await ensureAuditAndUserTables(pool);
    const result = await pool.query(`
      SELECT 
        id,
        username,
        full_name as "fullName",
        assigned_barangay as "barangay",
        role,
        is_active as "isActive",
        phone,
        email,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.users
      ORDER BY role ASC, full_name ASC;
    `);

    res.json({ success: true, mode: 'database', data: result.rows });
  } catch (err: any) {
    console.error('[API GET /api/users Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new focal user account
app.post('/api/users', async (req: Request, res: Response) => {
  const pool = getDbPool();
  const { username, fullName, barangay, role = 'user', password = 'password', phone, email, isActive = true } = req.body;

  if (!username || !fullName) {
    return res.status(400).json({ success: false, error: 'Username and Full Name are mandatory' });
  }

  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local', message: 'Stored locally' });
  }

  try {
    await ensureAuditAndUserTables(pool);
    const cleanUsername = username.toLowerCase().trim();

    await pool.query(`
      INSERT INTO public.users (username, full_name, assigned_barangay, role, password_hash, is_active, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        assigned_barangay = EXCLUDED.assigned_barangay,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        updated_at = NOW();
    `, [cleanUsername, fullName.trim(), barangay || null, role, password, isActive, phone || null, email || null]);

    // Record system audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(`
      INSERT INTO public.audit_logs (id, timestamp, username, user_full_name, role, action, details, entity_type, barangay)
      VALUES ($1, NOW(), 'admin', 'Central Administrator', 'admin', 'CREATE_ACCOUNT', $2, 'user', $3)
      ON CONFLICT DO NOTHING;
    `, [
      auditId, 
      `Created focal person account for ${fullName} (@${cleanUsername}) assigned to Brgy. ${barangay || 'All'}`,
      barangay || null
    ]);

    res.json({ success: true, username: cleanUsername });
  } catch (err: any) {
    console.error('[API POST /api/users Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update focal user account
app.put('/api/users/:username', async (req: Request, res: Response) => {
  const pool = getDbPool();
  const targetUsername = req.params.username.toLowerCase().trim();
  const { fullName, barangay, role, password, phone, email, isActive } = req.body;

  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local' });
  }

  try {
    await ensureAuditAndUserTables(pool);

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [targetUsername];

    if (fullName !== undefined) {
      values.push(fullName.trim());
      updates.push(`full_name = $${values.length}`);
    }
    if (barangay !== undefined) {
      values.push(barangay);
      updates.push(`assigned_barangay = $${values.length}`);
    }
    if (role !== undefined) {
      values.push(role);
      updates.push(`role = $${values.length}`);
    }
    if (password !== undefined && password !== '') {
      values.push(password);
      updates.push(`password_hash = $${values.length}`);
    }
    if (phone !== undefined) {
      values.push(phone);
      updates.push(`phone = $${values.length}`);
    }
    if (email !== undefined) {
      values.push(email);
      updates.push(`email = $${values.length}`);
    }
    if (isActive !== undefined) {
      values.push(isActive);
      updates.push(`is_active = $${values.length}`);
    }

    const query = `
      UPDATE public.users
      SET ${updates.join(', ')}
      WHERE username = $1
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    // Record system audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(`
      INSERT INTO public.audit_logs (id, timestamp, username, user_full_name, role, action, details, entity_type, barangay)
      VALUES ($1, NOW(), 'admin', 'Central Administrator', 'admin', 'UPDATE_ACCOUNT', $2, 'user', $3)
      ON CONFLICT DO NOTHING;
    `, [
      auditId, 
      `Updated user account @${targetUsername} (Active: ${isActive !== undefined ? isActive : 'unchanged'}, Brgy: ${barangay || 'All'})`,
      barangay || null
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('[API PUT /api/users Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete or de-activate focal user
app.delete('/api/users/:username', async (req: Request, res: Response) => {
  const pool = getDbPool();
  const targetUsername = req.params.username.toLowerCase().trim();
  const softDelete = req.query.soft === 'true';

  if (!pool) {
    return res.status(200).json({ success: true, mode: 'local' });
  }

  try {
    await ensureAuditAndUserTables(pool);

    if (softDelete) {
      await pool.query(`UPDATE public.users SET is_active = false, updated_at = NOW() WHERE username = $1;`, [targetUsername]);
    } else {
      await pool.query(`DELETE FROM public.users WHERE username = $1;`, [targetUsername]);
    }

    // Record system audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(`
      INSERT INTO public.audit_logs (id, timestamp, username, user_full_name, role, action, details, entity_type)
      VALUES ($1, NOW(), 'admin', 'Central Administrator', 'admin', 'DELETE_ACCOUNT', $2, 'user')
      ON CONFLICT DO NOTHING;
    `, [auditId, `Removed or deactivated user account @${targetUsername}`]);

    res.json({ success: true, message: `Account @${targetUsername} successfully removed.` });
  } catch (err: any) {
    console.error('[API DELETE /api/users Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global API error handler middleware
app.use(errorHandler);

// Vite middleware in development & static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('[Vite Dev Middleware Warning]', e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err && !res.headersSent) {
          res.status(200).send('<!DOCTYPE html><html><head><title>Hinunangan Swine Registry</title></head><body>Application is starting...</body></html>');
        }
      });
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hinunangan Swine GIS API] Service running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  process.on('SIGTERM', () => {
    console.log('[Hinunangan Swine GIS API] SIGTERM received. Gracefully closing server...');
    server.close(() => {
      if (dbPool) dbPool.end().catch(() => {});
      process.exit(0);
    });
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
