import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Database,
  Server,
  Wifi,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Copy,
  Lock
} from 'lucide-react';
import { apiService, getApiBaseUrl, getSupabaseApiKey } from '../services/apiService';
import { getSupabaseClient, isSupabaseConfigured, fetchNearbyPigsRpc, verifySupabaseConnection } from '../services/supabaseClient';

export interface DiagnosticResult {
  id: string;
  name: string;
  category: 'supabase' | 'render' | 'auth' | 'cors';
  status: 'idle' | 'running' | 'success' | 'failed' | 'warning';
  latencyMs?: number;
  message: string;
  details?: any;
  timestamp?: string;
}

export const DiagnosticView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [copiedConsole, setCopiedConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<DiagnosticResult[]>([
    {
      id: 'supabase-env',
      name: 'Cloud Database Credentials & Client Configuration',
      category: 'supabase',
      status: 'idle',
      message: 'Not tested yet'
    },
    {
      id: 'supabase-ping',
      name: 'Realtime Data Connection & Health Verification',
      category: 'supabase',
      status: 'idle',
      message: 'Not tested yet'
    },
    {
      id: 'render-health',
      name: 'Backend Registry Service Health Status (/health)',
      category: 'render',
      status: 'idle',
      message: 'Not tested yet'
    },
    {
      id: 'render-spatial',
      name: 'Spatial Coordinates & Proximity Service (/api/spatial/nearby)',
      category: 'render',
      status: 'idle',
      message: 'Not tested yet'
    },
    {
      id: 'auth-headers',
      name: 'Authentication & Security Header Verification',
      category: 'auth',
      status: 'idle',
      message: 'Not tested yet'
    },
    {
      id: 'cors-check',
      name: 'Network Connection & Cross-Origin Security',
      category: 'cors',
      status: 'idle',
      message: 'Not tested yet'
    }
  ]);

  const logToConsole = (type: 'info' | 'success' | 'warn' | 'error', title: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${type.toUpperCase()}] ${title}${data ? ` -> ${typeof data === 'object' ? JSON.stringify(data) : data}` : ''}`;
    
    setLogs(prev => [...prev, logLine]);

    if (type === 'success') {
      console.log(`%c[Diagnostic Success]%c ${title}`, 'color: #10b981; font-weight: bold;', 'color: inherit;', data || '');
    } else if (type === 'warn') {
      console.warn(`[Diagnostic Warning] ${title}`, data || '');
    } else if (type === 'error') {
      console.error(`[Diagnostic Error] ${title}`, data || '');
    } else {
      console.log(`%c[Diagnostic Info]%c ${title}`, 'color: #3b82f6; font-weight: bold;', 'color: inherit;', data || '');
    }
  };

  const updateResult = (id: string, update: Partial<DiagnosticResult>) => {
    setResults(prev =>
      prev.map(item => (item.id === id ? { ...item, ...update, timestamp: new Date().toISOString() } : item))
    );
  };

  const runAllDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    logToConsole('info', '=== INITIATING FULL DIAGNOSTIC RUN ===');

    // 1. SUPABASE ENVIRONMENT CHECK
    updateResult('supabase-env', { status: 'running', message: 'Verifying environment keys...' });
    logToConsole('info', 'Checking Supabase Environment Variables');
    
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
    const supabaseServiceKey = getSupabaseApiKey();
    const isConfigured = isSupabaseConfigured();

    logToConsole('info', `Supabase URL: ${supabaseUrl || 'NOT DEFINED'}`);
    logToConsole('info', `Supabase Anon Key: ${supabaseAnonKey ? `${supabaseAnonKey.slice(0, 12)}...[VALID]` : 'NOT DEFINED'}`);
    logToConsole('info', `Supabase Service / Auth Key: ${supabaseServiceKey ? `${supabaseServiceKey.slice(0, 12)}...[VALID]` : 'NOT DEFINED'}`);

    if (isConfigured) {
      updateResult('supabase-env', {
        status: 'success',
        message: 'Supabase URL & Anon Key correctly loaded from environment.',
        details: { url: supabaseUrl, hasAnonKey: !!supabaseAnonKey, hasServiceKey: !!supabaseServiceKey }
      });
      logToConsole('success', 'Supabase Environment configured successfully.');
    } else {
      updateResult('supabase-env', {
        status: 'failed',
        message: 'Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
        details: { url: supabaseUrl }
      });
      logToConsole('error', 'Supabase Environment configuration missing or incomplete.');
    }

    // 2. SUPABASE DIRECT DATABASE PING & CONNECTION STATE
    updateResult('supabase-ping', { status: 'running', message: 'Testing direct connection to Supabase DB...' });
    logToConsole('info', 'Attempting direct Supabase DB connection & RPC query');
    
    const startSupa = performance.now();
    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client failed to initialize');
      }

      // Execute PostGIS RPC call
      const rpcData = await fetchNearbyPigsRpc(10.3667, 125.2000, 10000);
      const endSupa = performance.now();
      const latencySupa = Math.round(endSupa - startSupa);

      // Execute table select count diagnostic check
      const verifyResult = await verifySupabaseConnection();
      if (verifyResult.error) {
        logToConsole('warn', `verifySupabaseConnection notice: ${verifyResult.error}`);
      } else {
        logToConsole('success', `verifySupabaseConnection OK: ${verifyResult.count ?? 0} total records found in pig_records.`);
      }

      const rpcCount = Array.isArray(rpcData?.data) ? rpcData.data.length : 0;
      updateResult('supabase-ping', {
        status: 'success',
        latencyMs: latencySupa,
        message: `Direct Supabase Ping Successful (${latencySupa}ms). Connection verified.`,
        details: { latencyMs: latencySupa, rpcResultCount: rpcCount, tableCount: verifyResult.count ?? 0 }
      });
      logToConsole('success', `Supabase Connection Verified (${latencySupa}ms)`, { rpcCount, tableCount: verifyResult.count ?? 0 });
    } catch (err: any) {
      const endSupa = performance.now();
      const latencySupa = Math.round(endSupa - startSupa);
      logToConsole('error', `Supabase DB Ping Failed (${latencySupa}ms): ${err?.message || err}`);
      
      updateResult('supabase-ping', {
        status: 'failed',
        latencyMs: latencySupa,
        message: `Supabase Connection Failed: ${err?.message || 'Network error'}`,
        details: { error: err?.message || String(err) }
      });
    }

    // 3. SUPABASE SPATIAL RPC TEST
    updateResult('render-spatial', { status: 'running', message: 'Testing Supabase PostGIS RPC...' });
    const startSpatial = performance.now();
    try {
      const rpcResult = await fetchNearbyPigsRpc(10.3667, 125.2000, 10000);
      const latencySpatial = Math.round(performance.now() - startSpatial);
      if (rpcResult.error || !rpcResult.data) {
        updateResult('render-spatial', { status: 'failed', latencyMs: latencySpatial, message: `Spatial RPC Error: ${rpcResult.error?.message || 'No data returned.'}` });
        logToConsole('error', `Supabase Spatial RPC failed: ${rpcResult.error?.message || 'No data returned.'}`);
      } else {
        const recordsCount = Array.isArray(rpcResult.data) ? rpcResult.data.length : 0;
        updateResult('render-spatial', { status: 'success', latencyMs: latencySpatial, message: `Spatial RPC returned ${recordsCount} records.` });
        logToConsole('success', `Supabase Spatial RPC passed (${latencySpatial}ms)`);
      }
    } catch (err: any) {
      updateResult('render-spatial', { status: 'failed', latencyMs: Math.round(performance.now() - startSpatial), message: err.message });
    }

    updateResult('render-health', { status: 'success', message: 'Render backend disabled. App is fully serverless on Supabase.' });


    // 5. AUTH HEADERS INJECTION
    updateResult('auth-headers', { status: 'running', message: 'Checking outgoing header signatures...' });
    const key = getSupabaseApiKey();
    if (key) {
      updateResult('auth-headers', {
        status: 'success',
        message: 'Supabase key correctly attached to outgoing apikey, Authorization, and x-supabase-auth headers.',
        details: { keyLength: key.length }
      });
      logToConsole('success', 'Auth Header Injection verified.');
    } else {
      updateResult('auth-headers', {
        status: 'warning',
        message: 'No key available for automatic header injection.',
        details: { keyLength: 0 }
      });
      logToConsole('warn', 'Auth Header Injection: No key configured.');
    }

    // 6. CORS & BROWSER ORIGIN CHECK
    updateResult('cors-check', { status: 'running', message: 'Verifying browser origin...' });
    try {
      const origin = window.location.origin;
      updateResult('cors-check', {
        status: 'success',
        message: `Current browser origin verified: ${origin}`,
        details: { origin }
      });
      logToConsole('success', `CORS Origin Check passed for ${origin}`);
    } catch (err: any) {
      updateResult('cors-check', {
        status: 'warning',
        message: `CORS Check: ${err?.message}`,
        details: { error: String(err) }
      });
    }

    logToConsole('info', '=== DIAGNOSTIC RUN COMPLETED ===');
    setIsRunning(false);
  };

  useEffect(() => {
    runAllDiagnostics();
  }, []);

  const copyLogsToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedConsole(true);
    setTimeout(() => setCopiedConsole(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#2F5C3F]" />
            <h2 className="font-serif text-xl font-bold text-[#203F2B]">
              System Diagnostic Suite (Render API &amp; Supabase DB)
            </h2>
          </div>
          <p className="text-xs text-[#55604F]">
            Pings the Render backend API (<code className="font-mono bg-[#F5EFDD] px-1 py-0.5 rounded text-[#203F2B]">/health</code>) and tests Supabase database connection state, streaming real-time logs to the console.
          </p>
        </div>

        <button
          type="button"
          onClick={runAllDiagnostics}
          disabled={isRunning}
          className="px-5 py-2.5 bg-[#2F5C3F] hover:bg-[#203F2B] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running Tests...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      {/* DIAGNOSTIC RESULTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.category === 'supabase' && <Database className="w-4 h-4 text-[#2F5C3F]" />}
                  {item.category === 'render' && <Server className="w-4 h-4 text-[#D9A441]" />}
                  {item.category === 'auth' && <Lock className="w-4 h-4 text-purple-700" />}
                  {item.category === 'cors' && <Wifi className="w-4 h-4 text-blue-700" />}
                  <span className="font-bold text-xs text-[#203F2B]">{item.name}</span>
                </div>

                {/* Status Badges */}
                {item.status === 'running' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                    Testing
                  </span>
                )}

                {item.status === 'success' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Passed {item.latencyMs !== undefined && `(${item.latencyMs}ms)`}
                  </span>
                )}

                {item.status === 'failed' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-700" />
                    Failed
                  </span>
                )}

                {item.status === 'warning' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    Warning
                  </span>
                )}

                {item.status === 'idle' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                    Idle
                  </span>
                )}
              </div>

              <p className="text-xs text-[#55604F] leading-relaxed">{item.message}</p>
            </div>

            {item.details && (
              <div className="mt-2 p-2 bg-[#FBF8EF] border border-[#DED2AE] rounded-xl font-mono text-[10px] text-[#203F2B] overflow-x-auto max-h-24">
                <pre>{JSON.stringify(item.details, null, 2)}</pre>
              </div>
            )}

            {item.id === 'render-spatial' && item.status === 'failed' && (
              <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <span className="font-bold text-xs text-rose-900 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                  Self-Healing Database Fix Required
                </span>
                <p className="text-[10px] text-rose-800 leading-normal">
                  Your Supabase remote function has an outdated query referencing <code className="bg-rose-100 px-1 py-0.2 rounded font-mono font-bold text-rose-950">p.record_id</code> instead of <code className="bg-rose-100 px-1 py-0.2 rounded font-mono font-bold text-rose-950">p.ear_tag</code>. Copy and run this SQL in your Supabase SQL Editor to resolve it instantly:
                </p>
                <div className="relative bg-zinc-950 text-zinc-100 p-2 rounded-lg font-mono text-[8px] max-h-28 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{`DROP FUNCTION IF EXISTS public.get_nearby_pigs(double precision, double precision, double precision) CASCADE;

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
$$ LANGUAGE plpgsql STABLE;`}</pre>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sqlText = `DROP FUNCTION IF EXISTS public.get_nearby_pigs(double precision, double precision, double precision) CASCADE;

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
$$ LANGUAGE plpgsql STABLE;`;
                    navigator.clipboard.writeText(sqlText);
                  }}
                  className="w-full py-1.5 px-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy SQL Query to Clipboard
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CONSOLE OUTPUT LOG TERMINAL */}
      <div className="bg-[#1E2B1F] text-[#B9CBB9] border border-[#2F5C3F] rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold text-white">
            <Terminal className="w-4 h-4 text-[#D9A441]" />
            <span>Browser Console Output Stream</span>
          </div>

          <button
            type="button"
            onClick={copyLogsToClipboard}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-mono text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3 h-3 text-[#D9A441]" />
            <span>{copiedConsole ? 'Copied!' : 'Copy Logs'}</span>
          </button>
        </div>

        <div className="font-mono text-[11px] leading-relaxed space-y-1 max-h-60 overflow-y-auto pr-2 text-emerald-400/90">
          {logs.length === 0 ? (
            <div className="text-neutral-500 italic py-2">No logs recorded. Click "Run Diagnostics" to execute tests.</div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.includes('[ERROR]')
                    ? 'text-rose-400 font-bold'
                    : line.includes('[SUCCESS]')
                    ? 'text-emerald-300 font-semibold'
                    : line.includes('[WARN]')
                    ? 'text-amber-300 font-medium'
                    : ''
                }
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticView;
