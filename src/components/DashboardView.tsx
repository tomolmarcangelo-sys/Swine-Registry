import React from 'react';
import { 
  PiggyBank, 
  MapPin, 
  Calendar, 
  Scale, 
  ShieldCheck, 
  Plus, 
  ArrowRight, 
  Activity, 
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Building2,
  Map as MapIcon
} from 'lucide-react';
import { BARANGAYS_DATA, PURPOSE_COLORS, PURPOSES } from '../data/constants';
import { AppViewMode, PigRecord, User } from '../types';

interface DashboardViewProps {
  pigs: PigRecord[];
  currentUser: User;
  onNavigate: (view: AppViewMode) => void;
  onOpenAddModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pigs = [],
  currentUser,
  onNavigate,
  onOpenAddModal
}) => {
  const isAdmin = currentUser.role === 'admin';
  const scopedPigs = isAdmin
    ? (pigs || [])
    : (pigs || []).filter(p => p.barangay === currentUser.barangay);

  const totalHeads = scopedPigs.length;
  const backyardCount = scopedPigs.filter(p => p.purpose === 'Backyard Raising').length;
  const vaccinatedCount = scopedPigs.filter(p => p.vaccinated).length;
  const vaxPercentage = totalHeads > 0 ? Math.round((vaccinatedCount / totalHeads) * 100) : 0;
  
  const avgWeight = totalHeads > 0 
    ? (scopedPigs.reduce((sum, p) => sum + Number(p.weight), 0) / totalHeads).toFixed(1)
    : '0';

  const coveredBrgyCount = new Set(scopedPigs.map(p => p.barangay)).size;

  // Purpose breakdown
  const purposeCounts: Record<string, number> = {};
  PURPOSES.forEach(p => { purposeCounts[p] = 0; });
  scopedPigs.forEach(p => {
    purposeCounts[p.purpose] = (purposeCounts[p.purpose] || 0) + 1;
  });

  // Top Barangays by Registration Count (Admin view)
  const brgyCounts: Record<string, number> = {};
  scopedPigs.forEach(p => {
    brgyCounts[p.barangay] = (brgyCounts[p.barangay] || 0) + 1;
  });
  const sortedBrgy = Object.entries(brgyCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recentPigs = [...scopedPigs]
    .sort((a, b) => new Date(b.dateRegistered).getTime() - new Date(a.dateRegistered).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      
      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-[#203F2B] via-[#2F5C3F] to-[#203F2B] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-[#D9A441] text-[#203F2B] text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {isAdmin ? 'Central Office Registry' : `Barangay ${currentUser.barangay} Sector`}
              </span>
              <span className="text-xs text-[#C9D6C9] font-mono">
                LGU Hinunangan DA
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Swine Registry & Livestock Records
            </h1>

            <p className="text-sm text-[#C9D6C9] max-w-xl">
              Official livestock census, biosecurity status, and herd management across Hinunangan's 40 barangays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('gis')}
              className="flex items-center gap-2 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
              <span>Open GIS Swine Map</span>
            </button>

            <button
              onClick={() => onNavigate('records')}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span>View All Records</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Registration</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Total Registered</span>
            <PiggyBank className="w-5 h-5 text-[#2F5C3F]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B]">
            {totalHeads}
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            Active swine heads on record
          </p>
        </div>

        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Barangay Scope</span>
            <Building2 className="w-5 h-5 text-[#D9A441]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B]">
            {isAdmin ? `${coveredBrgyCount} / 40` : '1 / 1'}
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            {isAdmin ? 'Barangays with registered farms' : `Barangay ${currentUser.barangay}`}
          </p>
        </div>

        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Vaccinated / Monitored</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B]">
            {vaxPercentage}%
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            {vaccinatedCount} of {totalHeads} heads cleared
          </p>
        </div>

        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Average Weight</span>
            <Scale className="w-5 h-5 text-blue-600" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B]">
            {avgWeight}<span className="text-xl text-[#55604F] font-sans font-normal ml-1">kg</span>
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            Across registered herd
          </p>
        </div>

      </div>

      {/* CHARTS & DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Purpose Distribution Bar List */}
        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#203F2B]">Herd Purpose Classification</h3>
              <p className="text-xs text-[#55604F]">Distribution of swine based on farming type</p>
            </div>
            <span className="font-mono text-xs font-semibold bg-[#F5EFDD] text-[#203F2B] px-2.5 py-1 rounded-lg border border-[#DED2AE]">
              {totalHeads} Total
            </span>
          </div>

          <div className="space-y-3.5">
            {PURPOSES.map(purp => {
              const count = purposeCounts[purp] || 0;
              const pct = totalHeads > 0 ? (count / totalHeads) * 100 : 0;
              const color = PURPOSE_COLORS[purp] || '#2F5C3F';

              return (
                <div key={purp} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1E2B1F] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      {purp}
                    </span>
                    <span className="font-mono font-bold text-[#55604F]">
                      {count} heads ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F5EFDD] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-[#EAE1C4] flex items-center justify-between text-xs">
            <span className="text-[#55604F]">
              Manage all {totalHeads} records in the municipal database.
            </span>
            <button
              onClick={() => onNavigate('records')}
              className="text-[#2F5C3F] font-bold hover:underline flex items-center gap-1"
            >
              <span>Go to Records Database</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Top Barangays / Focal Person Sector */}
        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-1">
              {isAdmin ? 'Top Agricultural Sectors' : `Sector Overview`}
            </h3>
            <p className="text-xs text-[#55604F] mb-4">
              {isAdmin ? 'Barangays with highest swine density' : `Field status for Brgy. ${currentUser.barangay}`}
            </p>

            {isAdmin ? (
              <div className="space-y-2.5">
                {sortedBrgy.map(([bName, count], idx) => (
                  <div key={bName} className="flex items-center justify-between p-2 rounded-xl bg-[#FBF8EF] border border-[#EAE1C4] text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#55604F] w-4">{idx + 1}.</span>
                      <span className="font-semibold text-[#1E2B1F]">Brgy. {bName}</span>
                    </div>
                    <span className="font-mono font-bold text-[#2F5C3F] bg-[#DDEFE1] px-2 py-0.5 rounded-full">
                      {count} heads
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-xs bg-[#FBF8EF] p-4 rounded-xl border border-[#EAE1C4]">
                <div>
                  <span className="text-[#55604F] block">Designated Barangay:</span>
                  <span className="font-bold text-sm text-[#203F2B]">Barangay {currentUser.barangay}</span>
                </div>
                <div>
                  <span className="text-[#55604F] block">Assigned Focal Person:</span>
                  <span className="font-semibold text-[#1E2B1F]">{currentUser.fullName}</span>
                </div>
                <div>
                  <span className="text-[#55604F] block">Total Registered Heads:</span>
                  <span className="font-mono font-bold text-emerald-800">{totalHeads} live heads</span>
                </div>
                <div>
                  <span className="text-[#55604F] block">Vaccination Rate:</span>
                  <span className="font-mono font-bold text-emerald-800">{vaxPercentage}% cleared</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAE1C4]">
            <button
              onClick={() => onNavigate('records')}
              className="w-full py-2 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View All Records Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* RECENT REGISTRATIONS TABLE */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B]">Recent Swine Registrations</h3>
            <p className="text-xs text-[#55604F]">Latest logged records in the municipal database</p>
          </div>
          <button
            onClick={() => onNavigate('records')}
            className="text-xs font-bold text-[#2F5C3F] hover:underline flex items-center gap-1"
          >
            <span>View Full Registry ({totalHeads})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#FBF8EF] text-[#55604F] font-mono uppercase text-[11px] border-b border-[#DED2AE]">
                <th className="py-2.5 px-3">Ear Tag</th>
                <th className="py-2.5 px-3">Owner / Address</th>
                {isAdmin && <th className="py-2.5 px-3">Barangay</th>}
                <th className="py-2.5 px-3">Breed</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Purpose</th>
                <th className="py-2.5 px-3">Health / ASF</th>
                <th className="py-2.5 px-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1C4]">
              {recentPigs.map(pig => (
                <tr key={pig.id} className="hover:bg-[#FBF8EF]/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#203F2B]">
                    {pig.earTag}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#1E2B1F]">{pig.ownerName}</div>
                    <div className="text-[11px] text-[#55604F] truncate max-w-[200px]">{pig.address}</div>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 font-medium">
                      Brgy. {pig.barangay}
                    </td>
                  )}
                  <td className="py-3 px-3">
                    {pig.breed} ({pig.sex})
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {pig.weight} kg
                  </td>
                  <td className="py-3 px-3">
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ background: PURPOSE_COLORS[pig.purpose] || '#2F5C3F' }}
                    >
                      {pig.purpose}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${pig.vaccinated ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pig.vaccinated ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                      {pig.vaccinated ? 'Vaccinated' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#55604F]">
                    {pig.dateRegistered}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
