import React, { useState, useEffect } from 'react';
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
  CloudCheck
} from 'lucide-react';
import { loadStoredAuth, loadStoredPigs, loadStoredUsers, saveStoredAuth, saveStoredPigs, saveStoredUsers } from './services/storage';
import { AppViewMode, PigRecord, User } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useOfflineSync } from './hooks/useOfflineSync';
import { enqueueSyncAction, syncWithCloudFirestore } from './services/syncService';
import { subscribeToCloudPigs } from './services/firebase';

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
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadStoredAuth());
  const [users, setUsers] = useState<User[]>(() => loadStoredUsers());
  const [pigs, setPigs] = useState<PigRecord[]>(() => loadStoredPigs());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<AppViewMode>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingPig, setEditingPig] = useState<PigRecord | null>(null);
  const [initialModalCoords, setInitialModalCoords] = useState<{ lat: number; lng: number; barangay?: string } | null>(null);
  const [focusPigId, setFocusPigId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const geo = useGeolocation();
  const offlineSync = useOfflineSync();

  // Initial Cloud Firestore synchronization on startup
  useEffect(() => {
    syncWithCloudFirestore()
      .then((synced) => {
        setPigs(synced.pigs);
        setUsers(synced.users);
        setIsCloudConnected(true);
      })
      .catch((err) => {
        console.warn('Initial cloud sync notice:', err);
      });

    // Realtime listener for live GIS & Swine heatmap updates from other officers
    const unsubscribe = subscribeToCloudPigs((updatedPigs) => {
      if (updatedPigs && updatedPigs.length > 0) {
        setPigs(prev => {
          const pigMap = new Map<string, PigRecord>();
          prev.forEach(p => pigMap.set(p.id, p));
          updatedPigs.forEach(p => pigMap.set(p.id, p));
          const merged = Array.from(pigMap.values());
          saveStoredPigs(merged);
          return merged;
        });
      }
    });

    return () => {
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

    setEditingPig(null);
    setInitialModalCoords(null);
  };

  const handleDeletePig = (pigId: string) => {
    const pig = pigs.find(p => p.id === pigId);
    if (confirm('Are you sure you want to delete this swine record? This cannot be undone.')) {
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
    }
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => {
      const updated = [...prev, newUser];
      saveStoredUsers(updated);
      return updated;
    });

    enqueueSyncAction({
      entityType: 'user',
      entityId: newUser.username,
      action: 'create',
      data: newUser,
      summary: `Created focal person ${newUser.fullName} (${newUser.barangay})`
    });
  };

  const handleDeleteUser = (username: string) => {
    setUsers(prev => {
      const updated = prev.filter(u => u.username !== username);
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
      <>
        <LandingView
          pigs={pigs}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onExploreProgram={() => setIsLoginModalOpen(true)}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          users={users}
        />
      </>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  // Navigation Links definition
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { key: 'gis', label: 'GIS Swine Map & Heatmap', icon: MapIcon },
    { key: 'records', label: isAdmin ? 'Pig Records Database' : 'My Barangay Records', icon: ListOrdered },
    { key: 'print', label: 'Print Official Reports', icon: Printer },
    ...(isAdmin ? [{ key: 'accounts', label: 'Accounts & Settings', icon: Users }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#F5EFDD] text-[#1E2B1F] flex flex-col md:flex-row">
      
      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#141A12]/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* APP SIDEBAR */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#203F2B] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F7A55] to-[#203F2B] border-2 border-[#D9A441] flex items-center justify-center font-serif text-sm font-bold text-[#D9A441] shadow-md">
                DA
              </div>
              <div className="leading-tight">
                <span className="font-serif font-bold text-sm text-white block">Hinunangan DA</span>
                <span className="font-mono text-[10px] text-[#93A893]">Swine Registry &amp; Records</span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[#93A893] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Mini Block */}
          <div className="p-4 mx-3 my-3 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#4F7A55] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {currentUser.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{currentUser.fullName}</div>
                <div className="text-[11px] text-[#D9A441] font-mono font-semibold truncate">
                  {isAdmin ? 'Central Administrator' : `Brgy. ${currentUser.barangay}`}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action: Register Swine */}
          <div className="px-4 mb-2">
            <button
              onClick={() => {
                setSidebarOpen(false);
                handleOpenNewRegistration();
              }}
              className="w-full py-2.5 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] font-bold rounded-xl text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Swine Registration</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setCurrentView(item.key as AppViewMode);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                    isActive 
                      ? 'bg-[#D9A441] text-[#203F2B] font-bold shadow-xs' 
                      : 'text-[#B9CBB9] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#203F2B]' : 'text-[#93A893]'}`} />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & Offline Status */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {/* PWA App Install Button */}
          <PWAInstallButton className="w-full justify-center" />

          {/* Quick Offline Sync Status Box */}
          <div 
            onClick={() => setIsSyncModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 text-[11px] font-mono flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${offlineSync.isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-[#B9CBB9]">{offlineSync.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {offlineSync.pendingCount > 0 ? (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {offlineSync.pendingCount} queued
              </span>
            ) : (
              <span className="text-emerald-400 text-[10px] font-bold">Synced</span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#B9CBB9] hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR */}
        <header className="bg-white border-b border-[#DED2AE] px-4 sm:px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-2xs gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-[#F5EFDD] border border-[#DED2AE] text-[#1E2B1F] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="truncate">
              <h1 className="font-serif text-base sm:text-xl font-bold text-[#203F2B] truncate">
                {currentView === 'dashboard' && 'Executive Dashboard'}
                {currentView === 'gis' && 'Interactive GIS Swine Map & Biosecurity Heatmap'}
                {currentView === 'records' && (isAdmin ? 'Swine Records Database' : `Barangay ${currentUser.barangay} Records`)}
                {currentView === 'accounts' && 'Accounts & System Settings (Backup / Restore / Sync)'}
                {currentView === 'print' && 'Official Reports Generator'}
              </h1>
            </div>
          </div>

          {/* Topbar Right Quick Actions & Badges */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Install Pill for Header */}
            <div className="hidden sm:block">
              <PWAInstallButton size="sm" />
            </div>

            {/* Live Connection & Sync Button */}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer shadow-2xs ${
                !offlineSync.isOnline
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : offlineSync.pendingCount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-[#F5EFDD] border-[#DED2AE] text-[#203F2B] hover:bg-[#EAE1C4]'
              }`}
              title="Click to open Offline Sync Hub"
            >
              <span className={`w-2 h-2 rounded-full ${
                !offlineSync.isOnline ? 'bg-amber-500 animate-pulse' :
                offlineSync.pendingCount > 0 ? 'bg-amber-500' : 'bg-[#2F5C3F]'
              }`} />
              <span className="hidden sm:inline font-semibold">
                {!offlineSync.isOnline ? 'Offline Mode' : offlineSync.pendingCount > 0 ? `${offlineSync.pendingCount} Queued` : 'Live Online'}
              </span>
              <Radio className="w-3.5 h-3.5 text-[#2F5C3F]" />
            </button>

            {/* Scope Badge */}
            <div className="hidden md:flex items-center gap-2 font-mono text-xs bg-[#F5EFDD] border border-[#DED2AE] px-3 py-1.5 rounded-full text-[#203F2B]">
              <span className="w-2 h-2 rounded-full bg-[#2F5C3F]" />
              <span>Scope: <b>{isAdmin ? 'All 40 Barangays' : `Brgy. ${currentUser.barangay}`}</b></span>
            </div>
          </div>
        </header>

        {/* MAIN BODY VIEW ROUTER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-4">
          
          {/* OFFLINE STATUS BANNER */}
          <OfflineIndicator 
            offlineSync={offlineSync}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onTriggerSync={offlineSync.triggerSync}
          />

          {currentView === 'dashboard' && (
            <DashboardView
              pigs={pigs}
              currentUser={currentUser}
              onNavigate={(v) => setCurrentView(v)}
              onOpenAddModal={handleOpenNewRegistration}
            />
          )}

          {currentView === 'gis' && (
            <GisMap
              pigs={pigs}
              currentUser={currentUser}
              onOpenAddModalWithCoords={handleOpenAddModalWithCoords}
              onEditPig={handleEditPig}
              geo={geo}
              focusPigId={focusPigId}
            />
          )}

          {currentView === 'records' && (
            <RecordsView
              pigs={pigs}
              currentUser={currentUser}
              onOpenAddModal={handleOpenNewRegistration}
              onEditPig={handleEditPig}
              onDeletePig={handleDeletePig}
              onViewOnMap={handleViewPigOnMap}
            />
          )}

          {currentView === 'accounts' && isAdmin && (
            <AccountsView
              users={users}
              pigs={pigs}
              onAddUser={handleAddUser}
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
          )}

          {currentView === 'print' && (
            <PrintReportsView
              pigs={pigs}
              currentUser={currentUser}
            />
          )}
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
      />

      {/* OFFLINE SYNC MODAL */}
      <OfflineSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        offlineSync={offlineSync}
      />

    </div>
  );
}
