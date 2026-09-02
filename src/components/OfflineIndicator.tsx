import React from 'react';
import { WifiOff, RefreshCw, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export interface OfflineIndicatorProps {
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  pendingCount?: number;
  isSyncing?: boolean;
  onOpenSyncModal?: () => void;
  onTriggerSync?: () => Promise<void>;
  offlineSync?: ReturnType<typeof useOfflineSync>;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline: isOnlineProp,
  isSimulatedOffline: isSimulatedOfflineProp,
  pendingCount: pendingCountProp,
  isSyncing: isSyncingProp,
  onOpenSyncModal,
  onTriggerSync,
  offlineSync
}) => {
  const isOnline = offlineSync?.isOnline ?? isOnlineProp ?? true;
  const isSimulatedOffline = offlineSync?.isSimulatedOffline ?? isSimulatedOfflineProp ?? false;
  const pendingCount = offlineSync?.pendingCount ?? pendingCountProp ?? 0;
  const isSyncing = offlineSync?.isSyncing ?? isSyncingProp ?? false;
  const handleOpenSyncModal = onOpenSyncModal ?? (() => {});

  // If online and no pending items, return null
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <aside
      id="offline-sticky-banner"
      aria-label="Offline Mode Notification"
      className="bg-amber-500 text-white px-4 py-2 shadow-md transition-all duration-300 border-b border-amber-600"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 shrink-0 text-white animate-pulse" />
          ) : (
            <ArrowUpCircle className="w-4 h-4 shrink-0 text-white" />
          )}
          
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold">
              {!isOnline 
                ? (isSimulatedOffline ? 'Simulated Field Offline Mode Active' : 'Offline Mode — Field Mode Active') 
                : 'Pending Local Records Detected'}
            </span>
            <span className="hidden sm:inline text-amber-100">•</span>
            <span className="text-amber-100">
              {pendingCount > 0 
                ? `${pendingCount} mutation${pendingCount > 1 ? 's' : ''} queued locally. GIS pin drops and records are stored safely.` 
                : 'You can continue registering swine and GPS pins without cell signal.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-view-sync-outbox"
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white text-amber-900 hover:bg-amber-100 font-semibold rounded-md shadow-xs transition cursor-pointer text-xs"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>Sync Hub ({pendingCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
