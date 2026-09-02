import { DEFAULT_USERS, INITIAL_SEED_PIGS } from '../data/constants';
import { PigRecord, User } from '../types';

const STORAGE_USERS = 'hinunangan_da_users_v4';
const STORAGE_PIGS = 'hinunangan_da_pigs_v4';
const STORAGE_CURRENT_USER = 'hinunangan_da_auth_v4';

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
      localStorage.setItem(STORAGE_PIGS, JSON.stringify(INITIAL_SEED_PIGS));
      return INITIAL_SEED_PIGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SEED_PIGS;
  }
}

export function saveStoredPigs(pigs: PigRecord[]): void {
  try {
    localStorage.setItem(STORAGE_PIGS, JSON.stringify(pigs));
  } catch (err) {
    console.error('Failed to save pigs to storage', err);
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
  saveStoredPigs(INITIAL_SEED_PIGS);
  saveStoredUsers(DEFAULT_USERS);
  return { pigs: INITIAL_SEED_PIGS, users: DEFAULT_USERS };
}

