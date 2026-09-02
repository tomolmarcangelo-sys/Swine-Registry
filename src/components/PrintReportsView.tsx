import React, { useState } from 'react';
import { Printer, FileText, Download, Check, MapPin, ShieldCheck, Building2 } from 'lucide-react';
import { BARANGAYS_DATA } from '../data/constants';
import { PigRecord, User } from '../types';

interface PrintReportsViewProps {
  pigs: PigRecord[];
  currentUser: User;
}

export const PrintReportsView: React.FC<PrintReportsViewProps> = ({
  pigs = [],
  currentUser
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [selectedBarangay, setSelectedBarangay] = useState(
    isAdmin ? '' : currentUser.barangay || ''
  );
  const [reportType, setReportType] = useState<'census' | 'asf' | 'vaccination'>('census');

  const scopedPigs = (pigs || []).filter(p => {
    if (!isAdmin && currentUser.barangay && p.barangay !== currentUser.barangay) {
      return false;
    }
    if (selectedBarangay && p.barangay !== selectedBarangay) return false;
    if (reportType === 'asf' && !p.asfCleared) return false;
    if (reportType === 'vaccination' && !p.vaccinated) return false;
    return true;
  }).sort((a, b) => a.barangay.localeCompare(b.barangay) || a.ownerName.localeCompare(b.ownerName));

  const totalCount = scopedPigs.length;
  const backyardCount = scopedPigs.filter(p => p.purpose === 'Backyard Raising').length;
  const breedingCount = scopedPigs.filter(p => p.purpose === 'Breeding Stock').length;
  const commercialCount = scopedPigs.filter(p => p.purpose === 'Fattening/Commercial').length;
  const piggeryCount = scopedPigs.filter(p => p.purpose === 'Piggery').length;
  const vaxCount = scopedPigs.filter(p => p.vaccinated).length;

  const handlePrint = () => {
    window.print();
  };

  const scopeLabel = selectedBarangay ? `Barangay ${selectedBarangay}` : 'All 40 Barangays (Municipal Scope)';
  const todayFormatted = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER & PRINT CONTROLS (HIDDEN DURING PRINT) */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#203F2B]">
              Generate Official Municipal Livestock Report
            </h2>
            <p className="text-xs text-[#55604F]">
              Formatted for print and submission to the Municipal Agriculturist & Provincial Veterinary Office.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report</span>
          </button>
        </div>

        {/* CONTROLS */}
        <div className="mt-4 pt-4 border-t border-[#EAE1C4] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {isAdmin && (
            <div>
              <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                Report Scope (Barangay)
              </label>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
              >
                <option value="">All 40 Barangays (Full Municipality)</option>
                {BARANGAYS_DATA.map(b => (
                  <option key={b.name} value={b.name}>Brgy. {b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none"
            >
              <option value="census">General Swine Census & GIS Registry</option>
              <option value="asf">ASF Biosecurity & Surveillance Log</option>
              <option value="vaccination">Vaccination & Deworming Completed Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINTABLE DOCUMENT CANVAS */}
      <div id="printable-report-canvas" className="bg-white border border-[#DED2AE] rounded-2xl p-8 sm:p-12 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-full text-[#1E2B1F]">
        
        {/* DOCUMENT HEADER */}
        <div className="text-center pb-6 mb-6 border-b-2 border-[#1E2B1F] space-y-1">
          <div className="text-xs uppercase tracking-widest text-[#55604F]">Republic of the Philippines</div>
          <div className="text-xs font-semibold uppercase text-[#55604F]">Province of Southern Leyte</div>
          <div className="font-serif text-lg sm:text-xl font-bold uppercase text-[#203F2B] tracking-wide">
            Municipality of Hinunangan
          </div>
          <div className="text-xs font-bold text-[#2F5C3F] uppercase tracking-wider">
            Office of the Municipal Agriculturist · Livestock Division
          </div>

          <div className="pt-4">
            <h1 className="font-serif text-xl sm:text-2xl font-black text-[#1E2B1F] uppercase tracking-tight">
              {reportType === 'asf' 
                ? 'African Swine Fever (ASF) Biosecurity & Surveillance Registry' 
                : reportType === 'vaccination'
                ? 'Municipal Livestock Vaccination & Health Record Log'
                : 'Official Swine Registration & GIS Location Census'}
            </h1>
            <p className="text-xs text-[#55604F] mt-1 font-mono">
              Scope: <b>{scopeLabel}</b> · Generated on {todayFormatted}
            </p>
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs bg-[#FBF8EF] border border-[#DED2AE] rounded-xl p-3 mb-6">
          <div className="p-1">
            <span className="text-[10px] text-[#55604F] uppercase block">Total Heads</span>
            <span className="font-mono font-bold text-sm text-[#203F2B]">{totalCount}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-[#55604F] uppercase block">Backyard</span>
            <span className="font-mono font-bold text-sm text-[#203F2B]">{backyardCount}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-[#55604F] uppercase block">Breeding</span>
            <span className="font-mono font-bold text-sm text-[#203F2B]">{breedingCount}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-[#55604F] uppercase block">Commercial</span>
            <span className="font-mono font-bold text-sm text-[#203F2B]">{commercialCount}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-[#55604F] uppercase block">Piggery</span>
            <span className="font-mono font-bold text-sm text-[#203F2B]">{piggeryCount}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-[#55604F] uppercase block">Vaccinated</span>
            <span className="font-mono font-bold text-sm text-emerald-800">{vaxCount}</span>
          </div>
        </div>

        {/* RECORDS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse text-left">
            <thead>
              <tr className="bg-[#EFE6C6] text-[#1E2B1F] uppercase font-bold border border-[#DED2AE]">
                <th className="p-2 border border-[#DED2AE]">Ear Tag</th>
                <th className="p-2 border border-[#DED2AE]">Owner Name</th>
                <th className="p-2 border border-[#DED2AE]">Barangay / Address</th>
                <th className="p-2 border border-[#DED2AE]">Breed & Sex</th>
                <th className="p-2 border border-[#DED2AE]">Weight (kg)</th>
                <th className="p-2 border border-[#DED2AE]">Purpose</th>
                <th className="p-2 border border-[#DED2AE]">Date Reg.</th>
                <th className="p-2 border border-[#DED2AE]">GPS Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {scopedPigs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#55604F] border border-[#DED2AE]">
                    No registrations on record for the selected scope.
                  </td>
                </tr>
              ) : (
                scopedPigs.map((pig, idx) => (
                  <tr key={pig.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FBF8EF]/60'}>
                    <td className="p-2 border border-[#DED2AE] font-mono font-bold">
                      {pig.earTag}
                    </td>
                    <td className="p-2 border border-[#DED2AE] font-semibold">
                      {pig.ownerName}
                    </td>
                    <td className="p-2 border border-[#DED2AE]">
                      {pig.barangay} - <span className="text-[10px] text-[#55604F]">{pig.address}</span>
                    </td>
                    <td className="p-2 border border-[#DED2AE]">
                      {pig.breed} ({pig.sex.slice(0, 1)})
                    </td>
                    <td className="p-2 border border-[#DED2AE] font-mono">
                      {pig.weight}
                    </td>
                    <td className="p-2 border border-[#DED2AE]">
                      {pig.purpose}
                    </td>
                    <td className="p-2 border border-[#DED2AE] font-mono">
                      {pig.dateRegistered}
                    </td>
                    <td className="p-2 border border-[#DED2AE] font-mono text-[10px]">
                      {pig.lat.toFixed(4)}°, {pig.lng.toFixed(4)}°
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SIGNATURE BLOCKS */}
        <div className="mt-16 pt-8 flex justify-between items-end gap-8 text-xs">
          <div className="text-center space-y-1">
            <div className="w-56 border-b border-[#1E2B1F] pb-1 font-bold">
              {currentUser.fullName}
            </div>
            <div className="text-[11px] text-[#55604F]">
              Prepared by: {currentUser.role === 'admin' ? 'Central Livestock Coordinator' : `Agri Focal Person (Brgy. ${currentUser.barangay})`}
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="w-56 border-b border-[#1E2B1F] pb-1 font-bold">
              Municipal Agriculturist
            </div>
            <div className="text-[11px] text-[#55604F]">
              Noted & Certified: LGU Hinunangan DA Office
            </div>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div className="mt-12 pt-4 border-t border-[#EAE1C4] text-[10px] text-[#55604F] flex justify-between">
          <span>Hinunangan Municipal Agriculture Office · GIS Swine Monitoring System</span>
          <span>Official LGU Document · Confidential</span>
        </div>

      </div>

    </div>
  );
};
