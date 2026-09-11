import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  MapPin, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  FileSpreadsheet,
  CheckCircle2,
  Wifi,
  WifiOff,
  CloudCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { BARANGAYS_DATA, PURPOSE_COLORS, PURPOSES } from '../data/constants';
import { PigRecord, PurposeType, User } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { 
  calculateBiosecurityScore, 
  determineAsfRiskLevel, 
  evaluatePcicEligibility 
} from '../config/systemLogic';

interface RecordsViewProps {
  pigs: PigRecord[];
  currentUser: User;
  onOpenAddModal: () => void;
  onEditPig: (pig: PigRecord) => void;
  onDeletePig: (pigId: string) => void;
  onViewOnMap?: (pigId: string) => void;
  pendingRecordIds?: Set<string>;
  isOnline?: boolean;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  pigs = [],
  currentUser,
  onOpenAddModal,
  onEditPig,
  onDeletePig,
  onViewOnMap,
  pendingRecordIds = new Set<string>(),
  isOnline = true,
  onTriggerSync,
  isSyncing = false
}) => {
  const { t } = useI18n();
  const isAdmin = currentUser.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<'all' | 'vax' | 'unvax' | 'deceased'>('all');
  const [selectedRisk, setSelectedRisk] = useState<'all' | 'GREEN' | 'YELLOW' | 'PINK' | 'RED'>('all');
  const [selectedPcic, setSelectedPcic] = useState<'all' | 'eligible' | 'ineligible'>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'offline_drafts' | 'synced'>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  // View Format: Auto (Cards on mobile, Table on desktop), or explicit Cards / Table
  const [viewFormat, setViewFormat] = useState<'auto' | 'cards' | 'table'>('auto');

  // Reset to page 1 whenever any filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBarangay, selectedPurpose, selectedHealth, selectedRisk, selectedPcic, syncFilter, pageSize]);

  // Scoped pigs based on user role
  const scopedAllPigs = (pigs || []).filter(p => {
    if (!isAdmin && currentUser.barangay && p.barangay !== currentUser.barangay) {
      return false;
    }
    return true;
  });

  const pendingCount = scopedAllPigs.filter(p => pendingRecordIds.has(p.id)).length;
  const syncedCount = scopedAllPigs.filter(p => !pendingRecordIds.has(p.id)).length;

  // Filter scoped pigs
  const filteredPigs = scopedAllPigs.filter(p => {
    if (syncFilter === 'offline_drafts' && !pendingRecordIds.has(p.id)) return false;
    if (syncFilter === 'synced' && pendingRecordIds.has(p.id)) return false;

    if (selectedBarangay && p.barangay !== selectedBarangay) return false;
    if (selectedPurpose && p.purpose !== selectedPurpose) return false;
    if (selectedHealth === 'vax' && !p.vaccinated) return false;
    if (selectedHealth === 'unvax' && p.vaccinated) return false;
    if (selectedHealth === 'deceased' && !p.isDeceased) return false;

    if (selectedRisk !== 'all') {
      const asf = determineAsfRiskLevel(p);
      if (asf.code !== selectedRisk) return false;
    }

    if (selectedPcic !== 'all') {
      const pcic = evaluatePcicEligibility(p);
      if (selectedPcic === 'eligible' && !pcic.isEligible) return false;
      if (selectedPcic === 'ineligible' && pcic.isEligible) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTag = p.earTag.toLowerCase().includes(q);
      const matchOwner = p.ownerName.toLowerCase().includes(q);
      const matchAddress = p.address.toLowerCase().includes(q);
      const matchBreed = p.breed.toLowerCase().includes(q);
      const matchNotes = (p.notes || '').toLowerCase().includes(q);
      if (!matchTag && !matchOwner && !matchAddress && !matchBreed && !matchNotes) {
        return false;
      }
    }
    return true;
  });

  // Calculate pagination values
  const totalRecords = filteredPigs.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startIndex = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalRecords);
  const paginatedPigs = filteredPigs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Generate page numbers array with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Export to CSV with full schema fields
  const handleExportCSV = () => {
    const headers = [
      'Ear Tag',
      'Owner Name',
      'Contact',
      'Address',
      'Barangay',
      'Breed',
      'Sex',
      'Age (months)',
      'Weight (kg)',
      'Head Count',
      'Purpose',
      'Housing Type',
      'Feeding Practice',
      'Waste Management',
      'Vaccinated',
      'ASF Cleared',
      'ASF Risk Zone',
      'PCIC Insurance Eligible',
      'Is Deceased',
      'Mortality Date',
      'Mortality Reason',
      'Biosecurity Score (x/7)',
      'Footbath Maintenance',
      'Fencing Integrity',
      'Zero-Swill Feeding',
      'Scheduled Disinfection',
      'Visitor Access Control',
      'Quarantine Pen',
      'Clean Water Source',
      'Date Registered',
      'Latitude',
      'Longitude',
      'GPS Accuracy (m)',
      'Registered By',
      'Field Notes'
    ];

    const rows = filteredPigs.map(p => {
      const bioEval = calculateBiosecurityScore(p.biosecurity);
      const asfRisk = determineAsfRiskLevel(p);
      const pcicEval = evaluatePcicEligibility(p);
      const bio = p.biosecurity;

      return [
        `"${p.earTag}"`,
        `"${p.ownerName}"`,
        `"${p.contact}"`,
        `"${p.address}"`,
        `"${p.barangay}"`,
        `"${p.breed}"`,
        `"${p.sex}"`,
        p.age,
        p.weight,
        p.headCount || 1,
        `"${p.purpose}"`,
        `"${p.housingType || (bio as any)?.housingType || 'Standard Flooring'}"`,
        `"${p.feedingType || (bio as any)?.feedingType || 'Standard Feed'}"`,
        `"${p.wasteManagement || (bio as any)?.wasteManagement || 'Standard Drainage'}"`,
        p.vaccinated ? 'YES' : 'NO',
        p.asfCleared ? 'YES' : 'NO',
        `"${asfRisk.level} (${asfRisk.code})"`,
        pcicEval.isEligible ? 'YES' : 'NO',
        p.isDeceased ? 'YES' : 'NO',
        `"${p.mortalityDate || ''}"`,
        `"${p.mortalityReason || ''}"`,
        `"${bioEval.score}/7"`,
        bio ? (bio.footbathMaintenance ? 'YES' : 'NO') : 'YES',
        bio ? (bio.fencingIntegrity ? 'YES' : 'NO') : 'YES',
        bio ? (bio.swillFeedingBanned ? 'YES' : 'NO') : 'YES',
        bio ? (bio.disinfectionRoutine ? 'YES' : 'NO') : 'YES',
        bio ? (bio.visitorLogControl ? 'YES' : 'NO') : 'NO',
        bio ? (bio.quarantineIsolationPen ? 'YES' : 'NO') : 'NO',
        bio ? (bio.cleanWaterSource ? 'YES' : 'NO') : 'YES',
        `"${p.dateRegistered}"`,
        p.lat,
        p.lng,
        p.gpsAccuracy || '',
        `"${p.registeredBy}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hinunangan_swine_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#203F2B]">
              {isAdmin ? t('topbar.recordsAdminTitle') : `${t('topbar.recordsFocalTitle')} — Brgy. ${currentUser.barangay || ''}`}
            </h2>
            <p className="text-xs text-[#55604F]">
              {t('gis.mapViewSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border border-[#DED2AE] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#2F5C3F]" />
              <span>{t('records.exportCsv')}</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('records.addSwineRecord')}</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="mt-4 pt-4 border-t border-[#EAE1C4] space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSyncFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                syncFilter === 'all'
                  ? 'bg-[#203F2B] text-white shadow-2xs'
                  : 'bg-[#F5EFDD] text-[#55604F] hover:bg-[#EAE1C4]'
              }`}
            >
              <span>All Records</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                syncFilter === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#55604F]'
              }`}>
                {scopedAllPigs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSyncFilter('offline_drafts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                syncFilter === 'offline_drafts'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : pendingCount > 0
                  ? 'bg-amber-100/80 text-amber-900 border border-amber-300 hover:bg-amber-200/80'
                  : 'bg-[#F5EFDD] text-[#55604F] hover:bg-[#EAE1C4]'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Saved Locally (Offline Drafts)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                syncFilter === 'offline_drafts' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900 font-bold'
              }`}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSyncFilter('synced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                syncFilter === 'synced'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-[#F5EFDD] text-[#55604F] hover:bg-[#EAE1C4]'
              }`}
            >
              <CloudCheck className="w-3.5 h-3.5" />
              <span>Synced Live</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                syncFilter === 'synced' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#55604F]'
              }`}>
                {syncedCount}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#55604F]" />
              <input
                type="text"
                placeholder={t('records.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              />
            </div>

            {/* Barangay Filter (Admin) */}
            {isAdmin ? (
              <div>
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
                >
                  <option value="">{t('records.allBarangays')}</option>
                  {BARANGAYS_DATA.map(b => (
                    <option key={b.name} value={b.name}>Brgy. {b.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center px-3 py-2 bg-[#FBF8EF] border border-[#DED2AE] rounded-xl text-[#55604F] font-medium">
                Sector: Brgy. {currentUser.barangay}
              </div>
            )}

            {/* Purpose Filter */}
            <div>
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              >
                <option value="">{t('records.allPurposes')}</option>
                {PURPOSES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* ASF Zone Filter */}
            <div>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value as any)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              >
                <option value="all">All ASF Zones</option>
                <option value="GREEN">🟢 Green (Free / Protected)</option>
                <option value="YELLOW">🟡 Yellow (Surveillance)</option>
                <option value="PINK">🌸 Pink (Buffer / Deficit)</option>
                <option value="RED">🔴 Red (Infected / Swill Violations)</option>
              </select>
            </div>

            {/* PCIC Insurance Status Filter */}
            <div>
              <select
                value={selectedPcic}
                onChange={(e) => setSelectedPcic(e.target.value as any)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              >
                <option value="all">All Insurance Status</option>
                <option value="eligible">✓ PCIC Eligible Only</option>
                <option value="ineligible">✕ Ineligible Only</option>
              </select>
            </div>

            {/* Health Status Filter */}
            <div>
              <select
                value={selectedHealth}
                onChange={(e) => setSelectedHealth(e.target.value as any)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              >
                <option value="all">{t('records.allHealthStatus')}</option>
                <option value="vax">{t('records.vaccinatedOnly')}</option>
                <option value="unvax">{t('records.unvaccinatedOnly')}</option>
                <option value="deceased">Deceased / Mortality Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* OFFLINE DRAFT / PENDING BANNER */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-200/80 text-amber-900 rounded-xl shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>{pendingCount} Record(s) Saved Locally to Device</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  OFFLINE EDITS ACTIVE
                </span>
              </div>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {isOnline 
                  ? 'Connection is live. Your offline changes are automatically uploading in the background.'
                  : 'You are in offline mode. Your new records and edits are securely stored locally and will auto-upload when reconnected.'
                }
              </p>
            </div>
          </div>

          {isOnline && onTriggerSync && (
            <button
              type="button"
              onClick={() => onTriggerSync()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Live Now'}</span>
            </button>
          )}
        </div>
      )}

      {/* REGISTRY TABLE */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FBF8EF] border-b border-[#DED2AE] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-[#203F2B]">
              {totalRecords > 0 
                ? `Showing ${startIndex}–${endIndex} of ${totalRecords} records`
                : 'No records matching filter criteria'
              }
            </span>
            {totalRecords !== scopedAllPigs.length && (
              <span className="text-[11px] text-[#55604F] bg-[#F5EFDD] px-2 py-0.5 rounded-md border border-[#DED2AE]">
                Filtered from {scopedAllPigs.length} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 justify-between sm:justify-end">
            {/* Mobile / Desktop View Mode Toggle */}
            <div className="flex items-center bg-[#F5EFDD] p-0.5 rounded-xl border border-[#DED2AE]">
              <button
                type="button"
                onClick={() => setViewFormat('auto')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[36px] sm:min-h-0 flex items-center gap-1 cursor-pointer ${
                  viewFormat === 'auto' ? 'bg-[#203F2B] text-white shadow-xs' : 'text-[#55604F] hover:text-[#1E2B1F]'
                }`}
                title="Automatic Layout (Cards on mobile, Table on desktop)"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setViewFormat('cards')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[36px] sm:min-h-0 flex items-center gap-1 cursor-pointer ${
                  viewFormat === 'cards' ? 'bg-[#203F2B] text-white shadow-xs' : 'text-[#55604F] hover:text-[#1E2B1F]'
                }`}
                title="Stacked Card View"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden xs:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFormat('table')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all min-h-[36px] sm:min-h-0 flex items-center gap-1 cursor-pointer ${
                  viewFormat === 'table' ? 'bg-[#203F2B] text-white shadow-xs' : 'text-[#55604F] hover:text-[#1E2B1F]'
                }`}
                title="Full Grid Table View"
              >
                <TableIcon className="w-3 h-3" />
                <span className="hidden xs:inline">Table</span>
              </button>
            </div>

            <span className="font-mono text-[11px] text-[#55604F]">
              Page <b className="text-[#203F2B]">{safeCurrentPage}</b> of <b className="text-[#203F2B]">{totalPages}</b>
            </span>
          </div>
        </div>

        {filteredPigs.length === 0 ? (
          <div className="p-8 sm:p-16 text-center max-w-2xl mx-auto space-y-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-[#F5EFDD] rounded-full scale-110 opacity-70 animate-pulse" />
              <div className="absolute inset-2 bg-[#EAE1C4] rounded-full" />
              <div className="relative p-4 bg-[#203F2B] text-[#D9A441] rounded-3xl shadow-lg">
                <ShieldCheck className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-xl sm:text-2xl font-black text-[#203F2B]">
                {t('records.noRecordsFound')}
              </h3>
              <p className="text-xs sm:text-sm text-[#55604F] leading-relaxed max-w-md mx-auto">
                No active swine registrations found matching your selected filters. Let's register a new herd to start surveillance!
              </p>
            </div>

            {/* Quick-Start Instruction Guide */}
            <div className="bg-[#FAF6EC] border border-[#DED2AE] rounded-2xl p-4 sm:p-5 text-left space-y-3.5 shadow-3xs">
              <span className="font-mono text-[10px] font-bold text-[#203F2B] uppercase tracking-wider block border-b border-[#EAE1C4] pb-2">
                📋 Field Registration Quick Steps
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#203F2B]">
                    <span className="w-5 h-5 rounded-full bg-[#203F2B] text-white flex items-center justify-center text-[10px] font-mono">1</span>
                    <span>Click '+ Add'</span>
                  </div>
                  <p className="text-[#55604F] text-[11px] leading-normal pl-6">
                    Click the button below or topbar action to launch the registry form.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#203F2B]">
                    <span className="w-5 h-5 rounded-full bg-[#203F2B] text-white flex items-center justify-center text-[10px] font-mono">2</span>
                    <span>Fill &amp; Plot</span>
                  </div>
                  <p className="text-[#55604F] text-[11px] leading-normal pl-6">
                    Enter the ear-tag ID, owner info, and plot the precise farm coordinate.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#203F2B]">
                    <span className="w-5 h-5 rounded-full bg-[#203F2B] text-white flex items-center justify-center text-[10px] font-mono">3</span>
                    <span>Local &amp; Sync</span>
                  </div>
                  <p className="text-[#55604F] text-[11px] leading-normal pl-6">
                    Save offline instantly; it syncs automatically when connection returns.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAddModal}
              className="px-6 py-3 bg-[#203F2B] hover:bg-[#2F5C3F] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D9A441]" />
              <span>Register First Swine Record</span>
            </button>
          </div>
        ) : (
          <>
            {/* 1. STACKED MOBILE CARD VIEW (< md or forced Cards) */}
            <div className={viewFormat === 'cards' ? 'block divide-y divide-[#EAE1C4]' : viewFormat === 'auto' ? 'block md:hidden divide-y divide-[#EAE1C4]' : 'hidden'}>
              {paginatedPigs.map(pig => {
                const bioEval = calculateBiosecurityScore(pig.biosecurity);
                const asfRisk = determineAsfRiskLevel(pig);
                const pcicEval = evaluatePcicEligibility(pig);
                const isDeceased = pig.isDeceased;
                const headCount = pig.headCount || 1;

                return (
                  <div key={`card-${pig.id}`} className="p-4 bg-white hover:bg-[#FBF8EF] transition-colors space-y-3">
                    {/* Header: Tag + Purpose + Head Count + Health Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-[#F5EFDD] border border-[#DED2AE] text-[#203F2B] px-2 py-0.5 rounded">
                          {pig.earTag}
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ background: PURPOSE_COLORS[pig.purpose] || '#2F5C3F' }}
                        >
                          {pig.purpose}
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-[#EAE1C4] text-[#203F2B] px-1.5 py-0.5 rounded">
                          {headCount} {headCount > 1 ? 'heads' : 'head'}
                        </span>
                        {pendingRecordIds.has(pig.id) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                            <WifiOff className="w-2.5 h-2.5 text-amber-700" />
                            Offline Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                            <CloudCheck className="w-2.5 h-2.5 text-emerald-600" />
                            Live Synced
                          </span>
                        )}
                      </div>

                      {isDeceased ? (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded shrink-0">
                          💀 Deceased
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${pig.vaccinated ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-amber-50 text-amber-900 border border-amber-300'}`}>
                          {pig.vaccinated ? '🛡️ Vaccinated' : '⚠️ Pending Vax'}
                        </span>
                      )}
                    </div>

                    {/* Owner Name & Location */}
                    <div>
                      <h4 className="font-serif font-bold text-base text-[#1E2B1F]">
                        {pig.ownerName}
                      </h4>
                      <p className="text-xs text-[#55604F]">
                        Brgy. {pig.barangay}{pig.address ? ` · ${pig.address}` : ''}
                      </p>
                      {pig.contact && (
                        <p className="text-[11px] font-mono text-[#55604F] mt-0.5">
                          📞 {pig.contact}
                        </p>
                      )}
                    </div>

                    {/* Deceased Banner if applicable */}
                    {isDeceased && (
                      <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl text-xs text-rose-950 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <span className="font-bold">Mortality:</span> {pig.mortalityReason || 'Unspecified'} {pig.mortalityDate ? `(${pig.mortalityDate})` : ''}
                        </div>
                      </div>
                    )}

                    {/* Physical Details & Biosecurity Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#FBF8EF] p-2 rounded-xl border border-[#DED2AE]">
                        <span className="text-[10px] text-[#55604F] uppercase font-bold block">Breed / Sex</span>
                        <b className="text-[#1E2B1F]">{pig.breed} ({pig.sex})</b>
                      </div>
                      <div className="bg-[#FBF8EF] p-2 rounded-xl border border-[#DED2AE]">
                        <span className="text-[10px] text-[#55604F] uppercase font-bold block">Weight / Age</span>
                        <b className="text-[#1E2B1F]">{pig.weight} kg · {pig.age} mos</b>
                      </div>
                    </div>

                    {/* Biosecurity, ASF Risk Zone & PCIC Badges */}
                    <div className="space-y-1.5 bg-[#F5EFDD]/70 border border-[#DED2AE] p-2.5 rounded-xl text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#203F2B] font-semibold flex items-center gap-1 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#2F5C3F]" />
                          Score:
                        </span>
                        <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                          bioEval.score >= 6 ? 'bg-emerald-100 text-emerald-800' : bioEval.score >= 4 ? 'bg-[#EAE1C4] text-[#2F5C3F]' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {bioEval.score}/7 Biosecure
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#DED2AE]/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#55604F]">
                          ASF Status:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          asfRisk.code === 'GREEN' ? 'bg-emerald-100 text-emerald-800' :
                          asfRisk.code === 'YELLOW' ? 'bg-amber-100 text-amber-800' :
                          asfRisk.code === 'PINK' ? 'bg-pink-100 text-pink-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {asfRisk.level}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#DED2AE]/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#55604F]">
                          PCIC Insurance:
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pcicEval.isEligible ? 'bg-teal-100 text-teal-800' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {pcicEval.isEligible ? '✓ PCIC Qualified' : '✕ Not Qualified'}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Card Action Bar - Minimum 44px tap targets */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#EAE1C4]">
                      {onViewOnMap && (
                        <button
                          type="button"
                          onClick={() => onViewOnMap(pig.id)}
                          className="flex-1 min-h-[44px] bg-[#F5EFDD] hover:bg-[#EAE1C4] active:scale-98 text-[#2F5C3F] border border-[#DED2AE] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>View on Map</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditPig(pig)}
                        className="flex-1 min-h-[44px] bg-[#203F2B] hover:bg-[#2F5C3F] active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onDeletePig(pig.id)}
                          className="min-h-[44px] min-w-[44px] px-3 bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                          title="Delete Swine Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. STANDARD DATA GRID TABLE (>= md or forced Table) */}
            <div className={viewFormat === 'table' ? 'block overflow-x-auto' : viewFormat === 'auto' ? 'hidden md:block overflow-x-auto' : 'hidden'}>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#F5EFDD]/70 text-[#55604F] font-mono uppercase text-[11px] border-b border-[#DED2AE]">
                    <th className="py-3 px-4">{t('records.colTag')}</th>
                    <th className="py-3 px-4">{t('records.colOwner')}</th>
                    {isAdmin && <th className="py-3 px-4">{t('records.colLocation')}</th>}
                    <th className="py-3 px-4">{t('records.colBreedSex')}</th>
                    <th className="py-3 px-4">{t('records.colWeightAge')}</th>
                    <th className="py-3 px-4">{t('records.purpose')}</th>
                    <th className="py-3 px-4">{t('records.colBiosecurity')}</th>
                    <th className="py-3 px-4">{t('gis.captureCoords')}</th>
                    <th className="py-3 px-4 text-right">{t('records.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE1C4]">
                  {paginatedPigs.map(pig => {
                    const bioEval = calculateBiosecurityScore(pig.biosecurity);
                    const asfRisk = determineAsfRiskLevel(pig);
                    const pcicEval = evaluatePcicEligibility(pig);
                    const headCount = pig.headCount || 1;

                    return (
                      <tr key={pig.id} className="hover:bg-[#FBF8EF] transition-colors">
                        
                        {/* Ear Tag & Sync Status */}
                        <td className="py-3 px-4 font-mono font-bold text-[#203F2B]">
                          <div className="bg-[#F5EFDD] border border-[#DED2AE] px-2 py-1 rounded inline-block text-[11px]">
                            {pig.earTag}
                          </div>
                          {pendingRecordIds.has(pig.id) ? (
                            <div className="mt-1">
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold shadow-2xs"
                                title="Saved locally on device (offline draft); will auto-upload when online"
                              >
                                <WifiOff className="w-2.5 h-2.5 text-amber-700" />
                                <span>Offline Draft</span>
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium"
                                title="Live synchronized with Supabase PostgreSQL Database"
                              >
                                <CloudCheck className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Live Synced</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Owner & Address */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-[#1E2B1F]">{pig.ownerName}</div>
                          <div className="text-[11px] text-[#55604F]">{pig.address}</div>
                          {pig.contact && (
                            <div className="text-[10px] text-[#55604F] font-mono mt-0.5">{pig.contact}</div>
                          )}
                        </td>

                        {/* Barangay */}
                        {isAdmin && (
                          <td className="py-3 px-4 font-semibold text-[#203F2B]">
                            Brgy. {pig.barangay}
                          </td>
                        )}

                        {/* Breed & Sex */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1E2B1F]">{pig.breed}</div>
                          <div className="text-[11px] text-[#55604F]">{pig.sex}</div>
                        </td>

                        {/* Age / Weight */}
                        <td className="py-3 px-4 font-mono">
                          <div><b>{pig.weight}</b> kg</div>
                          <div className="text-[11px] text-[#55604F]">{pig.age} mos</div>
                        </td>

                        {/* Purpose Badge & Head Count */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span 
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white inline-block shadow-2xs"
                              style={{ background: PURPOSE_COLORS[pig.purpose] || '#2F5C3F' }}
                            >
                              {pig.purpose}
                            </span>
                            <div className="text-[10px] font-mono text-[#55604F]">
                              {headCount} {headCount > 1 ? 'heads' : 'head'}
                            </div>
                          </div>
                        </td>

                        {/* Biosecurity & Vaccination */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {pig.isDeceased ? (
                              <div className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-900 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded shadow-2xs" title={`Deceased on ${pig.mortalityDate || 'N/A'}`}>
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>Deceased: {pig.mortalityReason || 'Mortality Event'}</span>
                              </div>
                            ) : (
                              <div className={`inline-flex items-center gap-1 font-semibold text-[11px] ${pig.vaccinated ? 'text-emerald-700' : 'text-amber-700'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pig.vaccinated ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                                {pig.vaccinated ? 'Vaccinated' : 'Pending Vax'}
                              </div>
                            )}

                            {/* Biosecurity Assessment Score + ASF Zone + Insurance Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border flex items-center gap-1 ${
                                  bioEval.score >= 6 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                    : bioEval.score >= 4 
                                    ? 'bg-[#F5EFDD] text-[#2F5C3F] border-[#DED2AE]' 
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>{bioEval.score}/7</span>
                              </span>

                              <span 
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                  asfRisk.code === 'GREEN' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                  asfRisk.code === 'YELLOW' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                  asfRisk.code === 'PINK' ? 'bg-pink-50 text-pink-800 border-pink-300' :
                                  'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                                title={asfRisk.reason}
                              >
                                {asfRisk.level}
                              </span>

                              {pcicEval.isEligible && (
                                <span 
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-teal-50 text-teal-800 border border-teal-300"
                                  title="PCIC Free Insurance Eligible"
                                >
                                  PCIC ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Coordinates */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="text-[#1E2B1F] font-semibold">
                            {pig.lat.toFixed(4)}°, {pig.lng.toFixed(4)}°
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onViewOnMap && (
                              <button
                                type="button"
                                onClick={() => onViewOnMap(pig.id)}
                                className="min-h-[36px] min-w-[36px] p-2 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#2F5C3F] border border-[#DED2AE] rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                                title={t('records.viewOnMap')}
                              >
                                <MapPin className="w-4 h-4 text-[#2F5C3F]" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onEditPig(pig)}
                              className="min-h-[36px] min-w-[36px] p-2 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border border-[#DED2AE] rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                              title={t('records.editRecord')}
                            >
                              <Edit3 className="w-4 h-4 text-[#55604F]" />
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onDeletePig(pig.id)}
                                className="min-h-[36px] min-w-[36px] p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                                title={t('records.deleteRecord')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PAGINATION CONTROLS FOOTER */}
        {totalRecords > 0 && (
          <div className="px-5 py-3.5 bg-[#FBF8EF] border-t border-[#DED2AE] flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            {/* Left: Page size selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#55604F] font-medium">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#DED2AE] rounded-lg px-2.5 py-1 text-xs text-[#1E2B1F] font-semibold focus:outline-none focus:border-[#2F5C3F] cursor-pointer"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
              <span className="text-[#55604F] text-[11px] font-mono ml-2 hidden sm:inline">
                ({startIndex}–{endIndex} of {totalRecords})
              </span>
            </div>

            {/* Right: Page navigation buttons with 44px min touch targets */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
              {/* First Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#DED2AE] bg-white hover:bg-[#F5EFDD] active:scale-95 text-[#203F2B] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className="min-h-[44px] px-3 flex items-center gap-1 rounded-xl border border-[#DED2AE] bg-white hover:bg-[#F5EFDD] active:scale-95 text-[#203F2B] font-semibold disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Prev</span>
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-[#55604F] font-mono select-none">
                        …
                      </span>
                    );
                  }
                  const pageNum = Number(p);
                  const isCurrent = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'bg-[#203F2B] text-white shadow-2xs'
                          : 'bg-white hover:bg-[#F5EFDD] text-[#1E2B1F] border border-[#DED2AE]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                className="min-h-[44px] px-3 flex items-center gap-1 rounded-xl border border-[#DED2AE] bg-white hover:bg-[#F5EFDD] active:scale-95 text-[#203F2B] font-semibold disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                title="Next Page"
              >
                <span className="hidden sm:inline text-xs">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#DED2AE] bg-white hover:bg-[#F5EFDD] active:scale-95 text-[#203F2B] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
