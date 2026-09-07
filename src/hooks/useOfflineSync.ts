import { useState, useEffect, useCallback, useMemo } from 'react';
import { SyncQueueItem } from '../types';
import { 
  loadSyncQueue, 
  getLastSyncTime, 
  getSimulateOffline, 
  setSimulateOffline,
  processSyncQueue, 
  removeSyncItem, 
  clearCompletedSyncItems,
  exportSyncQueuePackage,
  parseAndImportSyncQueuePackage
} from '../services/syncService';

export function useOfflineSync() {
  const [isPhysicalOnline, setIsPhysicalOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOfflineState] = useState<boolean>(getSimulateOffline());
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(loadSyncQueue());
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Effective online status
  const isOnline = isPhysicalOnline && !isSimulatedOffline;

  // Sync state stats
  const pendingCount = syncQueue.filter(item => item.status === 'pending').length;
  const errorCount = syncQueue.filter(item => item.status === 'error').length;
  const syncedCount = syncQueue.filter(item => item.status === 'synced').length;

  // Set of record IDs that are pending synchronization (offline drafts or edits)
  const pendingRecordIds = useMemo(() => {
    const ids = new Set<string>();
    syncQueue.forEach(item => {
      if (item.status === 'pending' || item.status === 'error') {
        ids.add(item.recordId);
      }
    });
    return ids;
  }, [syncQueue]);

  const refreshQueue = useCallback(() => {
    setSyncQueue(loadSyncQueue());
    setLastSyncTimeState(getLastSyncTime());
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    const next = !isSimulatedOffline;
    setSimulateOffline(next);
    setIsSimulatedOfflineState(next);
    if (!next && autoSyncEnabled) {
      setTimeout(() => {
        processSyncQueue().then(refreshQueue);
      }, 150);
    }
  }, [isSimulatedOffline, autoSyncEnabled, refreshQueue]);

  const triggerSync = useCallback(async (targetId?: string) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Synchronizing with Central DA Hinunangan Database...');
    try {
      const res = await processSyncQueue(targetId);
      refreshQueue();
      if (res.failedCount > 0) {
        setSyncFeedback(`Sync complete with ${res.failedCount} error(s). ${res.successCount} item(s) updated.`);
      } else if (res.successCount > 0) {
        setSyncFeedback(`Successfully synchronized ${res.successCount} item(s) to registry.`);
      } else {
        setSyncFeedback('All offline records are up to date.');
      }
    } catch (err) {
      setSyncFeedback(`Sync failed: ${(err as Error).message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  }, [isSyncing, refreshQueue]);

  // Handle Online / Offline window events and automatic sync
  useEffect(() => {
    const handleOnline = () => {
      setIsPhysicalOnline(true);
      // If auto-sync is enabled and not simulated offline, trigger live background sync
      if (!getSimulateOffline() && autoSyncEnabled) {
        processSyncQueue().then(refreshQueue);
      }
    };

    const handleOffline = () => {
      setIsPhysicalOnline(false);
    };

    const handleCustomQueueUpdate = () => {
      refreshQueue();
    };

    const handleConnectionChange = () => {
      const currentSim = getSimulateOffline();
      setIsSimulatedOfflineState(currentSim);
      if (!currentSim && autoSyncEnabled) {
        processSyncQueue().then(refreshQueue);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && !getSimulateOffline() && (typeof navigator !== 'undefined' ? navigator.onLine : true)) {
        const queue = loadSyncQueue();
        const hasPending = queue.some(q => q.status === 'pending' || q.status === 'error');
        if (hasPending && autoSyncEnabled) {
          processSyncQueue().then(refreshQueue);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('hinunangan_sync_queue_updated', handleCustomQueueUpdate);
    window.addEventListener('hinunangan_connection_change', handleConnectionChange);
    window.addEventListener('hinunangan_data_synced', handleCustomQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('hinunangan_sync_queue_updated', handleCustomQueueUpdate);
      window.removeEventListener('hinunangan_connection_change', handleConnectionChange);
      window.removeEventListener('hinunangan_data_synced', handleCustomQueueUpdate);
    };
  }, [autoSyncEnabled, refreshQueue]);

  // Periodic automatic sync heartbeat when online with pending items
  useEffect(() => {
    if (!isOnline || !autoSyncEnabled || pendingCount === 0) return;

    const interval = setInterval(() => {
      if (isOnline && autoSyncEnabled) {
        processSyncQueue().then(refreshQueue).catch(() => {});
      }
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [isOnline, autoSyncEnabled, pendingCount, refreshQueue]);

  const removeQueueItem = useCallback((id: string) => {
    removeSyncItem(id);
    refreshQueue();
  }, [refreshQueue]);

  const clearCompleted = useCallback(() => {
    clearCompletedSyncItems();
    refreshQueue();
  }, [refreshQueue]);

  const exportOutbox = useCallback(() => {
    exportSyncQueuePackage(syncQueue);
  }, [syncQueue]);

  const importOutbox = useCallback((jsonStr: string) => {
    const res = parseAndImportSyncQueuePackage(jsonStr);
    refreshQueue();
    return res;
  }, [refreshQueue]);

  const isRecordPending = useCallback((recordId: string) => {
    return pendingRecordIds.has(recordId);
  }, [pendingRecordIds]);

  return {
    isOnline,
    isPhysicalOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    toggleSimulateOffline: toggleSimulatedOffline,
    syncQueue,
    pendingCount,
    errorCount,
    syncedCount,
    pendingRecordIds,
    isRecordPending,
    lastSyncTime,
    isSyncing,
    autoSyncEnabled,
    setAutoSyncEnabled,
    syncFeedback,
    triggerSync,
    removeQueueItem,
    clearCompleted,
    exportOutbox,
    importOutbox,
    refreshQueue
  };
}
