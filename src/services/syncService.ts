import { SyncQueueItem, PigRecord, User, SyncActionType } from '../types';
import { loadStoredPigs, saveStoredPigs, loadStoredUsers, saveStoredUsers } from './storage';
import { 
  savePigToCloud, 
  deletePigFromCloud, 
  saveUserToCloud, 
  fetchPigsFromCloud, 
  fetchUsersFromCloud,
  batchSavePigsToCloud,
  batchSaveUsersToCloud
} from './firebase';

const STORAGE_SYNC_QUEUE = 'hinunangan_da_sync_queue_v4';
const STORAGE_LAST_SYNC = 'hinunangan_da_last_sync_timestamp';
const STORAGE_SIMULATE_OFFLINE = 'hinunangan_da_simulate_offline';
const STORAGE_CLOUD_INITIALIZED = 'hinunangan_da_cloud_initialized_v1';

export function loadSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_QUEUE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load sync queue', err);
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_SYNC_QUEUE, JSON.stringify(queue));
    // Dispatch custom event so all open tabs/components stay reactive
    window.dispatchEvent(new CustomEvent('hinunangan_sync_queue_updated', { detail: queue }));
  } catch (err) {
    console.error('Failed to save sync queue', err);
  }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_LAST_SYNC);
}

export function setLastSyncTime(timeIso: string): void {
  localStorage.setItem(STORAGE_LAST_SYNC, timeIso);
}

export function getSimulateOffline(): boolean {
  return localStorage.getItem(STORAGE_SIMULATE_OFFLINE) === 'true';
}

export function setSimulateOffline(simulate: boolean): void {
  localStorage.setItem(STORAGE_SIMULATE_OFFLINE, simulate ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('hinunangan_connection_change'));
}

export interface EnqueueSyncOptions {
  action: SyncActionType;
  entityType: 'pig' | 'user';
  recordId?: string;
  entityId?: string;
  data: PigRecord | Partial<PigRecord> | User | Record<string, unknown>;
  summary?: string;
  author?: string;
  barangay?: string;
}

export function enqueueSyncAction(
  actionOrOptions: SyncActionType | EnqueueSyncOptions,
  entityTypeParam?: 'pig' | 'user',
  recordIdParam?: string,
  dataParam?: PigRecord | Partial<PigRecord> | User | Record<string, unknown>,
  summaryParam?: string,
  authorParam?: string,
  barangayParam?: string
): SyncQueueItem {
  let action: SyncActionType;
  let entityType: 'pig' | 'user';
  let recordId: string;
  let data: PigRecord | Partial<PigRecord> | User | Record<string, unknown>;
  let summary: string;
  let author: string;
  let barangay: string;

  if (typeof actionOrOptions === 'object') {
    action = actionOrOptions.action;
    entityType = actionOrOptions.entityType;
    recordId = actionOrOptions.recordId || actionOrOptions.entityId || `item_${Date.now()}`;
    data = actionOrOptions.data;
    summary = actionOrOptions.summary || `${action.toUpperCase()} ${entityType}`;
    author = actionOrOptions.author || 'field_officer';
    barangay = actionOrOptions.barangay || 'Hinunangan';
  } else {
    action = actionOrOptions;
    entityType = entityTypeParam || 'pig';
    recordId = recordIdParam || `item_${Date.now()}`;
    data = dataParam || {};
    summary = summaryParam || `${action.toUpperCase()} ${entityType}`;
    author = authorParam || 'field_officer';
    barangay = barangayParam || 'Hinunangan';
  }

  const currentQueue = loadSyncQueue();
  
  const newItem: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    entityType,
    recordId,
    summary,
    data,
    timestamp: new Date().toISOString(),
    status: 'pending',
    author,
    barangay,
    retryCount: 0
  };

  const updatedQueue = [newItem, ...currentQueue];
  saveSyncQueue(updatedQueue);
  return newItem;
}

export function removeSyncItem(id: string): void {
  const queue = loadSyncQueue();
  const updated = queue.filter(item => item.id !== id);
  saveSyncQueue(updated);
}

export function clearCompletedSyncItems(): void {
  const queue = loadSyncQueue();
  const pendingOnly = queue.filter(item => item.status !== 'synced');
  saveSyncQueue(pendingOnly);
}

export function clearAllSyncQueue(): void {
  saveSyncQueue([]);
}

export interface SyncProcessResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  results: { id: string; success: boolean; message: string }[];
}

/**
 * Initializes and pulls data from Cloud Firestore if empty or on initial cloud sync
 */
export async function syncWithCloudFirestore(): Promise<{ pigs: PigRecord[]; users: User[] }> {
  try {
    let cloudPigs = await fetchPigsFromCloud();
    let cloudUsers = await fetchUsersFromCloud();

    let localPigs = loadStoredPigs();
    let localUsers = loadStoredUsers();

    // If Cloud is empty on first boot, seed Cloud from initial local database
    if (cloudPigs.length === 0 && localPigs.length > 0) {
      await batchSavePigsToCloud(localPigs);
      cloudPigs = localPigs;
    }

    if (cloudUsers.length === 0 && localUsers.length > 0) {
      await batchSaveUsersToCloud(localUsers);
      cloudUsers = localUsers;
    }

    // Merge Cloud data into local storage (Cloud authoritative)
    if (cloudPigs.length > 0) {
      const pigMap = new Map<string, PigRecord>();
      localPigs.forEach(p => pigMap.set(p.id, p));
      cloudPigs.forEach(p => pigMap.set(p.id, p));
      localPigs = Array.from(pigMap.values());
      saveStoredPigs(localPigs);
    }

    if (cloudUsers.length > 0) {
      const userMap = new Map<string, User>();
      localUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
      cloudUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
      localUsers = Array.from(userMap.values());
      saveStoredUsers(localUsers);
    }

    localStorage.setItem(STORAGE_CLOUD_INITIALIZED, 'true');
    setLastSyncTime(new Date().toISOString());

    return { pigs: localPigs, users: localUsers };
  } catch (err) {
    console.warn('Cloud sync fallback to local storage:', err);
    return { pigs: loadStoredPigs(), users: loadStoredUsers() };
  }
}

/**
 * Executes sync of pending operations directly to Firebase Cloud Firestore.
 * Applies mutations cleanly to both local cache and Cloud database.
 */
export async function processSyncQueue(targetId?: string): Promise<SyncProcessResult> {
  const queue = loadSyncQueue();
  const itemsToSync = targetId ? queue.filter(q => q.id === targetId) : queue.filter(q => q.status === 'pending' || q.status === 'error');

  if (itemsToSync.length === 0) {
    return { totalProcessed: 0, successCount: 0, failedCount: 0, results: [] };
  }

  const isSimOffline = getSimulateOffline();
  const isPhysOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const canSendToCloud = isPhysOnline && !isSimOffline;

  let currentPigs = loadStoredPigs();
  let currentUsers = loadStoredUsers();
  
  let successCount = 0;
  let failedCount = 0;
  const results: { id: string; success: boolean; message: string }[] = [];

  const updatedQueue = [...queue];

  for (let i = 0; i < updatedQueue.length; i++) {
    const item = updatedQueue[i];
    if (targetId && item.id !== targetId) continue;
    if (!targetId && item.status === 'synced') continue;

    try {
      if (item.entityType === 'pig') {
        const pigData = item.data as PigRecord;

        if (item.action === 'create') {
          const existingIdx = currentPigs.findIndex(p => p.id === item.recordId || p.earTag === pigData.earTag);
          if (existingIdx >= 0) {
            currentPigs[existingIdx] = pigData;
          } else {
            currentPigs = [pigData, ...currentPigs];
          }
          if (canSendToCloud) {
            await savePigToCloud(pigData);
          }
        } else if (item.action === 'update') {
          const idx = currentPigs.findIndex(p => p.id === item.recordId);
          if (idx >= 0) {
            currentPigs[idx] = { ...currentPigs[idx], ...pigData };
            if (canSendToCloud) {
              await savePigToCloud(currentPigs[idx]);
            }
          } else {
            currentPigs = [pigData as PigRecord, ...currentPigs];
            if (canSendToCloud) {
              await savePigToCloud(pigData as PigRecord);
            }
          }
        } else if (item.action === 'delete') {
          currentPigs = currentPigs.filter(p => p.id !== item.recordId);
          if (canSendToCloud) {
            await deletePigFromCloud(item.recordId);
          }
        }
      } else if (item.entityType === 'user') {
        const userData = item.data as User;
        if (item.action === 'create' || item.action === 'update') {
          const idx = currentUsers.findIndex(u => u.username.toLowerCase() === userData.username.toLowerCase());
          if (idx >= 0) {
            currentUsers[idx] = userData;
          } else {
            currentUsers = [...currentUsers, userData];
          }
          if (canSendToCloud) {
            await saveUserToCloud(userData);
          }
        } else if (item.action === 'delete') {
          currentUsers = currentUsers.filter(u => u.username.toLowerCase() !== item.recordId.toLowerCase());
        }
      }

      successCount++;
      results.push({ 
        id: item.id, 
        success: true, 
        message: canSendToCloud 
          ? 'Synchronized successfully to Firebase Firestore Cloud' 
          : 'Applied to local storage (queued for Cloud connection)' 
      });

      updatedQueue[i] = {
        ...item,
        status: 'synced' as const,
        lastAttempt: new Date().toISOString(),
        errorMessage: undefined
      };
    } catch (err) {
      failedCount++;
      const errMsg = (err as Error).message || 'Sync error';
      results.push({ id: item.id, success: false, message: errMsg });
      updatedQueue[i] = {
        ...item,
        status: 'error' as const,
        retryCount: (item.retryCount || 0) + 1,
        lastAttempt: new Date().toISOString(),
        errorMessage: errMsg
      };
    }
  }

  // Save updated local database
  saveStoredPigs(currentPigs);
  saveStoredUsers(currentUsers);
  saveSyncQueue(updatedQueue);
  setLastSyncTime(new Date().toISOString());

  // Notify listeners
  window.dispatchEvent(new CustomEvent('hinunangan_data_synced', { 
    detail: { timestamp: new Date().toISOString(), successCount } 
  }));

  return {
    totalProcessed: itemsToSync.length,
    successCount,
    failedCount,
    results
  };
}

export function exportSyncQueuePackage(queue: SyncQueueItem[]): void {
  const exportData = {
    packageType: 'HINUNANGAN_DA_OFFLINE_SYNC_OUTBOX',
    version: '4.0',
    exportTimestamp: new Date().toISOString(),
    municipality: 'Hinunangan, Southern Leyte',
    itemCount: queue.length,
    items: queue
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `hinunangan-offline-outbox-sync-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseAndImportSyncQueuePackage(jsonString: string): { 
  success: boolean; 
  importedCount: number; 
  error?: string 
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, importedCount: 0, error: 'Invalid JSON payload' };
    }

    let itemsToImport: SyncQueueItem[] = [];
    if (Array.isArray(parsed.items)) {
      itemsToImport = parsed.items;
    } else if (Array.isArray(parsed)) {
      itemsToImport = parsed;
    }

    const validItems = itemsToImport.filter(
      item => item && item.id && item.action && item.entityType && item.recordId
    );

    if (validItems.length === 0) {
      return { success: false, importedCount: 0, error: 'No valid sync queue items found in file' };
    }

    const currentQueue = loadSyncQueue();
    const existingIds = new Set(currentQueue.map(q => q.id));
    
    // Add only new non-duplicate items
    const newItems = validItems.filter(item => !existingIds.has(item.id));
    const merged = [...newItems, ...currentQueue];
    saveSyncQueue(merged);

    return { success: true, importedCount: newItems.length };
  } catch (err) {
    return { success: false, importedCount: 0, error: `Failed to import sync package: ${(err as Error).message}` };
  }
}
