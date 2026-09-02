import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { BARANGAYS_DATA, PURPOSE_COLORS, PURPOSES } from '../data/constants';
import { PigRecord, PurposeType, User } from '../types';

interface RecordsViewProps {
  pigs: PigRecord[];
  currentUser: User;
  onOpenAddModal: () => void;
  onEditPig: (pig: PigRecord) => void;
  onDeletePig: (pigId: string) => void;
  onViewOnMap?: (pigId: string) => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  pigs = [],
  currentUser,
  onOpenAddModal,
  onEditPig,
  onDeletePig,
  onViewOnMap
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<'all' | 'vax' | 'unvax'>('all');

  // Filter scoped pigs
  const filteredPigs = (pigs || []).filter(p => {
    if (!isAdmin && currentUser.barangay && p.barangay !== currentUser.barangay) {
      return false;
    }
    if (selectedBarangay && p.barangay !== selectedBarangay) return false;
    if (selectedPurpose && p.purpose !== selectedPurpose) return false;
    if (selectedHealth === 'vax' && !p.vaccinated) return false;
    if (selectedHealth === 'unvax' && p.vaccinated) return false;

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

  // Export to CSV
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
      'Purpose',
      'Vaccinated',
      'ASF Cleared',
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
      const bio = p.biosecurity;
      const score = bio ? Object.values(bio).filter(Boolean).length : (p.asfCleared ? 5 : 3);
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
        `"${p.purpose}"`,
        p.vaccinated ? 'YES' : 'NO',
        p.asfCleared ? 'YES' : 'NO',
        `"${score}/7"`,
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
              {isAdmin ? 'Swine Registry Database — All Barangays' : `Barangay ${currentUser.barangay} Swine Registry`}
            </h2>
            <p className="text-xs text-[#55604F]">
              Comprehensive registry records with verified GPS coordinates and herd health indicators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border border-[#DED2AE] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#2F5C3F]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Swine Record</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="mt-4 pt-4 border-t border-[#EAE1C4] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#55604F]" />
            <input
              type="text"
              placeholder="Search ear tag, owner name, purok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
            />
          </div>

          {/* Barangay Filter (Admin) */}
          {isAdmin && (
            <div>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              >
                <option value="">All 40 Barangays</option>
                {BARANGAYS_DATA.map(b => (
                  <option key={b.name} value={b.name}>Brgy. {b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Purpose Filter */}
          <div>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
            >
              <option value="">All Farming Purposes</option>
              {PURPOSES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Health Status Filter */}
          <div>
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value as any)}
              className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
            >
              <option value="all">All Health / ASF Status</option>
              <option value="vax">Vaccinated / Dewormed Only</option>
              <option value="unvax">Pending Vaccination</option>
            </select>
          </div>

        </div>
      </div>

      {/* REGISTRY TABLE */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FBF8EF] border-b border-[#DED2AE] flex items-center justify-between text-xs">
          <span className="font-mono text-[#55604F]">
            Showing <b>{filteredPigs.length}</b> of <b>{pigs.length}</b> records
          </span>
          <span className="font-mono text-[11px] text-[#55604F]">
            Official Municipal Swine Registry
          </span>
        </div>

        {filteredPigs.length === 0 ? (
          <div className="p-12 text-center text-[#55604F] space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-[#D9A441] opacity-60" />
            <div className="font-serif text-lg text-[#203F2B]">No Matching Records Found</div>
            <p className="text-xs max-w-sm mx-auto">
              Try adjusting your search terms or filters, or add a new swine registration.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#F5EFDD]/70 text-[#55604F] font-mono uppercase text-[11px] border-b border-[#DED2AE]">
                  <th className="py-3 px-4">Ear Tag</th>
                  <th className="py-3 px-4">Owner & Address</th>
                  {isAdmin && <th className="py-3 px-4">Barangay</th>}
                  <th className="py-3 px-4">Breed & Sex</th>
                  <th className="py-3 px-4">Age / Weight</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Biosecurity &amp; Health</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1C4]">
                {filteredPigs.map(pig => {
                  const bio = pig.biosecurity;
                  const bioScore = bio ? Object.values(bio).filter(Boolean).length : (pig.asfCleared ? 5 : 3);

                  return (
                    <tr key={pig.id} className="hover:bg-[#FBF8EF] transition-colors">
                      
                      {/* Ear Tag */}
                      <td className="py-3 px-4 font-mono font-bold text-[#203F2B]">
                        <div className="bg-[#F5EFDD] border border-[#DED2AE] px-2 py-1 rounded inline-block text-[11px]">
                          {pig.earTag}
                        </div>
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

                      {/* Purpose Badge */}
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white inline-block shadow-2xs"
                          style={{ background: PURPOSE_COLORS[pig.purpose] || '#2F5C3F' }}
                        >
                          {pig.purpose}
                        </span>
                      </td>

                      {/* Biosecurity & Vaccination */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className={`inline-flex items-center gap-1 font-semibold text-[11px] ${pig.vaccinated ? 'text-emerald-700' : 'text-amber-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pig.vaccinated ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                            {pig.vaccinated ? 'Vaccinated' : 'Pending Vax'}
                          </div>

                          {/* Biosecurity Assessment Score Badge */}
                          <div className="flex items-center gap-1">
                            <span 
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border flex items-center gap-1 ${
                                bioScore >= 6 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : bioScore >= 4 
                                  ? 'bg-[#F5EFDD] text-[#2F5C3F] border-[#DED2AE]' 
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                              title={bio ? `Footbath: ${bio.footbathMaintenance ? 'YES' : 'NO'} | Fencing: ${bio.fencingIntegrity ? 'YES' : 'NO'} | Zero-swill: ${bio.swillFeedingBanned ? 'YES' : 'NO'} | Disinfection: ${bio.disinfectionRoutine ? 'YES' : 'NO'} | Visitor Control: ${bio.visitorLogControl ? 'YES' : 'NO'} | Isolation Pen: ${bio.quarantineIsolationPen ? 'YES' : 'NO'} | Clean Water: ${bio.cleanWaterSource ? 'YES' : 'NO'}` : 'Standard Biosecurity'}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{bioScore}/7 Biosecure</span>
                            </span>
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
                              onClick={() => onViewOnMap(pig.id)}
                              className="p-1.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#2F5C3F] border border-[#DED2AE] rounded-lg transition-colors cursor-pointer"
                              title="View on GIS Map"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#2F5C3F]" />
                            </button>
                          )}

                          <button
                            onClick={() => onEditPig(pig)}
                            className="p-1.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border border-[#DED2AE] rounded-lg transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#55604F]" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => onDeletePig(pig.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

    </div>
  );
};
