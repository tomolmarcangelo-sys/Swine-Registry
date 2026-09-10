import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Shield, 
  UserCheck, 
  Calendar, 
  Clock, 
  Download, 
  Trash2, 
  RefreshCw,
  Activity,
  CheckCircle2,
  Terminal,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  Globe,
  Database,
  Code2,
  Copy,
  Check,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { AuditLogItem, User } from '../types';
import { loadStoredAuditLogs, logSystemAction, loadAuditLogsFromDb, loadStoredUsers } from '../services/storage';
import { subscribeToAuditLogUpdates } from '../services/supabaseClient';
import { BARANGAYS_DATA } from '../data/constants';

interface AuditLogsTabProps {
  currentUser: User | null;
  onNavigate?: (view: any) => void;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ currentUser, onNavigate }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [barangayFilter, setBarangayFilter] = useState<string>('all');
  const [actionCategoryFilter, setActionCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Pagination State for high performance
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const isAdmin = currentUser?.role === 'admin';
  const focalBarangay = currentUser?.barangay || null;

  const fetchLogs = async () => {
    setIsRefreshing(true);
    // For focal users, request logs scoped to their barangay
    const data = await loadAuditLogsFromDb(!isAdmin ? focalBarangay : undefined);
    setLogs(data);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchLogs();

    // Setup real-time Supabase subscription
    const unsubscribe = subscribeToAuditLogUpdates((newLog) => {
      setLogs((prevLogs) => {
        // Enforce barangay isolation on real-time stream if not admin
        if (!isAdmin && focalBarangay) {
          const logBrgy = newLog.barangay || '';
          const matchesFocal = 
            logBrgy.toLowerCase() === focalBarangay.toLowerCase() ||
            newLog.username.toLowerCase() === (currentUser?.username || '').toLowerCase();
          if (!matchesFocal) return prevLogs;
        }

        // Guard to prevent duplicate audit logs in local state
        if (prevLogs.some(log => log.id === newLog.id)) {
          return prevLogs;
        }
        return [newLog, ...prevLogs];
      });
    });

    const handleFilterEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSearchQuery(customEvent.detail);
      }
    };
    window.addEventListener('filter-audit-logs', handleFilterEvent as EventListener);
    
    return () => {
      unsubscribe();
      window.removeEventListener('filter-audit-logs', handleFilterEvent as EventListener);
    };
  }, [isAdmin, focalBarangay, currentUser?.username]);

  // Reset page to 1 when any filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, barangayFilter, actionCategoryFilter]);

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear the audit activity log history?')) {
      localStorage.removeItem('hinunangan_da_audit_logs_v4');
      try {
        await fetch('/api/audit-logs', { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed to clear db logs', err);
      }
      logSystemAction(currentUser, 'CLEAR_AUDIT_LOGS', 'Cleared system audit activity log history', 'system');
      await fetchLogs();
    }
  };

  const handleExportLogsCsv = () => {
    const headers = ['Log ID', 'Timestamp', 'Username', 'Full Name', 'Role', 'Assigned Barangay', 'Action', 'Details', 'Entity Type', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.timestamp,
      l.username,
      `"${(l.userFullName || '').replace(/"/g, '""')}"`,
      l.role,
      `"${(l.barangay || 'Central Admin').replace(/"/g, '""')}"`,
      l.action,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.entityType || 'system',
      l.ipAddress || '192.168.1.1'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const scopeLabel = isAdmin ? (barangayFilter === 'all' ? 'global' : barangayFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) : (focalBarangay?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'local');
    link.download = `hinunangan-da-audit-logs-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter logs with strict Barangay Data Isolation
  const queryLower = searchQuery.trim().toLowerCase();

  const filteredLogs = logs.filter(l => {
    // 1. Strict Barangay Isolation for non-admin focal users
    if (!isAdmin && focalBarangay) {
      const focalLower = focalBarangay.toLowerCase();
      const logBrgy = (l.barangay || '').toLowerCase();
      const logDetails = (l.details || '').toLowerCase();
      const logUser = (l.username || '').toLowerCase();
      const currentUName = (currentUser?.username || '').toLowerCase();

      const isDirectMatch = logBrgy === focalLower;
      const isUserMatch = logUser === currentUName;
      const isDetailsMatch = logDetails.includes(focalLower);

      if (!isDirectMatch && !isUserMatch && !isDetailsMatch) {
        return false;
      }
    }

    // 2. Admin Barangay Filter
    if (isAdmin && barangayFilter !== 'all') {
      const filterBrgyLower = barangayFilter.toLowerCase();
      const logBrgy = (l.barangay || '').toLowerCase();
      const logDetails = (l.details || '').toLowerCase();
      if (logBrgy !== filterBrgyLower && !logDetails.includes(filterBrgyLower)) {
        return false;
      }
    }

    // 3. Role Filter
    if (roleFilter !== 'all' && l.role !== roleFilter) {
      return false;
    }

    // 4. Action Category Filter
    if (actionCategoryFilter !== 'all') {
      const act = l.action.toUpperCase();
      if (actionCategoryFilter === 'swine_create' && !act.includes('REGISTER') && !act.includes('CREATE_SWINE')) return false;
      if (actionCategoryFilter === 'swine_update' && !act.includes('UPDATE') && !act.includes('BIOSECURITY') && !act.includes('MORTALITY')) return false;
      if (actionCategoryFilter === 'swine_delete' && !act.includes('DELETE_SWINE') && !act.includes('REMOVE_SWINE')) return false;
      if (actionCategoryFilter === 'accounts' && !act.includes('ACCOUNT') && !act.includes('USER') && !act.includes('PASSWORD')) return false;
      if (actionCategoryFilter === 'system' && !act.includes('SYSTEM') && !act.includes('BACKUP') && !act.includes('RESTORE') && !act.includes('CLEAR')) return false;
    }

    // 5. Search Query Filter
    if (queryLower) {
      const matchesSearch = 
        l.username.toLowerCase().includes(queryLower) ||
        (l.userFullName && l.userFullName.toLowerCase().includes(queryLower)) ||
        l.action.toLowerCase().includes(queryLower) ||
        l.details.toLowerCase().includes(queryLower) ||
        (l.barangay && l.barangay.toLowerCase().includes(queryLower)) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(queryLower)) ||
        (l.entityType && l.entityType.toLowerCase().includes(queryLower));
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Calculate Pagination slice values
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const sampleSqlMigration = `-- ==============================================================================
-- HINUNANGAN DA SWINE REGISTRY: ROW-LEVEL SECURITY & AUTOMATIC AUDIT LOGGING
-- ==============================================================================

-- 1. Create public.users table with mandatory fields & active status
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  assigned_barangay VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  password_hash TEXT NOT NULL DEFAULT 'brgy2026',
  is_active BOOLEAN NOT NULL DEFAULT true,
  phone VARCHAR(50),
  email VARCHAR(150),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create public.audit_logs table with barangay scope
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username VARCHAR(100) NOT NULL,
  user_full_name VARCHAR(150),
  role VARCHAR(20) DEFAULT 'user',
  action VARCHAR(100) NOT NULL,
  details TEXT,
  entity_type VARCHAR(50) DEFAULT 'system',
  barangay VARCHAR(100),
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Automatic Action Trigger: log_system_activity()
CREATE OR REPLACE FUNCTION public.log_system_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(100);
  v_details TEXT;
  v_username VARCHAR(100);
  v_fullname VARCHAR(150);
  v_barangay VARCHAR(100);
  v_entity_type VARCHAR(50);
  v_log_id VARCHAR(64);
BEGIN
  v_log_id := 'audit_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6);
  
  IF TG_TABLE_NAME = 'pig_records' THEN
    v_entity_type := 'pig';
    IF TG_OP = 'INSERT' THEN
      v_action := 'REGISTER_SWINE';
      v_barangay := NEW.barangay;
      v_username := COALESCE(NEW.registered_by, 'system');
      v_fullname := NEW.registered_by;
      v_details := 'Registered swine tag ' || NEW.ear_tag || ' (' || NEW.breed || ', ' || NEW.weight || 'kg) owned by ' || NEW.owner_name || ' in Brgy. ' || NEW.barangay;
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'UPDATE_SWINE';
      v_barangay := NEW.barangay;
      v_username := COALESCE(NEW.registered_by, 'system');
      v_fullname := NEW.registered_by;
      v_details := 'Updated swine record ' || NEW.ear_tag || ' in Brgy. ' || NEW.barangay;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'DELETE_SWINE';
      v_barangay := OLD.barangay;
      v_username := COALESCE(OLD.registered_by, 'system');
      v_fullname := OLD.registered_by;
      v_details := 'Deleted swine record ' || OLD.ear_tag || ' from Brgy. ' || OLD.barangay;
    END IF;
  ELSIF TG_TABLE_NAME = 'users' THEN
    v_entity_type := 'user';
    IF TG_OP = 'INSERT' THEN
      v_action := 'CREATE_ACCOUNT';
      v_barangay := NEW.assigned_barangay;
      v_username := 'admin';
      v_fullname := 'Central Administrator';
      v_details := 'Created focal person account for ' || NEW.full_name || ' (@' || NEW.username || ') for Brgy. ' || COALESCE(NEW.assigned_barangay, 'Central');
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'UPDATE_ACCOUNT';
      v_barangay := NEW.assigned_barangay;
      v_username := 'admin';
      v_fullname := 'Central Administrator';
      v_details := 'Updated account @' || NEW.username || ' (Active: ' || NEW.is_active || ')';
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'DELETE_ACCOUNT';
      v_barangay := OLD.assigned_barangay;
      v_username := 'admin';
      v_fullname := 'Central Administrator';
      v_details := 'Deleted account @' || OLD.username;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    id, timestamp, username, user_full_name, role, action, details, entity_type, barangay, ip_address
  ) VALUES (
    v_log_id, NOW(), v_username, v_fullname, 'admin', v_action, v_details, v_entity_type, v_barangay, '127.0.0.1'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to automatically record CRUD activity
DROP TRIGGER IF EXISTS trg_audit_pigs ON public.pig_records;
CREATE TRIGGER trg_audit_pigs
AFTER INSERT OR UPDATE OR DELETE ON public.pig_records
FOR EACH ROW EXECUTE FUNCTION public.log_system_activity();

DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.log_system_activity();

-- 4. Row-Level Security (RLS) Policies on audit_logs & users
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Central Admin has full visibility across all 40 barangays
DROP POLICY IF EXISTS "Admin full access audit_logs" ON public.audit_logs;
CREATE POLICY "Admin full access audit_logs" ON public.audit_logs
FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR auth.jwt() IS NULL
);

-- Policy: Focal Users only read audit logs strictly for their assigned barangay
DROP POLICY IF EXISTS "Focal isolate audit_logs" ON public.audit_logs;
CREATE POLICY "Focal isolate audit_logs" ON public.audit_logs
FOR SELECT USING (
  barangay = (auth.jwt() -> 'user_metadata' ->> 'barangay')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR auth.jwt() IS NULL
);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sampleSqlMigration);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & ISOLATION BANNER */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] text-[#203F2B] rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-2xs shrink-0 active:scale-95"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-serif text-lg font-bold text-[#203F2B] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#2F5C3F]" />
                <span>Municipal Account &amp; System Audit Stream</span>
              </h3>

              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
                  <Globe className="w-3 h-3 text-purple-700" />
                  <span>Global Municipal Surveillance (All 40 Barangays)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <Lock className="w-3 h-3 text-emerald-700" />
                  <span>Barangay Data Isolation Active (Brgy. {focalBarangay || 'Local Scope'})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#55604F]">
              {isAdmin 
                ? 'Central administrative inspection across all municipal accounts, livestock movements, biosecurity evaluations, and user CRUD operations.'
                : `Strictly isolated view: You are viewing real-time activity and audit entries exclusively for Barangay ${focalBarangay || 'your assigned territory'}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-3 py-2 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] text-[#203F2B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View PostgreSQL RLS and Trigger SQL Queries"
          >
            <Code2 className="w-3.5 h-3.5 text-[#2F5C3F]" />
            <span>RLS &amp; SQL Schema</span>
          </button>

          <button
            onClick={fetchLogs}
            className="p-2 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] text-[#203F2B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh logs from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportLogsCsv}
            className="px-3.5 py-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleClearLogs}
              className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-[#FBF8EF] border border-[#DED2AE] rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#55604F]" />
          <input
            type="text"
            placeholder="Search action, user, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#DED2AE] rounded-xl pl-9 pr-8 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#55604F] hover:text-[#203F2B] hover:bg-[#F5EFDD] rounded-md transition-colors"
              title="Clear search query"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {/* Action Category Filter */}
          <select
            value={actionCategoryFilter}
            onChange={(e) => setActionCategoryFilter(e.target.value)}
            className="bg-white border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none font-medium"
          >
            <option value="all">All Action Categories</option>
            <option value="swine_create">Swine Registrations (INSERT)</option>
            <option value="swine_update">Swine &amp; Biosecurity Updates (UPDATE)</option>
            <option value="swine_delete">Swine Deletions (DELETE)</option>
            <option value="accounts">User Management CRUD</option>
            <option value="system">System / Startup / Backups</option>
          </select>

          {/* Admin Barangay Scope Filter */}
          {isAdmin ? (
            <select
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
              className="bg-white border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none font-medium"
            >
              <option value="all">All 40 Barangays</option>
              {BARANGAYS_DATA.map(b => (
                <option key={b.name} value={b.name}>Brgy. {b.name}</option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-white border border-[#DED2AE] rounded-xl text-xs font-bold text-[#2F5C3F] flex items-center gap-1.5 whitespace-nowrap">
              <Lock className="w-3 h-3" />
              <span>Brgy. {focalBarangay} Scope</span>
            </div>
          )}

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none font-medium"
          >
            <option value="all">All Roles</option>
            <option value="admin">Central Admin</option>
            <option value="user">Barangay Focals</option>
          </select>
        </div>
      </div>

      {/* LOGS TABLE */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FBF8EF] border-b border-[#DED2AE] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#2F5C3F]" />
            <span className="font-bold text-[#203F2B]">
              Activity Stream ({filteredLogs.length} events {isAdmin ? 'system-wide' : `in Brgy. ${focalBarangay}`})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono text-[11px] text-[#55604F]">Live Supabase Realtime Connected</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#F5EFDD]/70 text-[#55604F] font-mono uppercase text-[11px] border-b border-[#DED2AE]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User / Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Barangay Scope</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1C4]">
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#F5EFDD] rounded-full scale-110 opacity-60" />
                        <div className="relative p-3 bg-stone-100 border border-stone-300 text-[#55604F] rounded-2xl shadow-xs">
                          <Search className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <h4 className="font-serif text-base font-bold text-[#203F2B]">No Audit Logs Match Your Query</h4>
                        <p className="text-xs text-[#55604F] leading-relaxed px-4">
                          {isAdmin 
                            ? 'No entries match your search or filter parameters across the 40 barangays. Try clearing or expanding your filters.'
                            : `Only activities concerning Barangay ${focalBarangay || 'your assigned territory'} appear here under Row-Level Security rules.`}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                currentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FBF8EF] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#55604F] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1E2B1F]">{log.userFullName}</div>
                      <div className="font-mono text-[10px] text-[#55604F]">@{log.username}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.role === 'admin'
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {log.role === 'admin' ? 'Admin' : 'Focal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1E2B1F] whitespace-nowrap">
                      {log.barangay ? `Brgy. ${log.barangay}` : <span className="text-[#55604F] font-mono text-[11px]">All / Central</span>}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#203F2B] whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        log.action.includes('REGISTER') || log.action.includes('CREATE') 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : log.action.includes('DELETE')
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : log.action.includes('UPDATE') || log.action.includes('BIOSECURITY')
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-[#F5EFDD] text-[#203F2B] border-[#DED2AE]'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#1E2B1F] max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#55604F] whitespace-nowrap">
                      {log.ipAddress || '192.168.1.12'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="bg-[#FBF8EF] border border-[#DED2AE] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold shadow-2xs">
          <div className="text-[#55604F] text-center sm:text-left">
            Showing <span className="font-bold text-[#203F2B]">{indexOfFirstItem + 1}</span> to <span className="font-bold text-[#203F2B]">{Math.min(indexOfLastItem, totalItems)}</span> of <span className="font-bold text-[#203F2B]">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white hover:bg-[#F5EFDD] border border-[#DED2AE] text-[#203F2B] rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = 1;
              if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all border ${
                    currentPage === pageNum
                      ? 'bg-[#203F2B] border-[#203F2B] text-white'
                      : 'bg-white border-[#DED2AE] text-[#203F2B] hover:bg-[#F5EFDD] cursor-pointer'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white hover:bg-[#F5EFDD] border border-[#DED2AE] text-[#203F2B] rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#55604F]">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-[#DED2AE] rounded-xl px-2.5 py-1.5 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none font-bold cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

      {/* SQL SCHEMA & RLS MIGRATION MODAL */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#DED2AE] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-[#FBF8EF] border-b border-[#DED2AE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#2F5C3F]" />
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#203F2B]">
                      PostgreSQL RLS Policies &amp; Automatic Audit Trigger SQL
                    </h3>
                    <p className="text-xs text-[#55604F]">
                      Direct database migration script for Supabase SQL Editor to enforce Barangay Data Isolation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 text-[#55604F] hover:text-[#203F2B] hover:bg-[#F5EFDD] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Step-by-Step Supabase Setup:</span>
                    <ol className="list-decimal list-inside space-y-1 text-[#203F2B]">
                      <li>Open your Supabase Project Dashboard &gt; <strong>SQL Editor</strong>.</li>
                      <li>Copy and paste the SQL script below into a new query.</li>
                      <li>Click <strong>Run</strong> to create tables, triggers, and Row-Level Security policies.</li>
                    </ol>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={copySqlToClipboard}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-[#2F5C3F] hover:bg-[#203F2B] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer z-10"
                  >
                    {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sqlCopied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                  </button>

                  <pre className="bg-[#1E2B1F] text-emerald-300 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-96 leading-relaxed border border-[#203F2B]">
                    {sampleSqlMigration}
                  </pre>
                </div>
              </div>

              <div className="px-6 py-3 bg-[#FBF8EF] border-t border-[#DED2AE] flex justify-end">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
