import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  ListOrdered, 
  PlusCircle, 
  Users, 
  Printer, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  Building2,
  ChevronRight,
  ExternalLink,
  Map as MapIcon,
  Wifi,
  WifiOff,
  Radio,
  RefreshCw,
  Clock,
  CloudCheck,
  ChevronDown,
  Settings as SettingsIcon
} from 'lucide-react';
import { loadStoredAuth, loadStoredPigs, loadStoredUsers, saveStoredAuth, saveStoredPigs, saveStoredUsers, logSystemAction } from './services/storage';
import { AppViewMode, PigRecord, User } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { enqueueSyncAction, syncWithSupabase } from './services/syncService';
import { subscribeToPigRecordUpdates, testDatabaseConnection } from './services/supabaseClient';
import { checkBackendHealth } from './services/backendApi';
import { fetchSystemSettings } from './services/settingsService';
import { useI18n } from './i18n/I18nContext';
import { motion, AnimatePresence } from 'motion/react';

// Components
import { LandingView } from './components/LandingView';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { RecordsView } from './components/RecordsView';
import { GisMap } from './components/GisMap';
import { AddEditRecordModal } from './components/AddEditRecordModal';
import { AccountsView } from './components/AccountsView';
import { PrintReportsView } from './components/PrintReportsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { BiosecurityChecklistModal } from './components/BiosecurityChecklistModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import ToastContainer from './components/ToastContainer';
import { LanguageToggle } from './components/LanguageToggle';
import { UserSettingsView, triggerUnifiedAlert } from './components/UserSettingsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SystemSettings } from './types';

export default function App() {
  const { t, language, notify } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadStoredAuth());
  const [users, setUsers] = useState<User[]>(() => loadStoredUsers());
  const [pigs, setPigs] = useState<PigRecord[]>(() => loadStoredPigs());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});

  useEffect(() => {
    fetchSystemSettings().then(s => setSystemSettings(s)).catch(console.error);
  }, []);

  const [currentView, setCurrentView] = useState<AppViewMode>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isBiosecurityModalOpen, setIsBiosecurityModalOpen] = useState(false);
  const [isTopbarMenuOpen, setIsTopbarMenuOpen] = useState(false);
  const [editingPig, setEditingPig] = useState<PigRecord | null>(null);
  const [initialModalCoords, setInitialModalCoords] = useState<{ lat: number; lng: number; barangay?: string } | null>(null);
  const [focusPigId, setFocusPigId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const geo = useGeolocation();
  const offlineSync = useOfflineSync();
  const { realtimeStatus } = useRealtimeSync({ setPigs, setUsers });

  // Subtle 'ping' animation state when detecting sync queue updates
  const [isSyncPinging, setIsSyncPinging] = useState<boolean>(false);
  const prevSyncQueueRef = useRef(offlineSync.syncQueue);

  useEffect(() => {
    const prevQueue = prevSyncQueueRef.current;
    const currentQueue = offlineSync.syncQueue;

    const hasQueueChanged = 
      prevQueue.length !== currentQueue.length ||
      prevQueue.some((item, idx) => {
        const curr = currentQueue[idx];
        return !curr || curr.status !== item.status || curr.timestamp !== item.timestamp;
      });

    if (hasQueueChanged) {
      setIsSyncPinging(true);
      const timer = setTimeout(() => {
        setIsSyncPinging(false);
      }, 2000);
      prevSyncQueueRef.current = currentQueue;
      return () => clearTimeout(timer);
    }
  }, [offlineSync.syncQueue]);

  // Initial Supabase PostgreSQL database synchronization on startup
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => {};

    async function initializeDatabaseConnection() {
      try {
        setIsLoading(true);
        // Test direct database connectivity and API key validation
        await testDatabaseConnection().catch((err) => {
          console.warn('Database connection test notice:', err);
        });

        const synced = await syncWithSupabase();
        if (isMounted && synced) {
          if (Array.isArray(synced.pigs)) setPigs(synced.pigs);
          if (Array.isArray(synced.users)) setUsers(synced.users);
          setIsCloudConnected(true);
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      // Realtime listener for live GIS & Swine heatmap updates from other officers via Supabase Realtime
      try {
        unsubscribe = subscribeToPigRecordUpdates((updatedPigs) => {
          if (isMounted && updatedPigs && Array.isArray(updatedPigs) && updatedPigs.length > 0) {
            
            // Check focal user push triggers
            try {
              const storedSettingsStr = localStorage.getItem('focal_notification_settings');
              const settings = storedSettingsStr ? JSON.parse(storedSettingsStr) : {
                notifyOnBarangayUpdate: true,
                notifyOnSuspectStatus: true,
                notifyOnQuarantineStatus: true,
                enableBrowserPush: false,
                soundAlerts: true
              };

              // Retrieve the current list of pigs from memory to compare states
              let prevPigs: PigRecord[] = [];
              setPigs(current => {
                prevPigs = current || [];
                return current;
              });

              updatedPigs.forEach(newPig => {
                const oldPig = prevPigs.find(p => p.id === newPig.id);
                const belongsToBarangay = currentUser && (currentUser.role === 'admin' || newPig.barangay === currentUser.barangay);

                // A. Barangay Record Update Trigger
                if (belongsToBarangay && settings.notifyOnBarangayUpdate) {
                  const isNew = !oldPig;
                  const wasModified = oldPig && (
                    oldPig.ownerName !== newPig.ownerName ||
                    oldPig.weight !== newPig.weight ||
                    oldPig.vaccinated !== newPig.vaccinated ||
                    oldPig.isDeceased !== newPig.isDeceased
                  );
                  if (isNew || wasModified) {
                    triggerUnifiedAlert(
                      `📢 Barangay Registry Update`,
                      `Record updated for swine ${newPig.earTag} (${newPig.ownerName}) in Brgy. ${newPig.barangay}.`,
                      settings
                    );
                  }
                }

                // B. Health Status Shift to 'Suspect' (unvaccinated and not deceased)
                const isSuspect = !newPig.isDeceased && !newPig.vaccinated;
                const wasPreviouslyNotSuspect = !oldPig || oldPig.isDeceased || oldPig.vaccinated;
                if (isSuspect && wasPreviouslyNotSuspect && settings.notifyOnSuspectStatus) {
                  triggerUnifiedAlert(
                    `⚠️ Status: SUSPECT`,
                    `Swine ${newPig.earTag} (${newPig.ownerName}) in Brgy. ${newPig.barangay} flagged as SUSPECT.`,
                    settings
                  );
                }

                // C. Health Status Shift to 'Quarantined' (recorded mortality event)
                const isQuarantined = newPig.isDeceased;
                const wasPreviouslyNotQuarantined = !oldPig || !oldPig.isDeceased;
                if (isQuarantined && wasPreviouslyNotQuarantined && settings.notifyOnQuarantineStatus) {
                  triggerUnifiedAlert(
                    `🚨 Status: QUARANTINED`,
                    `Swine ${newPig.earTag} (${newPig.ownerName}) in Brgy. ${newPig.barangay} is QUARANTINED (recorded mortality).`,
                    settings
                  );
                }
              });
            } catch (err) {
              console.error('Realtime notification check error:', err);
            }

            setPigs(prev => {
              const pigMap = new Map<string, PigRecord>();
              (prev || []).forEach(p => pigMap.set(p.id, p));
              updatedPigs.forEach(p => pigMap.set(p.id, p));
              const merged = Array.from(pigMap.values());
              saveStoredPigs(merged);
              return merged;
            });
          }
        });
      } catch (subErr) {
        console.warn('Realtime subscription notice:', subErr);
      }
    }

    initializeDatabaseConnection();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Save changes to storage with offline sync queue tracking
  const handleSavePig = (savedRecord: PigRecord) => {
    const isEditing = Boolean(editingPig);
    setPigs(prev => {
      const exists = prev.some(p => p.id === savedRecord.id);
      const updated = exists 
        ? prev.map(p => p.id === savedRecord.id ? savedRecord : p)
        : [savedRecord, ...prev];
      saveStoredPigs(updated);
      return updated;
    });

    // Record mutation into offline sync outbox
    enqueueSyncAction({
      entityType: 'pig',
      entityId: savedRecord.id,
      action: isEditing ? 'update' : 'create',
      data: savedRecord,
      summary: isEditing 
        ? `Updated swine ${savedRecord.earTag} (${savedRecord.ownerName})`
        : `Registered swine ${savedRecord.earTag} (${savedRecord.ownerName})`
    });

    // Record audit log
    logSystemAction(
      currentUser,
      isEditing ? 'UPDATE_SWINE' : 'REGISTER_SWINE',
      `${isEditing ? 'Updated' : 'Registered'} swine tag ${savedRecord.earTag} for owner ${savedRecord.ownerName} in Brgy. ${savedRecord.barangay} (${savedRecord.breed}, ${savedRecord.purpose})`,
      'pig'
    );

    setEditingPig(null);
    setInitialModalCoords(null);
  };

  const handleDeletePig = (pigId: string) => {
    const pig = pigs.find(p => p.id === pigId);
    const confirmMessage = t('records.confirmDelete', { earTag: pig?.earTag || pigId });
    if (confirm(confirmMessage)) {
      setPigs(prev => {
        const updated = prev.filter(p => p.id !== pigId);
        saveStoredPigs(updated);
        return updated;
      });

      // Record delete mutation into offline sync outbox
      enqueueSyncAction({
        entityType: 'pig',
        entityId: pigId,
        action: 'delete',
        data: { id: pigId, earTag: pig?.earTag },
        summary: `Deleted swine record ${pig?.earTag || pigId}`
      });

      // Record audit log
      logSystemAction(
        currentUser,
        'DELETE_SWINE',
        `Deleted swine record ${pig?.earTag || pigId} from Brgy. ${pig?.barangay || 'Hinunangan'}`,
        'pig'
      );
    }
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => {
      const updated = [...prev.filter(u => u.username !== newUser.username), newUser];
      saveStoredUsers(updated);
      return updated;
    });

    enqueueSyncAction({
      entityType: 'user',
      entityId: newUser.username,
      action: 'create',
      data: newUser,
      summary: `Created focal person ${newUser.fullName} (${newUser.barangay || 'Central'})`
    });

    logSystemAction(
      currentUser,
      'CREATE_ACCOUNT',
      `Created focal person account for ${newUser.fullName} (@${newUser.username}) assigned to Brgy. ${newUser.barangay || 'All'}`,
      'user',
      newUser.barangay
    );

    // Sync to backend DB API
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).catch(err => console.warn('User create API notice:', err));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => {
      const updated = prev.map(u => u.username.toLowerCase() === updatedUser.username.toLowerCase() ? { ...u, ...updatedUser } : u);
      saveStoredUsers(updated);
      return updated;
    });

    enqueueSyncAction({
      entityType: 'user',
      entityId: updatedUser.username,
      action: 'update',
      data: updatedUser,
      summary: `Updated user account @${updatedUser.username} (${updatedUser.fullName})`
    });

    logSystemAction(
      currentUser,
      'UPDATE_ACCOUNT',
      `Updated user account @${updatedUser.username} (${updatedUser.fullName}, Brgy: ${updatedUser.barangay || 'All'}, Active: ${updatedUser.isActive !== false})`,
      'user',
      updatedUser.barangay
    );

    // Sync to backend DB API
    fetch(`/api/users/${encodeURIComponent(updatedUser.username)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser)
    }).catch(err => console.warn('User update API notice:', err));
  };

  const handleDeleteUser = (username: string) => {
    const targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    setUsers(prev => {
      const updated = prev.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      saveStoredUsers(updated);
      return updated;
    });

    enqueueSyncAction({
      entityType: 'user',
      entityId: username,
      action: 'delete',
      data: { username },
      summary: `Deleted user account ${username}`
    });

    logSystemAction(
      currentUser,
      'DELETE_ACCOUNT',
      `Deleted user account @${username} (${targetUser?.fullName || username})`,
      'user',
      targetUser?.barangay
    );

    // Sync to backend DB API
    fetch(`/api/users/${encodeURIComponent(username)}`, {
      method: 'DELETE'
    }).catch(err => console.warn('User delete API notice:', err));
  };

  const handleRestoreData = (restoredPigs: PigRecord[], restoredUsers: User[]) => {
    setPigs(restoredPigs);
    setUsers(restoredUsers);
  };

  const handleResetData = () => {
    setPigs(loadStoredPigs());
    setUsers(loadStoredUsers());
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    saveStoredAuth(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredAuth(null);
    setCurrentView('landing');
  };

  const handleEditPig = (pig: PigRecord) => {
    setEditingPig(pig);
    setInitialModalCoords(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenNewRegistration = () => {
    setEditingPig(null);
    setInitialModalCoords(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenAddModalWithCoords = (coords: { lat: number; lng: number; barangay?: string }) => {
    setEditingPig(null);
    setInitialModalCoords(coords);
    setIsAddEditModalOpen(true);
  };

  const handleViewPigOnMap = (pigId: string) => {
    setFocusPigId(pigId);
    setCurrentView('gis');
  };

  // If not logged in, show Public Landing View
  if (!currentUser) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="public-landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LandingView
            pigs={pigs || []}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onExploreProgram={() => setIsLoginModalOpen(true)}
            systemSettings={systemSettings}
          />
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
            users={users}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  // Navigation Links definition with bilingual support
  const navItems = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: LayoutGrid },
    { key: 'gis', label: t('nav.gis'), icon: MapIcon },
    { key: 'records', label: isAdmin ? t('nav.recordsAdmin') : t('nav.recordsFocal'), icon: ListOrdered },
    { key: 'print', label: t('nav.print'), icon: Printer },
    { key: 'settings', label: t('nav.settings', undefined, 'User Settings'), icon: SettingsIcon },
    ...(isAdmin ? [{ key: 'accounts', label: t('nav.accounts'), icon: Users }] : [])
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-screen overflow-hidden bg-[#F5EFDD] text-[#1E2B1F] flex flex-col md:flex-row relative"
    >
      
      {/* MOBILE DRAWER BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* APP SIDEBAR / MOBILE DRAWER (Smoothly collapsible on both desktop and mobile) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#203F2B] text-white flex flex-col justify-between transition-all duration-300 ease-in-out lg:static lg:h-screen lg:shrink-0 overflow-y-auto overflow-x-hidden
        ${sidebarOpen 
          ? 'w-72 translate-x-0 opacity-100 shadow-2xl lg:shadow-none' 
          : '-translate-x-full lg:translate-x-0 w-0 lg:w-0 opacity-0 pointer-events-none p-0 border-none'
        }
      `}>
        <div className="w-72">
          {/* Brand Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F7A55] to-[#203F2B] border-2 border-[#D9A441] flex items-center justify-center font-serif text-sm font-bold text-[#D9A441] shadow-md">
                DA
              </div>
              <div className="leading-tight">
                <span className="font-serif font-bold text-sm text-white block">{t('sidebar.brandTitle')}</span>
                <span className="font-mono text-[10px] text-[#93A893]">{t('sidebar.brandSubtitle')}</span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="min-h-[40px] min-w-[40px] p-2 rounded-lg text-[#93A893] hover:text-white hover:bg-white/10 cursor-pointer transition-colors flex items-center justify-center"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Mini Block */}
          <div className="p-4 mx-3 my-3 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-[#D9A441] shadow-xs shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#4F7A55] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {currentUser.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{currentUser.fullName}</div>
                <div className="text-[11px] text-[#D9A441] font-mono font-semibold truncate">
                  {isAdmin ? t('sidebar.roleAdmin') : t('sidebar.roleFocal', { barangay: currentUser.barangay || '' })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action: Register Swine */}
          <div className="px-4 mb-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
                handleOpenNewRegistration();
              }}
              className="w-full min-h-[44px] py-2.5 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] font-bold rounded-xl text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('sidebar.quickRegister')}</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.key;
              const hasPendingBadge = item.key === 'records' && offlineSync.pendingCount > 0;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setCurrentView(item.key as AppViewMode);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full relative min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                    isActive 
                      ? 'text-[#203F2B] font-bold' 
                      : 'text-[#B9CBB9] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarNavPill"
                      className="absolute inset-0 bg-[#D9A441] rounded-xl shadow-xs"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 relative z-10 ${isActive ? 'text-[#203F2B]' : 'text-[#93A893]'}`} />
                  <span className="flex-1 relative z-10">{item.label}</span>
                  {hasPendingBadge && (
                    <span className="relative z-10 px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500 text-white rounded-full">
                      {offlineSync.pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & Offline Status */}
        <div className="p-4 border-t border-white/10 space-y-3 w-72">
          {/* Language Switcher in Sidebar */}
          <LanguageToggle variant="sidebar" />

          {/* PWA App Install Button */}
          <PWAInstallButton className="w-full justify-center" />

          {/* Quick Offline Sync Status Box with Ping Animation on Queue Updates */}
          <div 
            onClick={() => setIsSyncModalOpen(true)}
            className={`relative bg-white/5 hover:bg-white/10 border transition-all duration-300 rounded-xl p-2.5 text-[11px] font-mono flex items-center justify-between cursor-pointer ${
              isSyncPinging 
                ? 'border-[#D9A441] bg-white/10 ring-2 ring-[#D9A441]/40 shadow-[0_0_14px_rgba(217,164,65,0.35)]' 
                : 'border-white/10'
            }`}
            title="Click to open Offline Sync Hub"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                {(isSyncPinging || offlineSync.isSyncing) && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    offlineSync.pendingCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  !offlineSync.isOnline ? 'bg-amber-400' :
                  offlineSync.pendingCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
              </div>
              <span className="text-[#B9CBB9]">
                {offlineSync.isSyncing ? t('common.syncing', undefined, 'Syncing...') : offlineSync.isOnline ? t('common.online') : t('common.offline')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isSyncPinging && (
                <RefreshCw className="w-3 h-3 text-[#D9A441] animate-spin" />
              )}
              {offlineSync.pendingCount > 0 ? (
                <span className={`px-2 py-0.5 text-white rounded-full text-[10px] font-bold transition-all ${
                  isSyncPinging ? 'bg-amber-500 scale-105 ring-2 ring-amber-300/50 shadow-xs' : 'bg-amber-500'
                }`}>
                  {offlineSync.pendingCount} {t('common.queued')}
                </span>
              ) : (
                <span className={`text-[10px] font-bold transition-all ${
                  isSyncPinging ? 'text-[#D9A441] font-extrabold scale-105' : 'text-emerald-400'
                }`}>
                  {t('common.synced')}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full min-h-[40px] flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#B9CBB9] hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (Scrolls independently while sidebar stays pinned) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-[#DED2AE] px-3 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-2xs gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] text-[#203F2B] transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs hover:shadow-xs active:scale-95"
              title={sidebarOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="truncate min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={currentView}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                  className="font-serif text-xs xs:text-sm sm:text-xl font-bold text-[#203F2B] truncate leading-tight"
                >
                  {currentView === 'dashboard' && t('topbar.executiveDashboard')}
                  {currentView === 'gis' && t('topbar.gisMapTitle')}
                  {currentView === 'records' && (isAdmin ? t('topbar.recordsAdminTitle') : t('topbar.recordsFocalTitle', { barangay: currentUser.barangay || '' }))}
                  {currentView === 'accounts' && t('topbar.accountsTitle')}
                  {currentView === 'print' && t('topbar.printTitle')}
                  {currentView === 'settings' && 'Focal Settings & Alerts'}
                </motion.h1>
              </AnimatePresence>
            </div>
          </div>

          {/* Topbar Right Quick Actions & Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Switcher Pill in Topbar (Visible on xs+ screens) */}
            <div className="hidden xs:block">
              <LanguageToggle variant="topbar" />
            </div>

            {/* Quick Install Pill for Header (Desktop/Tablet) */}
            <div className="hidden lg:block">
              <PWAInstallButton size="sm" />
            </div>

            {/* Live Connection & Realtime Sync Indicator Button */}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center gap-1.5 sm:gap-2 font-mono text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all cursor-pointer shadow-2xs ${
                !offlineSync.isOnline
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : offlineSync.pendingCount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-[#F5EFDD] border-[#DED2AE] text-[#203F2B] hover:bg-[#EAE1C4]'
              }`}
              title="Click to open Offline & Realtime Sync Hub"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                !offlineSync.isOnline ? 'bg-amber-500 animate-pulse' :
                offlineSync.pendingCount > 0 ? 'bg-amber-500 animate-bounce' :
                realtimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`} />
              <span className="hidden md:inline font-semibold text-[11px]">
                {!offlineSync.isOnline 
                  ? t('topbar.offlineMode') 
                  : offlineSync.pendingCount > 0 
                  ? t('topbar.queuedItems', { count: offlineSync.pendingCount }) 
                  : realtimeStatus === 'connected'
                  ? 'Realtime Sync Active'
                  : t('topbar.liveOnline')}
              </span>
              <Radio className={`w-3.5 h-3.5 shrink-0 ${realtimeStatus === 'connected' ? 'text-emerald-700 animate-pulse' : 'text-[#2F5C3F]'}`} />
            </button>

            {/* Quick Access Biosecurity SOP Checklist Button */}
            <button
              onClick={() => setIsBiosecurityModalOpen(true)}
              className="flex items-center gap-1.5 font-sans text-xs px-2.5 sm:px-3 py-1.5 rounded-full border bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              title="Open Quick-Access Biosecurity Protocol SOP Checklist"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="hidden xs:inline font-bold">Biosecurity SOP</span>
            </button>

            {/* Scope Badge (Desktop / Large screen inline view) */}
            <div className="hidden lg:flex items-center gap-2 font-mono text-xs bg-[#F5EFDD] border border-[#DED2AE] px-3 py-1.5 rounded-full text-[#203F2B] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#2F5C3F]" />
              <span>
                {isAdmin 
                  ? t('topbar.scopeAll') 
                  : t('topbar.scopeBarangay', { barangay: currentUser.barangay || '' })}
              </span>
            </div>

            {/* Collapsible Mobile Secondary UI Popover Toggle (Collapses scope badge & secondary tools on small screens) */}
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setIsTopbarMenuOpen(!isTopbarMenuOpen)}
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  isTopbarMenuOpen 
                    ? 'bg-[#203F2B] text-[#D9A441] border-[#D9A441] shadow-md' 
                    : 'bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border-[#DED2AE]'
                }`}
                title="View Operational Scope & System Actions"
                aria-label="Toggle system scope and mobile quick menu"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2F5C3F] shrink-0" />
                <span className="hidden sm:inline text-[11px] font-semibold truncate max-w-[120px]">
                  {isAdmin ? t('topbar.scopeAll') : t('topbar.scopeBarangay', { barangay: currentUser.barangay || '' })}
                </span>
                <ChevronDown className={`w-3 h-3 text-[#203F2B] transition-transform duration-200 ${isTopbarMenuOpen ? 'rotate-180 text-[#D9A441]' : ''}`} />
              </button>

              {/* Popover Menu Dropdown */}
              <AnimatePresence>
                {isTopbarMenuOpen && (
                  <>
                    {/* Click Outside Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsTopbarMenuOpen(false)} 
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 bg-[#FAF6EC] border-2 border-[#DED2AE] rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 font-sans"
                    >
                      {/* Active Scope Badge Card */}
                      <div className="bg-[#203F2B] text-white p-3 rounded-xl border border-[#D9A441]/40 shadow-xs">
                        <div className="text-[10px] uppercase tracking-wider font-mono text-[#D9A441] font-bold flex items-center gap-1 mb-1">
                          <Building2 className="w-3.5 h-3.5 text-[#D9A441]" />
                          <span>Operational Scope</span>
                        </div>
                        <div className="font-serif font-bold text-xs text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>
                            {isAdmin 
                              ? t('topbar.scopeAll') 
                              : t('topbar.scopeBarangay', { barangay: currentUser.barangay || '' })}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#B9CBB9] mt-1 leading-tight">
                          {isAdmin 
                            ? 'Full municipal-wide administrative monitoring & oversight.'
                            : `Restricted to Barangay ${currentUser.barangay} field surveillance.`}
                        </div>
                      </div>

                      {/* Compact Language Toggle inside Popover for ultra-small screens */}
                      <div className="block xs:hidden pt-1 border-t border-[#DED2AE]">
                        <div className="text-[10px] font-mono font-bold text-[#55604F] uppercase mb-1.5">
                          {t('common.language')}
                        </div>
                        <LanguageToggle variant="topbar" className="w-full justify-center" />
                      </div>

                      {/* PWA App Install Action */}
                      <div className="pt-1 border-t border-[#DED2AE]">
                        <PWAInstallButton className="w-full justify-center" />
                      </div>

                      {/* Offline Sync Hub Quick Link */}
                      <div className="pt-1 border-t border-[#DED2AE]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTopbarMenuOpen(false);
                            setIsSyncModalOpen(true);
                          }}
                          className="w-full py-2 bg-white hover:bg-[#FBF8EF] text-[#203F2B] border border-[#DED2AE] rounded-xl text-xs font-bold flex items-center justify-between px-3 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${offlineSync.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="font-mono text-[11px]">
                              {!offlineSync.isOnline 
                                ? t('topbar.offlineMode') 
                                : offlineSync.pendingCount > 0 
                                ? t('topbar.queuedItems', { count: offlineSync.pendingCount }) 
                                : t('topbar.liveOnline')}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#55604F]" />
                        </button>
                      </div>

                      {/* Biosecurity Checklist Quick Link */}
                      <div className="pt-1 border-t border-[#DED2AE]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTopbarMenuOpen(false);
                            setIsBiosecurityModalOpen(true);
                          }}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between px-3 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4.5 h-4.5 text-emerald-700" />
                            <span>Biosecurity SOP Checklist</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* MAIN BODY VIEW ROUTER */}
        <main className={`flex-1 w-full mx-auto transition-all ${
          currentView === 'gis' 
            ? 'p-0 sm:p-3 lg:p-4 max-w-none h-[calc(100dvh-56px)] sm:h-[calc(100dvh-64px)] flex flex-col pb-0 sm:pb-3 lg:pb-4' 
            : 'p-3.5 sm:p-6 lg:p-8 max-w-7xl space-y-4 pb-8 sm:pb-12'
        }`}>
          
          {/* OFFLINE STATUS BANNER */}
          <OfflineIndicator 
            offlineSync={offlineSync}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onTriggerSync={offlineSync.triggerSync}
          />

          <AnimatePresence mode="wait" initial={false}>
            {currentView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <ErrorBoundary fallbackMessage="An error occurred while rendering the interactive dashboard stats. Re-syncing your database is recommended.">
                  <DashboardView
                    pigs={pigs || []}
                    currentUser={currentUser}
                    onNavigate={(v) => setCurrentView(v)}
                    onOpenAddModal={handleOpenNewRegistration}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {currentView === 'gis' && (
              <motion.div
                key="gis"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => {
                  window.dispatchEvent(new Event('resize'));
                }}
                className="w-full h-full flex-1 flex flex-col"
              >
                <ErrorBoundary fallbackMessage="An error occurred while loading the GIS spatial map layers. Please try refreshing.">
                  <GisMap
                    pigs={pigs || []}
                    currentUser={currentUser}
                    onOpenAddModalWithCoords={handleOpenAddModalWithCoords}
                    onEditPig={handleEditPig}
                    geo={geo}
                    focusPigId={focusPigId}
                    pendingRecordIds={offlineSync.pendingRecordIds}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {currentView === 'records' && (
              <motion.div
                key="records"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <ErrorBoundary fallbackMessage="Unable to display swine registry records at this moment. Please refresh the page.">
                  <RecordsView
                    pigs={pigs || []}
                    currentUser={currentUser}
                    onOpenAddModal={handleOpenNewRegistration}
                    onEditPig={handleEditPig}
                    onDeletePig={handleDeletePig}
                    onViewOnMap={handleViewPigOnMap}
                    pendingRecordIds={offlineSync.pendingRecordIds}
                    isOnline={offlineSync.isOnline}
                    onTriggerSync={offlineSync.triggerSync}
                    isSyncing={offlineSync.isSyncing}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {currentView === 'accounts' && isAdmin && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <ErrorBoundary fallbackMessage="The administration accounts manager crashed. Please reload.">
                  <AccountsView
                    users={users || []}
                    pigs={pigs || []}
                    currentUser={currentUser}
                    onNavigate={(v) => setCurrentView(v)}
                    systemSettings={systemSettings}
                    onUpdateSettings={async (newSettings) => {
                      setSystemSettings(newSettings);
                      const { saveSystemSettings } = await import('./services/settingsService');
                      await saveSystemSettings(newSettings);
                    }}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onRestoreData={handleRestoreData}
                    onResetData={handleResetData}
                    onOpenSyncModal={() => setIsSyncModalOpen(true)}
                    syncQueue={offlineSync.syncQueue}
                    isOnline={offlineSync.isOnline}
                    isSimulatedOffline={offlineSync.isSimulatedOffline}
                    onToggleSimulateOffline={offlineSync.toggleSimulateOffline}
                    onTriggerSync={offlineSync.triggerSync}
                    isSyncing={offlineSync.isSyncing}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {currentView === 'print' && (
              <motion.div
                key="print"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <ErrorBoundary fallbackMessage="The print and reporting utility encountered an error rendering the document tables.">
                  <PrintReportsView
                    pigs={pigs || []}
                    currentUser={currentUser}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {currentView === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <ErrorBoundary fallbackMessage="Focal Settings view crashed. Realtime listeners are still active.">
                  <UserSettingsView
                    currentUser={currentUser}
                    pigs={pigs || []}
                  />
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ADD / EDIT RECORD MODAL */}
      <AddEditRecordModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingPig(null);
          setInitialModalCoords(null);
        }}
        onSave={handleSavePig}
        currentUser={currentUser}
        editingPig={editingPig}
        existingPigs={pigs}
        initialCoords={initialModalCoords}
        geo={geo}
        isOnline={offlineSync.isOnline}
      />

      {/* OFFLINE SYNC MODAL */}
      <OfflineSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        offlineSync={offlineSync}
      />

      {/* BIOSECURITY SOP CHECKLIST MODAL */}
      <BiosecurityChecklistModal
        isOpen={isBiosecurityModalOpen}
        onClose={() => setIsBiosecurityModalOpen(false)}
        barangay={currentUser?.barangay}
      />

      {/* TOAST NOTIFICATION SYSTEM */}
      <ToastContainer />

    </motion.div>
  );
}
