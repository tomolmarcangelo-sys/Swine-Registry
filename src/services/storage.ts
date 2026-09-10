import { DEFAULT_USERS } from '../data/constants';
import { PigRecord, User, AuditLogItem } from '../types';
import { savePigsToIdb, loadPigsFromIdb } from './indexedDbService';

const STORAGE_USERS = 'hinunangan_da_users_v4';
const STORAGE_PIGS = 'hinunangan_da_pigs_v4';
const STORAGE_CURRENT_USER = 'hinunangan_da_auth_v4';
const STORAGE_AUDIT_LOGS = 'hinunangan_da_audit_logs_v4';

export function loadStoredAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_LOGS);
    if (!raw) {
      // Seed initial demo audit logs representing activity across accounts and admin
      const initialLogs: AuditLogItem[] = [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          username: 'admin',
          userFullName: 'Municipal Agriculturist Office',
          role: 'admin',
          action: 'SYSTEM_STARTUP',
          details: 'Initialized Hinunangan DA Swine Registry & Biosecurity System',
          barangay: null,
          entityType: 'system'
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          username: 'admin',
          userFullName: 'Municipal Agriculturist Office',
          role: 'admin',
          action: 'CREATE_ACCOUNT',
          details: 'Created focal person account for Barangay Poblacion (poblacion.brgy)',
          barangay: 'Poblacion',
          entityType: 'user'
        },
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          username: 'poblacion.brgy',
          userFullName: 'Maria Elena Santos',
          role: 'user',
          action: 'REGISTER_PIG',
          details: 'Registered swine tag HIN-POB-2026-001 (Duroc, 45kg) in Brgy. Poblacion',
          barangay: 'Poblacion',
          entityType: 'pig'
        },
        {
          id: 'log-4',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          username: 'nava.brgy',
          userFullName: 'Ariel Tocmo',
          role: 'user',
          action: 'UPDATE_BIOSECURITY',
          details: 'Submitted biosecurity compliance inspection for Brgy. Nava',
          barangay: 'Nava',
          entityType: 'pig'
        }
      ];
      localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function loadAuditLogsFromDb(barangayScope?: string | null): Promise<AuditLogItem[]> {
  try {
    const url = barangayScope 
      ? `/api/audit-logs?barangay=${encodeURIComponent(barangayScope)}` 
      : '/api/audit-logs';
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
  } catch (err) {
    console.warn('Failed to load audit logs from database, falling back to local storage', err);
  }
  return loadStoredAuditLogs();
}

export function logSystemAction(
  user: User | null,
  action: string,
  details: string,
  entityType: 'pig' | 'user' | 'system' | 'auth' = 'system',
  barangayOverride?: string | null
): AuditLogItem {
  // Infer barangay: priority to override, then user's assigned barangay, then check details
  let targetBarangay: string | null = barangayOverride !== undefined 
    ? barangayOverride 
    : (user ? user.barangay : null);

  const newItem: AuditLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    username: user ? user.username : 'system',
    userFullName: user ? user.fullName : 'System Automatic',
    role: user ? user.role : 'admin',
    action,
    details,
    entityType,
    barangay: targetBarangay,
    ipAddress: '192.168.1.' + Math.floor(Math.random() * 80 + 10)
  };

  try {
    const existing = loadStoredAuditLogs();
    const updated = [newItem, ...existing].slice(0, 500); // keep last 500 logs
    localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(updated));

    // Also sync to backend database API
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    }).catch(err => console.warn('Background audit log db sync notice:', err));
  } catch (err) {
    console.error('Failed to record audit log', err);
  }

  return newItem;
}

export function loadStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveStoredUsers(users: User[]): void {
  try {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users to storage', err);
  }
}

export function loadStoredPigs(): PigRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_PIGS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredPigs(pigs: PigRecord[]): void {
  try {
    localStorage.setItem(STORAGE_PIGS, JSON.stringify(pigs));
    // Asynchronously save to durable IndexedDB store
    savePigsToIdb(pigs).catch(err => console.warn('IndexedDB pig save notice:', err));
  } catch (err) {
    console.error('Failed to save pigs to storage', err);
    savePigsToIdb(pigs).catch(idbErr => console.error('IndexedDB backup failed:', idbErr));
  }
}

export function loadStoredAuth(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredAuth(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER);
    }
  } catch (err) {
    console.error('Failed to save auth to storage', err);
  }
}

export interface BackupData {
  version: string;
  timestamp: string;
  system: string;
  municipality: string;
  pigsCount: number;
  usersCount: number;
  pigs: PigRecord[];
  users: User[];
}

export function generateBackupData(pigs: PigRecord[], users: User[]): BackupData {
  return {
    version: '4.0',
    timestamp: new Date().toISOString(),
    system: 'DA Hinunangan Swine Registry GIS & Biosecurity System',
    municipality: 'Hinunangan, Southern Leyte (40 Barangays)',
    pigsCount: pigs.length,
    usersCount: users.length,
    pigs,
    users
  };
}

export function downloadJsonBackup(pigs: PigRecord[], users: User[]): void {
  const backup = generateBackupData(pigs, users);
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `hinunangan-da-swine-registry-backup-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackupJson(jsonString: string): { 
  success: boolean; 
  data?: BackupData; 
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format.' };
    }

    // Accept both full BackupData schema and raw pigs/users arrays
    let pigs: PigRecord[] = [];
    let users: User[] = [];

    if (Array.isArray(parsed.pigs)) {
      pigs = parsed.pigs;
    } else if (Array.isArray(parsed)) {
      // Legacy or raw array format
      pigs = parsed;
    }

    if (Array.isArray(parsed.users)) {
      users = parsed.users;
    }

    // Validate pigs array items
    const validPigs = pigs.filter(p => p && typeof p === 'object' && p.id && p.earTag && p.barangay);
    
    // Validate users array items
    const validUsers = users.filter(u => u && typeof u === 'object' && u.username && u.role);

    if (validPigs.length === 0 && validUsers.length === 0 && pigs.length > 0) {
      return { success: false, error: 'The uploaded file does not contain valid swine or user records.' };
    }

    const backupData: BackupData = {
      version: parsed.version || '4.0',
      timestamp: parsed.timestamp || new Date().toISOString(),
      system: parsed.system || 'DA Hinunangan Swine Registry Backup',
      municipality: parsed.municipality || 'Hinunangan, Southern Leyte',
      pigsCount: validPigs.length,
      usersCount: validUsers.length,
      pigs: validPigs,
      users: validUsers.length > 0 ? validUsers : loadStoredUsers()
    };

    return { success: true, data: backupData };
  } catch (err) {
    return { success: false, error: `Failed to parse JSON file: ${(err as Error).message}` };
  }
}

export function restoreBackupData(
  data: BackupData,
  mode: 'replace' | 'merge',
  currentPigs: PigRecord[],
  currentUsers: User[]
): { restoredPigs: PigRecord[]; restoredUsers: User[] } {
  let finalPigs: PigRecord[];
  let finalUsers: User[];

  if (mode === 'replace') {
    finalPigs = data.pigs;
    // Always preserve at least default admin if backup users is empty
    finalUsers = data.users.length > 0 ? data.users : currentUsers;
  } else {
    // Merge mode: deduplicate by id/earTag for pigs and by username for users
    const pigMap = new Map<string, PigRecord>();
    currentPigs.forEach(p => pigMap.set(p.id, p));
    data.pigs.forEach(p => pigMap.set(p.id, p));
    finalPigs = Array.from(pigMap.values());

    const userMap = new Map<string, User>();
    currentUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    data.users.forEach(u => userMap.set(u.username.toLowerCase(), u));
    finalUsers = Array.from(userMap.values());
  }

  saveStoredPigs(finalPigs);
  saveStoredUsers(finalUsers);

  return { restoredPigs: finalPigs, restoredUsers: finalUsers };
}

export function resetToInitialSeed(): { pigs: PigRecord[]; users: User[] } {
  saveStoredPigs([]);
  saveStoredUsers(DEFAULT_USERS);
  return { pigs: [], users: DEFAULT_USERS };
}

