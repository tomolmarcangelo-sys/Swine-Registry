import React, { useState, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Download, 
  Upload, 
  X, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  Layers, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Database,
  Radio,
  Sliders,
  Send,
  HelpCircle
} from 'lucide-react';
import { SyncQueueItem } from '../types';
import { useOfflineSync } from '../hooks/useOfflineSync';

export interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  offlineSync?: ReturnType<typeof useOfflineSync>;
  isOnline?: boolean;
  isPhysicalOnline?: boolean;
  isSimulatedOffline?: boolean;
  toggleSimulatedOffline?: () => void;
  syncQueue?: SyncQueueItem[];
  pendingCount?: number;
  syncedCount?: number;
  errorCount?: number;
  lastSyncTime?: string | null;
  isSyncing?: boolean;
  autoSyncEnabled?: boolean;
  setAutoSyncEnabled?: (val: boolean) => void;
  syncFeedback?: string | null;
  onTriggerSync?: (targetId?: string) => Promise<void>;
  onRemoveItem?: (id: string) => void;
  onClearCompleted?: () => void;
  onExportOutbox?: () => void;
  onImportOutbox?: (jsonStr: string) => { success: boolean; importedCount: number; error?: string };
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  offlineSync,
  ...props
}) => {
  const isOnline = offlineSync?.isOnline ?? props.isOnline ?? true;
  const isPhysicalOnline = offlineSync?.isPhysicalOnline ?? props.isPhysicalOnline ?? true;
  const isSimulatedOffline = offlineSync?.isSimulatedOffline ?? props.isSimulatedOffline ?? false;
  const toggleSimulatedOffline = offlineSync?.toggleSimulatedOffline ?? props.toggleSimulatedOffline ?? (() => {});
  const syncQueue = offlineSync?.syncQueue ?? props.syncQueue ?? [];
  const pendingCount = offlineSync?.pendingCount ?? props.pendingCount ?? (syncQueue || []).filter(q => q.status === 'pending').length;
  const syncedCount = offlineSync?.syncedCount ?? props.syncedCount ?? (syncQueue || []).filter(q => q.status === 'synced').length;
  const errorCount = offlineSync?.errorCount ?? props.errorCount ?? (syncQueue || []).filter(q => q.status === 'error').length;
  const lastSyncTime = offlineSync?.lastSyncTime ?? props.lastSyncTime ?? null;
  const isSyncing = offlineSync?.isSyncing ?? props.isSyncing ?? false;
  const autoSyncEnabled = offlineSync?.autoSyncEnabled ?? props.autoSyncEnabled ?? true;
  const setAutoSyncEnabled = offlineSync?.setAutoSyncEnabled ?? props.setAutoSyncEnabled ?? (() => {});
  const syncFeedback = offlineSync?.syncFeedback ?? props.syncFeedback ?? null;
  const onTriggerSync = offlineSync?.triggerSync ?? props.onTriggerSync ?? (async () => {});
  const onRemoveItem = offlineSync?.removeQueueItem ?? props.onRemoveItem ?? (() => {});
  const onClearCompleted = offlineSync?.clearCompleted ?? props.onClearCompleted ?? (() => {});
  const onExportOutbox = offlineSync?.exportOutbox ?? props.onExportOutbox ?? (() => {});
  const onImportOutbox = offlineSync?.importOutbox ?? props.onImportOutbox ?? (() => ({ success: false, importedCount: 0, error: 'Not available' }));

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'synced' | 'error'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredItems = (syncQueue || []).filter(item => {
    if (!item) return false;
    if (activeFilter === 'pending') return item.status === 'pending';
    if (activeFilter === 'synced') return item.status === 'synced';
    if (activeFilter === 'error') return item.status === 'error';
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const res = onImportOutbox(content);
      if (res.success) {
        setImportNotice({
          type: 'success',
          message: `Successfully imported and merged ${res.importedCount} field record(s) into the sync queue.`
        });
      } else {
        setImportNotice({
          type: 'error',
          message: res.error || 'Failed to import outbox file.'
        });
      }
      setTimeout(() => setImportNotice(null), 6000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div 
      id="offline-sync-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl">
              <RefreshCw className={`w-5 h-5 text-emerald-200 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Offline Sync Hub & Outbox Manager</h2>
              <p className="text-xs text-emerald-200">
                DA Hinunangan Swine Registry • Field Data Synchronization & Offline Cache
              </p>
            </div>
          </div>
          
          <button
            id="btn-close-sync-modal"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-800 text-sm">
          
          {/* Live Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Connection Status Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isOnline 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Network Link
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isOnline ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="mt-3">
                <div className="flex items-center gap-2 font-bold text-base">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-amber-600" />
                  )}
                  <span>
                    {isOnline 
                      ? 'Connected to Registry' 
                      : (isSimulatedOffline ? 'Simulated Offline (Field Testing)' : 'No Internet Signal')}
                  </span>
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  {isOnline 
                    ? 'Sync engine is ready to commit field records to central database.'
                    : 'Mutations will be safely stored in the local offline queue.'}
                </p>
              </div>

              {/* Toggle Simulated Offline */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                <label htmlFor="sim-offline-toggle" className="text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-gray-500" />
                  <span>Simulate Field Offline</span>
                </label>
                <input
                  id="sim-offline-toggle"
                  type="checkbox"
                  checked={isSimulatedOffline}
                  onChange={toggleSimulatedOffline}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Outbox Queue Stats Card */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Local Outbox Queue
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {syncQueue.length} total items
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-amber-100/60 rounded-lg border border-amber-200">
                  <div className="text-lg font-black text-amber-800">{pendingCount}</div>
                  <div className="text-[11px] font-semibold text-amber-900">Pending</div>
                </div>
                <div className="p-2 bg-emerald-100/60 rounded-lg border border-emerald-200">
                  <div className="text-lg font-black text-emerald-800">{syncedCount}</div>
                  <div className="text-[11px] font-semibold text-emerald-900">Synced</div>
                </div>
                <div className="p-2 bg-rose-100/60 rounded-lg border border-rose-200">
                  <div className="text-lg font-black text-rose-800">{errorCount}</div>
                  <div className="text-[11px] font-semibold text-rose-900">Errors</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>Last Sync:</span>
                <span className="font-semibold text-gray-700">{formatTime(lastSyncTime)}</span>
              </div>
            </div>

            {/* Offline Vector Map Cache Card */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Offline GIS Cache
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Cached
                  </span>
                </div>
                <div className="mt-2 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>40 Hinunangan Barangays Vector Data</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Indexed Local Storage (PWA Enabled)</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="text-gray-600">Auto-sync on Link:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:left-[0px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

          </div>

          {/* Sync Feedback Alert */}
          {syncFeedback && (
            <div 
              id="sync-feedback-alert"
              className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between gap-3 text-xs md:text-sm font-medium animate-fadeIn"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            </div>
          )}

          {/* Import / Notice Alert */}
          {importNotice && (
            <div 
              id="import-notice-alert"
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs md:text-sm font-medium ${
                importNotice.type === 'success' 
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900' 
                  : 'bg-rose-100 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {importNotice.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{importNotice.message}</span>
              </div>
              <button 
                onClick={() => setImportNotice(null)} 
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'all' 
                    ? 'bg-white text-gray-900 shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({syncQueue.length})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'pending' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setActiveFilter('synced')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'synced' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                Synced ({syncedCount})
              </button>
              {errorCount > 0 && (
                <button
                  onClick={() => setActiveFilter('error')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeFilter === 'error' 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Errors ({errorCount})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Export Outbox */}
              <button
                id="btn-export-outbox"
                onClick={onExportOutbox}
                disabled={syncQueue.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 rounded-lg text-xs font-medium border border-gray-300 transition cursor-pointer"
                title="Export offline queue to a .json file for physical flash drive / USB transfer from remote island barangays"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Outbox (.json)</span>
              </button>

              {/* Import Outbox */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="import-sync-file-input"
              />
              <button
                id="btn-import-outbox"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium border border-gray-300 transition cursor-pointer"
                title="Import field survey outbox packages collected from focal persons"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Field File</span>
              </button>

              {/* Clear Synced */}
              {syncedCount > 0 && (
                <button
                  onClick={onClearCompleted}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-gray-800 text-xs font-medium transition cursor-pointer"
                  title="Remove completed items from local list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Prune Synced</span>
                </button>
              )}

              {/* Sync All Button */}
              <button
                id="btn-sync-all-now"
                onClick={() => onTriggerSync()}
                disabled={isSyncing || pendingCount === 0}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : `Sync All (${pendingCount})`}</span>
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-gray-800 text-sm">No items in this filter</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  {activeFilter === 'pending'
                    ? 'All field records have been synchronized with the DA Hinunangan Central Database.'
                    : 'Your offline sync outbox is clean.'}
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isExpanded = expandedItemId === item.id;
                const pigData = item.entityType === 'pig' ? (item.data as any) : null;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border transition-all ${
                      item.status === 'pending'
                        ? 'border-amber-200 bg-amber-50/40'
                        : item.status === 'error'
                        ? 'border-rose-200 bg-rose-50/40'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                      
                      {/* Left: Action & Summary */}
                      <div className="flex items-start gap-3 min-w-[240px] flex-1">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                          item.action === 'create'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.action === 'update'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {item.action === 'create' ? '+ Add' : item.action === 'update' ? '✎ Edit' : '✕ Delete'}
                        </span>

                        <div>
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>{item.summary}</span>
                            {pigData?.earTag && (
                              <span className="text-xs font-mono font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                {pigData.earTag}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              <span>Brgy. {item.barangay}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-gray-400" />
                              <span>{item.author}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{formatTime(item.timestamp)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          item.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'synced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status === 'pending' && <Clock className="w-3 h-3" />}
                          {item.status === 'synced' && <CheckCircle className="w-3 h-3" />}
                          {item.status === 'error' && <AlertCircle className="w-3 h-3" />}
                          <span className="capitalize">{item.status}</span>
                        </span>

                        {/* Individual Sync Button */}
                        {item.status !== 'synced' && (
                          <button
                            onClick={() => onTriggerSync(item.id)}
                            disabled={isSyncing}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                            title="Sync this record now"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Expand Payload */}
                        <button
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                          title="View record details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Delete from Queue */}
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remove item from queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Payload Viewer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/80 rounded-b-xl text-xs space-y-2">
                        <div className="font-semibold text-gray-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Queued Record Payload Inspection</span>
                        </div>

                        {pigData && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-white rounded-lg border border-gray-200 text-gray-700 font-mono text-[11px]">
                            <div>
                              <span className="text-gray-400 block text-[10px]">Ear Tag</span>
                              <span className="font-bold">{pigData.earTag || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">Owner</span>
                              <span className="font-bold">{pigData.ownerName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">GPS Coordinates</span>
                              <span>{pigData.lat?.toFixed(5)}, {pigData.lng?.toFixed(5)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">Biosecurity Footbath</span>
                              <span>{pigData.biosecurity?.footbathMaintenance ? '✓ Pass' : '✗ Fail'}</span>
                            </div>
                          </div>
                        )}

                        <pre className="p-2 bg-gray-900 text-emerald-300 rounded-lg overflow-x-auto text-[10px] max-h-32">
                          {JSON.stringify(item.data, null, 2)}
                        </pre>

                        {item.errorMessage && (
                          <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                            <strong>Sync Error:</strong> {item.errorMessage} (Retried {item.retryCount} times)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Educational Guidance for Field Workers */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
            <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Hinunangan Island & Mountain Barangay Protocol:</strong>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                When conducting ASF biosecurity audits in remote barangays with no cellular reception (such as San Pedro Island, San Pablo Island, or upland sitios), all registrations, GPS pin drops, and farm audits remain 100% operational locally. When you reach the Municipal Hall or regain signal, the system will automatically synchronize all pending records.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 font-mono">
            PWA Service Worker Engine • LocalStorage v4 Active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Close Sync Hub
          </button>
        </div>

      </div>
    </div>
  );
};
