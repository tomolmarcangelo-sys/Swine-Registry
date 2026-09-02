import React, { useState, useRef } from 'react';
import { 
  UserPlus, 
  Users, 
  Trash2, 
  Key, 
  Shield, 
  MapPin, 
  Check, 
  AlertCircle,
  Download,
  Upload,
  Database,
  RefreshCw,
  FileJson,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Info,
  Wifi,
  WifiOff,
  Radio,
  Clock,
  Send
} from 'lucide-react';
import { BARANGAYS_DATA } from '../data/constants';
import { PigRecord, User, SyncQueueItem } from '../types';
import { 
  downloadJsonBackup, 
  parseAndValidateBackupJson, 
  restoreBackupData, 
  resetToInitialSeed,
  BackupData 
} from '../services/storage';

interface AccountsViewProps {
  users: User[];
  pigs: PigRecord[];
  onAddUser: (user: User) => void;
  onDeleteUser: (username: string) => void;
  onRestoreData: (restoredPigs: PigRecord[], restoredUsers: User[]) => void;
  onResetData: () => void;
  onOpenSyncModal?: () => void;
  syncQueue?: SyncQueueItem[];
  isOnline?: boolean;
  isSimulatedOffline?: boolean;
  onToggleSimulateOffline?: () => void;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  users,
  pigs,
  onAddUser,
  onDeleteUser,
  onRestoreData,
  onResetData,
  onOpenSyncModal,
  syncQueue = [],
  isOnline = true,
  isSimulatedOffline = false,
  onToggleSimulateOffline,
  onTriggerSync,
  isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'backup' | 'sync'>('accounts');

  // Account creation form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('brgy2026');
  const [barangay, setBarangay] = useState(BARANGAYS_DATA[0].name);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Backup & Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('merge');
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate local storage approximate size
  const storageEstimatedKb = React.useMemo(() => {
    try {
      let total = 0;
      for (const x in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, x)) {
          total += ((localStorage[x].length + x.length) * 2);
        }
      }
      return (total / 1024).toFixed(1);
    } catch {
      return '12.4';
    }
  }, [pigs, users, restoreSuccess]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
      setErrorMsg('Username already exists. Please choose a different username.');
      return;
    }

    const newUser: User = {
      username: cleanUser,
      password,
      role: 'user',
      fullName: fullName.trim(),
      barangay,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined
    };

    onAddUser(newUser);
    setSuccessMsg(`Focal person account created for Brgy. ${barangay}`);
    setFullName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Handle JSON file selection for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    setIsConfirmingRestore(false);

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setRestoreError('Please select a valid JSON backup file (.json).');
      return;
    }

    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = parseAndValidateBackupJson(content);
      if (!validation.success || !validation.data) {
        setRestoreError(validation.error || 'Failed to parse JSON backup file.');
        setParsedBackup(null);
      } else {
        setParsedBackup(validation.data);
      }
    };
    reader.onerror = () => {
      setRestoreError('Error reading file from disk.');
      setParsedBackup(null);
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    setRestoreError(null);
    try {
      const result = restoreBackupData(parsedBackup, restoreMode, pigs, users);
      onRestoreData(result.restoredPigs, result.restoredUsers);
      
      setRestoreSuccess(
        `Successfully restored ${result.restoredPigs.length} swine records and ${result.restoredUsers.length} user accounts using "${restoreMode === 'replace' ? 'Full Overwrite' : 'Merge'}" mode!`
      );
      setParsedBackup(null);
      setRestoreFile(null);
      setIsConfirmingRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setRestoreError(`Restore failed: ${(err as Error).message}`);
    }
  };

  const handleExecuteReset = () => {
    try {
      const result = resetToInitialSeed();
      onResetData();
      setRestoreSuccess(`Reset complete. Database re-seeded to initial ${result.pigs.length} records.`);
      setIsConfirmingReset(false);
    } catch (err) {
      setRestoreError(`Reset failed: ${(err as Error).message}`);
    }
  };

  const handleCopySampleJson = () => {
    const sample = JSON.stringify({
      version: '4.0',
      timestamp: new Date().toISOString(),
      system: 'DA Hinunangan Swine Registry',
      pigsCount: pigs.length,
      usersCount: users.length,
      pigs: pigs.slice(0, 2)
    }, null, 2);

    navigator.clipboard.writeText(sample);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & TOP LEVEL TAB NAVIGATION */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#203F2B]">
            Administration &amp; System Settings
          </h2>
          <p className="text-xs text-[#55604F]">
            Manage municipal focal person accounts, database persistence, and JSON backup/restore utilities.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-1 bg-[#F5EFDD] p-1 rounded-xl border border-[#DED2AE] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-[#2F5C3F] text-white shadow-xs'
                : 'text-[#55604F] hover:text-[#1E2B1F]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Focal Accounts ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-[#2F5C3F] text-white shadow-xs'
                : 'text-[#55604F] hover:text-[#1E2B1F]'
            }`}
          >
            <Database className="w-4 h-4 text-[#D9A441]" />
            <span>Backup &amp; Restore</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'sync'
                ? 'bg-[#2F5C3F] text-white shadow-xs'
                : 'text-[#55604F] hover:text-[#1E2B1F]'
            }`}
          >
            <Radio className={`w-4 h-4 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>Offline Sync</span>
            {syncQueue.filter(q => q.status === 'pending').length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {syncQueue.filter(q => q.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACCOUNTS MANAGEMENT                                                */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <>
          {/* CREATE NEW ACCOUNT FORM */}
          <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#EAE1C4]">
              <UserPlus className="w-5 h-5 text-[#2F5C3F]" />
              <h3 className="font-serif text-lg font-bold text-[#203F2B]">Create Focal Person Account</h3>
            </div>

            {errorMsg && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                    Focal Person Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Elena Santos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                    Assigned Barangay *
                  </label>
                  <select
                    value={barangay}
                    onChange={(e) => {
                      setBarangay(e.target.value);
                      if (!username) {
                        setUsername(`${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')}.brgy`);
                      }
                    }}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
                  >
                    {BARANGAYS_DATA.map(b => (
                      <option key={b.name} value={b.name}>Brgy. {b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. poblacion.brgy"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="09XX-XXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="focalperson@hinunangan.gov.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>

          {/* ALL ACCOUNTS TABLE */}
          <div className="bg-white border border-[#DED2AE] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-[#FBF8EF] border-b border-[#DED2AE] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2F5C3F]" />
                <span className="font-bold text-[#203F2B]">Configured User Accounts ({users.length})</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#F5EFDD]/70 text-[#55604F] font-mono uppercase text-[11px] border-b border-[#DED2AE]">
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Barangay</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE1C4]">
                  {users.map(u => (
                    <tr key={u.username} className="hover:bg-[#FBF8EF] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#1E2B1F]">
                        {u.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#203F2B]">
                        {u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 text-purple-900 border border-purple-300' 
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {u.role === 'admin' ? 'Central Admin' : 'Barangay Focal'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1E2B1F]">
                        {u.barangay ? `Brgy. ${u.barangay}` : 'All 40 Barangays'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#55604F]">
                        {u.phone || u.email || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove account for "${u.fullName}" (${u.username})?`)) {
                                onDeleteUser(u.username);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOCAL STORAGE BACKUP & RESTORE UTILITY                             */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">

          {/* SYSTEM HEALTH & STORAGE STATUS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#55604F] mb-1">
                <span className="font-semibold uppercase font-mono">Swine Records</span>
                <Database className="w-4 h-4 text-[#2F5C3F]" />
              </div>
              <div className="text-2xl font-bold font-serif text-[#203F2B]">{pigs.length}</div>
              <div className="text-[11px] text-[#55604F] mt-1">
                Across {new Set(pigs.map(p => p.barangay)).size} active Hinunangan barangays
              </div>
            </div>

            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#55604F] mb-1">
                <span className="font-semibold uppercase font-mono">Focal Accounts</span>
                <Users className="w-4 h-4 text-[#D9A441]" />
              </div>
              <div className="text-2xl font-bold font-serif text-[#203F2B]">{users.length}</div>
              <div className="text-[11px] text-[#55604F] mt-1">
                {users.filter(u => u.role === 'admin').length} Central Admin • {users.filter(u => u.role === 'user').length} Barangay Focals
              </div>
            </div>

            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#55604F] mb-1">
                <span className="font-semibold uppercase font-mono">Browser Storage</span>
                <HardDrive className="w-4 h-4 text-[#4F7A55]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#203F2B]">{storageEstimatedKb} <span className="text-xs font-sans text-[#55604F]">KB</span></div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Persistent in local client storage
              </div>
            </div>
          </div>

          {/* FEEDBACK BANNERS */}
          {restoreSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-4 rounded-2xl flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-emerald-950">Operation Successful</div>
                <div>{restoreSuccess}</div>
              </div>
            </div>
          )}

          {restoreError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 text-xs p-4 rounded-2xl flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-rose-950">Operation Error</div>
                <div>{restoreError}</div>
              </div>
            </div>
          )}

          {/* GRID: DOWNLOAD BACKUP (LEFT) & RESTORE BACKUP (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. DOWNLOAD BACKUP CARD */}
            <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-[#EAE1C4]">
                  <Download className="w-5 h-5 text-[#2F5C3F]" />
                  <h3 className="font-serif text-lg font-bold text-[#203F2B]">Download JSON Backup</h3>
                </div>

                <p className="text-xs text-[#55604F] leading-relaxed">
                  Generate an immutable JSON snapshot of all registered swine inventory, GPS coordinates, biosecurity evaluations, and focal person user credentials. Keep this safe on your local drive or USB backup.
                </p>

                <div className="bg-[#FBF8EF] border border-[#DED2AE] rounded-xl p-3.5 text-xs space-y-2 font-mono">
                  <div className="text-[11px] text-[#2F5C3F] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-[#D9A441]" />
                    <span>Backup Structure (v4.0 JSON)</span>
                  </div>
                  <div className="text-[#55604F] text-[11px] space-y-1">
                    <div>• <b>pigs[]:</b> {pigs.length} swine entries with full biosecurity audits</div>
                    <div>• <b>users[]:</b> {users.length} authorized user accounts</div>
                    <div>• <b>system:</b> Municipality of Hinunangan, Southern Leyte</div>
                    <div>• <b>timestamp:</b> ISO-8601 creation record</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => downloadJsonBackup(pigs, users)}
                  className="w-full bg-[#2F5C3F] hover:bg-[#203F2B] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#D9A441]" />
                  <span>Download Local Storage Backup (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySampleJson}
                  className="w-full bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#2F5C3F] border border-[#DED2AE] py-2 px-3 rounded-xl font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPreview ? 'Copied Sample JSON!' : 'Copy Sample Schema Preview'}</span>
                </button>
              </div>
            </div>

            {/* 2. RESTORE / IMPORT JSON CARD */}
            <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-[#EAE1C4]">
                  <Upload className="w-5 h-5 text-[#D9A441]" />
                  <h3 className="font-serif text-lg font-bold text-[#203F2B]">Restore from JSON Backup</h3>
                </div>

                <p className="text-xs text-[#55604F] leading-relaxed">
                  Upload a previously exported JSON backup file to restore or merge swine inventory and user accounts into browser storage.
                </p>

                {/* DROP ZONE */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#DED2AE] hover:border-[#2F5C3F] bg-[#FBF8EF] hover:bg-[#F5EFDD]/70 rounded-xl p-5 text-center cursor-pointer transition-colors space-y-2"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-white border border-[#DED2AE] text-[#2F5C3F] mx-auto flex items-center justify-center shadow-2xs">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#203F2B] block">
                      {restoreFile ? restoreFile.name : 'Click to Browse or Drag & Drop Backup JSON'}
                    </span>
                    <span className="text-[10px] text-[#55604F]">
                      Supported format: .json generated by Hinunangan DA Swine Registry
                    </span>
                  </div>
                </div>

                {/* PARSED BACKUP PREVIEW */}
                {parsedBackup && (
                  <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#203F2B] text-[11px] pb-1 border-b border-amber-200">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Valid Backup File Detected
                      </span>
                      <span className="font-mono text-[10px] text-[#55604F]">{new Date(parsedBackup.timestamp).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#55604F] pt-1">
                      <div>
                        <span className="font-semibold text-[#1E2B1F]">Swine Records:</span> {parsedBackup.pigsCount}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1E2B1F]">User Accounts:</span> {parsedBackup.usersCount}
                      </div>
                      <div className="col-span-2 text-[10px] text-[#55604F]">
                        <span className="font-semibold">System:</span> {parsedBackup.system}
                      </div>
                    </div>

                    {/* RESTORE MODE SELECTOR */}
                    <div className="pt-2 border-t border-amber-200 space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-[#55604F]">
                        Select Restore Strategy:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRestoreMode('merge')}
                          className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                            restoreMode === 'merge'
                              ? 'bg-white border-[#2F5C3F] ring-2 ring-[#2F5C3F]/20 text-[#203F2B]'
                              : 'bg-white/60 border-amber-200 text-[#55604F]'
                          }`}
                        >
                          <div className="font-bold text-[11px]">Merge &amp; Append</div>
                          <div className="text-[9px] text-[#55604F]">Updates existing and adds missing</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRestoreMode('replace')}
                          className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                            restoreMode === 'replace'
                              ? 'bg-white border-rose-600 ring-2 ring-rose-300 text-rose-950'
                              : 'bg-white/60 border-amber-200 text-[#55604F]'
                          }`}
                        >
                          <div className="font-bold text-[11px]">Full Replace</div>
                          <div className="text-[9px] text-rose-700">Wipes and replaces completely</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RESTORE ACTION BUTTON */}
              {parsedBackup && (
                <div className="pt-2 space-y-2">
                  {!isConfirmingRestore ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingRestore(true)}
                      className="w-full bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Review &amp; Apply Restore</span>
                    </button>
                  ) : (
                    <div className="bg-amber-100 border border-amber-400 p-3 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-800" />
                        <span>Confirm {restoreMode === 'replace' ? 'Full Overwrite' : 'Merge'} Restore?</span>
                      </div>
                      <p className="text-[11px] text-amber-900">
                        This will write {parsedBackup.pigsCount} pigs and {parsedBackup.usersCount} users into local storage.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleExecuteRestore}
                          className="flex-1 bg-[#2F5C3F] hover:bg-[#203F2B] text-white py-2 rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                        >
                          Yes, Apply Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingRestore(false)}
                          className="px-3 bg-white border border-amber-300 text-neutral-700 py-2 rounded-lg font-semibold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FACTORY RESET / SEED DATASET CARD */}
          <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-[#203F2B]">
                <RefreshCw className="w-4 h-4 text-[#55604F]" />
                <span>Reset to Official Initial Seed Dataset</span>
              </div>
              <p className="text-xs text-[#55604F]">
                Restore the default 36 demonstration swine records across Hinunangan and 40 focal person accounts.
              </p>
            </div>

            <div>
              {!isConfirmingReset ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(true)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Re-seed Default Data</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-300 p-2 rounded-xl">
                  <span className="text-xs font-bold text-rose-900">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingReset(false)}
                    className="px-2 py-1 bg-white border border-neutral-300 text-neutral-700 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OFFLINE SYNC & FIELD QUEUE HUB                                     */}
      {/* ========================================================================= */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          
          {/* OFFLINE STATUS HERO */}
          <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <h3 className="font-serif text-lg font-bold text-[#203F2B]">
                  Field Connectivity &amp; Outbox Engine
                </h3>
              </div>
              <p className="text-xs text-[#55604F]">
                Offline-First architecture automatically stores all swine registrations, audits, and account mutations in browser memory and pushes them when connectivity returns.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onToggleSimulateOffline && (
                <button
                  type="button"
                  onClick={onToggleSimulateOffline}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-2 cursor-pointer ${
                    isSimulatedOffline
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-[#FBF8EF] border-[#DED2AE] text-[#55604F] hover:bg-[#F5EFDD]'
                  }`}
                >
                  {isSimulatedOffline ? <WifiOff className="w-4 h-4 text-amber-600" /> : <Wifi className="w-4 h-4 text-[#2F5C3F]" />}
                  <span>{isSimulatedOffline ? 'Simulating Offline Mode' : 'Simulate Offline Mode'}</span>
                </button>
              )}

              {onTriggerSync && (
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing || !isOnline}
                  className="px-4 py-2 bg-[#2F5C3F] hover:bg-[#203F2B] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing Now...' : 'Sync Outbox Now'}</span>
                </button>
              )}

              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={onOpenSyncModal}
                  className="px-4 py-2 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Open Full Sync Hub</span>
                </button>
              )}
            </div>
          </div>

          {/* QUEUE SUMMARY METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-mono font-bold uppercase text-[#55604F] mb-1">Queue Total</div>
              <div className="text-2xl font-bold font-serif text-[#203F2B]">{syncQueue.length}</div>
              <div className="text-[10px] text-[#55604F] mt-1">Total recorded mutations</div>
            </div>

            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-mono font-bold uppercase text-amber-700 mb-1">Pending Sync</div>
              <div className="text-2xl font-bold font-serif text-amber-700">
                {syncQueue.filter(q => q.status === 'pending').length}
              </div>
              <div className="text-[10px] text-[#55604F] mt-1">Awaiting online transmission</div>
            </div>

            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-mono font-bold uppercase text-emerald-700 mb-1">Synced Items</div>
              <div className="text-2xl font-bold font-serif text-emerald-700">
                {syncQueue.filter(q => q.status === 'synced').length}
              </div>
              <div className="text-[10px] text-[#55604F] mt-1">Successfully synced</div>
            </div>

            <div className="bg-white border border-[#DED2AE] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-mono font-bold uppercase text-rose-700 mb-1">Sync Errors</div>
              <div className="text-2xl font-bold font-serif text-rose-700">
                {syncQueue.filter(q => q.status === 'error').length}
              </div>
              <div className="text-[10px] text-[#55604F] mt-1">Requires user retry</div>
            </div>
          </div>

          {/* QUEUE AUDIT TABLE */}
          <div className="bg-white border border-[#DED2AE] rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-[#FBF8EF] border-b border-[#DED2AE] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2F5C3F]" />
                <span className="font-bold text-[#203F2B]">Recent Outbox Queue Items</span>
              </div>
              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={onOpenSyncModal}
                  className="text-[#2F5C3F] font-bold hover:underline cursor-pointer"
                >
                  Manage All in Sync Hub &rarr;
                </button>
              )}
            </div>

            {syncQueue.length === 0 ? (
              <div className="p-8 text-center text-[#55604F] space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <div className="font-serif font-bold text-sm text-[#203F2B]">Outbox Queue is Empty</div>
                <p className="text-xs max-w-sm mx-auto">
                  All local operations are synchronized. When you create or update swine registrations while offline, mutations will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#F5EFDD]/70 text-[#55604F] font-mono uppercase text-[11px] border-b border-[#DED2AE]">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Entity</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Summary</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE1C4]">
                    {syncQueue.slice(0, 8).map(item => (
                      <tr key={item.id} className="hover:bg-[#FBF8EF]">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#55604F]">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-[#203F2B] uppercase text-[10px]">
                          {item.entityType}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            item.action === 'create' ? 'bg-emerald-100 text-emerald-800' :
                            item.action === 'update' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#1E2B1F]">
                          {item.summary}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'synced' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

