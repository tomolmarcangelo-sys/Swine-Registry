import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Database, 
  X, 
  RefreshCw, 
  Info 
} from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'sync' | 'conflict';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id' | 'timestamp'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      ...toast,
      id,
      timestamp: new Date()
    };
    setToasts(prev => [newToast, ...prev].slice(0, 5)); // Limit to maximum 5 concurrent toasts

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 4500);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Listen to system custom events & network events
  useEffect(() => {
    const handleSyncComplete = (e: any) => {
      const { successCount } = e.detail || {};
      if (successCount > 0) {
        addToast({
          type: 'sync',
          title: 'Supabase Background Sync Complete',
          message: `Successfully synchronized ${successCount} offline queue item(s) to the central Supabase registry database.`,
          duration: 5000
        });
      }
    };

    const handleSyncConflict = (e: any) => {
      const { earTag, ownerName, serverOwnerName, policy } = e.detail || {};
      const resolutionText = policy === 'server-wins' 
        ? `Keeping central server version by ${serverOwnerName} (Server-Wins policy).`
        : `Overwriting central registry with your local changes (Client-Wins policy).`;

      addToast({
        type: 'conflict',
        title: 'Offline Sync Conflict Detected',
        message: `Discrepancy found for ear tag "${earTag}". ${resolutionText}`,
        duration: 8000
      });
    };

    const handleOnline = () => {
      addToast({
        type: 'success',
        title: 'Device Reconnected',
        message: 'Network connection detected. Processing pending synchronization queue...',
        duration: 4000
      });
    };

    const handleOffline = () => {
      addToast({
        type: 'error',
        title: 'Network Connection Lost',
        message: 'Device has switched to offline mode. All edits are being safely cached in local outbox.',
        duration: 5000
      });
    };

    window.addEventListener('hinunangan_data_synced', handleSyncComplete);
    window.addEventListener('hinunangan_sync_conflict', handleSyncConflict);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('hinunangan_data_synced', handleSyncComplete);
      window.removeEventListener('hinunangan_sync_conflict', handleSyncConflict);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div id="toast-root" className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3.5 max-w-[92vw] sm:max-w-md pointer-events-none">
      {toasts.map((toast) => {
        // Icon matching toast type
        let icon = <Info className="w-5 h-5 text-sky-600" />;
        let typeStyles = 'bg-white border-slate-200 text-slate-800 shadow-xl';
        let iconContainerStyles = 'bg-slate-50 border-slate-100 text-slate-600';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
          typeStyles = 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-100/50';
          iconContainerStyles = 'bg-emerald-100/65 border-emerald-200 text-emerald-700';
        } else if (toast.type === 'error') {
          icon = <WifiOff className="w-5 h-5 text-rose-600" />;
          typeStyles = 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-100/50';
          iconContainerStyles = 'bg-rose-100/65 border-rose-200 text-rose-700';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
          typeStyles = 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-100/50';
          iconContainerStyles = 'bg-amber-100/65 border-amber-200 text-amber-700';
        } else if (toast.type === 'sync') {
          icon = <Database className="w-5 h-5 text-[#2F5C3F]" />;
          typeStyles = 'bg-[#F5EFDD]/95 border-[#DED2AE] text-[#203F2B] shadow-[#EAE1C4]/40';
          iconContainerStyles = 'bg-[#EAE1C4]/65 border-[#DED2AE] text-[#2F5C3F]';
        } else if (toast.type === 'conflict') {
          icon = <RefreshCw className="w-5 h-5 text-[#D9A441] animate-spin-slow" />;
          typeStyles = 'bg-[#2A1D13]/95 border-[#D9A441]/60 text-amber-50 shadow-black/30';
          iconContainerStyles = 'bg-amber-950/40 border-[#D9A441]/40 text-amber-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border-2 rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-300 animate-slide-in shadow-lg backdrop-blur-xs ${typeStyles}`}
          >
            <div className={`p-2 rounded-xl border flex-shrink-0 ${iconContainerStyles}`}>
              {icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs tracking-wide uppercase opacity-90">
                {toast.title}
              </div>
              <div className="text-xs font-medium leading-relaxed mt-1 opacity-85">
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/10 rounded-lg text-current/60 hover:text-current transition-colors cursor-pointer flex-shrink-0 mt-0.5"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
