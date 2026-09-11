import React from 'react';
import { motion } from 'motion/react';
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
  Map as MapIcon,
  Database,
  CloudCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { BARANGAYS_DATA, PURPOSE_COLORS, PURPOSES } from '../data/constants';
import { AppViewMode, PigRecord, User } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { DemographicsDistributionChart } from './DemographicsDistributionChart';
import { 
  calculateBiosecurityScore, 
  determineAsfRiskLevel, 
  evaluatePcicEligibility 
} from '../config/systemLogic';

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
  const { t } = useI18n();
  const isAdmin = currentUser.role === 'admin';
  const scopedPigs = isAdmin
    ? (pigs || [])
    : (pigs || []).filter(p => p.barangay === currentUser.barangay);

  const totalHeads = scopedPigs.length;
  const totalAnimalCount = scopedPigs.reduce((sum, p) => sum + (p.headCount || 1), 0);
  const backyardCount = scopedPigs.filter(p => p.purpose === 'Backyard Raising').length;
  const vaccinatedCount = scopedPigs.filter(p => p.vaccinated).length;
  const deceasedCount = scopedPigs.filter(p => p.isDeceased).length;
  const vaxPercentage = totalHeads > 0 ? Math.round((vaccinatedCount / totalHeads) * 100) : 0;
  
  const avgWeight = totalHeads > 0 
    ? (scopedPigs.reduce((sum, p) => sum + Number(p.weight), 0) / totalHeads).toFixed(1)
    : '0';

  const coveredBrgyCount = new Set(scopedPigs.map(p => p.barangay)).size;

  // Schema-driven intelligence calculations
  const pcicEligibleCount = scopedPigs.filter(p => evaluatePcicEligibility(p).isEligible).length;
  const pcicEligiblePct = totalHeads > 0 ? Math.round((pcicEligibleCount / totalHeads) * 100) : 0;

  const asfRiskCounts = { GREEN: 0, YELLOW: 0, PINK: 0, RED: 0 };
  let totalBiosecurityScore = 0;
  scopedPigs.forEach(p => {
    const risk = determineAsfRiskLevel(p);
    asfRiskCounts[risk.code] = (asfRiskCounts[risk.code] || 0) + 1;
    totalBiosecurityScore += calculateBiosecurityScore(p.biosecurity).score;
  });
  const avgBioScore = totalHeads > 0 ? (totalBiosecurityScore / totalHeads).toFixed(1) : '7.0';

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

  // Health Status Classification breakdown for Infographic
  const healthyCount = scopedPigs.filter(p => !p.isDeceased && p.vaccinated).length;
  const suspectCount = scopedPigs.filter(p => !p.isDeceased && !p.vaccinated).length;
  const quarantinedCount = scopedPigs.filter(p => p.isDeceased).length;
  const healthyPct = totalHeads > 0 ? Math.round((healthyCount / totalHeads) * 100) : 0;
  const suspectPct = totalHeads > 0 ? Math.round((suspectCount / totalHeads) * 100) : 0;
  const quarantinedPct = totalHeads > 0 ? Math.round((quarantinedCount / totalHeads) * 100) : 0;

  // Generate mathematically accurate 30-day daily trend data
  const trendData = React.useMemo(() => {
    const data = [];
    const today = new Date("2026-09-10"); // Grounded local anchor date
    
    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const targetTimeStr = targetDate.toISOString().split('T')[0];
      
      // Filter records registered on or before this day
      const registeredByDay = scopedPigs.filter(p => {
        const regDate = new Date(p.dateRegistered);
        return regDate <= targetDate;
      });
      
      let healthy = 0;
      let pending = 0;
      let deceased = 0;
      
      registeredByDay.forEach(p => {
        const isDeadOnThisDay = p.isDeceased && p.mortalityDate && new Date(p.mortalityDate) <= targetDate;
        if (isDeadOnThisDay) {
          deceased++;
        } else if (p.vaccinated) {
          healthy++;
        } else {
          pending++;
        }
      });
      
      data.push({
        dateLabel: targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        'Healthy / Vaccinated': healthy,
        'Pending / Suspect': pending,
        'Quarantined / Deceased': deceased,
      });
    }
    return data;
  }, [scopedPigs]);

  return (
    <div className="space-y-6">
      
      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-[#203F2B] via-[#2F5C3F] to-[#203F2B] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#D9A441] text-[#203F2B] text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                {isAdmin ? 'Central Office Registry' : `Barangay ${currentUser.barangay} Sector`}
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-700/80 text-emerald-100 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                <Database className="w-3 h-3 text-emerald-300" />
                <span>Supabase PostgreSQL Active</span>
              </span>
              <span className="text-xs text-[#C9D6C9] font-mono hidden sm:inline">
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
              <span>{t('dashboard.openGisMap')}</span>
            </button>

            <button
              onClick={() => onNavigate('records')}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span>{t('dashboard.viewAllRecords')}</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('dashboard.registerNewSwine')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MORTALITY & OUTBREAK SURVEILLANCE BANNER */}
      {deceasedCount > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-200 text-rose-900 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-700 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm text-rose-950 flex items-center gap-2">
                <span>{deceasedCount} Swine Mortality Event(s) Reported</span>
                <span className="bg-rose-200 text-rose-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-rose-300">
                  BIOSECURITY ALERT
                </span>
              </div>
              <p className="text-rose-800 text-[11px] mt-0.5">
                Outbreak surveillance active. Review recorded swine deaths for potential ASF vectors &amp; quarantine protocols.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('records')}
            className="flex items-center gap-1.5 bg-rose-800 hover:bg-rose-900 text-white px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <span>Inspect Mortality Records</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{t('dashboard.totalSwine')}</span>
            <PiggyBank className="w-5 h-5 text-[#2F5C3F]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B] transition-colors duration-300">
            {totalHeads}
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            Active swine heads on record
          </p>
        </div>

        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{t('dashboard.barangaysCovered')}</span>
            <Building2 className="w-5 h-5 text-[#D9A441]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B] transition-colors duration-300">
            {isAdmin ? `${coveredBrgyCount} / 40` : '1 / 1'}
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            {isAdmin ? 'Barangays with registered farms' : `Barangay ${currentUser.barangay}`}
          </p>
        </div>

        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{t('dashboard.vaccinatedRatio')}</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B] transition-colors duration-300">
            {vaxPercentage}%
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            {vaccinatedCount} of {totalHeads} heads cleared
          </p>
        </div>

        <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between text-[#55604F] mb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{t('dashboard.averageWeight')}</span>
            <Scale className="w-5 h-5 text-blue-600" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B] transition-colors duration-300">
            {avgWeight}<span className="text-xl text-[#55604F] font-sans font-normal ml-1">kg</span>
          </div>
          <p className="text-xs text-[#55604F] mt-1">
            Across registered herd
          </p>
        </div>

      </div>

      {/* HEALTH STATUS DISTRIBUTION INFOGRAPHIC WIDGET */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2F5C3F]" />
              <span>Municipal Swine Health Status Distribution</span>
            </h3>
            <p className="text-xs text-[#55604F]">Live biosecurity categorization across Healthy, Suspect/Pending, and Quarantined/Deceased records</p>
          </div>
          <span className="font-mono text-xs font-semibold bg-[#F5EFDD] text-[#203F2B] px-3 py-1 rounded-xl border border-[#DED2AE] self-start sm:self-auto">
            {totalHeads} Head Census
          </span>
        </div>

        {/* Visual Multi-Segment Proportion Bar with motion layout animations */}
        <div className="w-full h-4 bg-[#F5EFDD] rounded-full overflow-hidden flex shadow-inner mb-5">
          <motion.div 
            className="h-full bg-emerald-600 hover:opacity-90" 
            initial={{ width: 0 }}
            animate={{ width: `${healthyPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            title={`Healthy / Vaccinated: ${healthyCount} (${healthyPct}%)`}
          />
          <motion.div 
            className="h-full bg-amber-500 hover:opacity-90" 
            initial={{ width: 0 }}
            animate={{ width: `${suspectPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            title={`Suspect / Pending Vax: ${suspectCount} (${suspectPct}%)`}
          />
          <motion.div 
            className="h-full bg-rose-700 hover:opacity-90" 
            initial={{ width: 0 }}
            animate={{ width: `${quarantinedPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            title={`Quarantined / Deceased: ${quarantinedCount} (${quarantinedPct}%)`}
          />
        </div>

        {/* Breakdown Legend Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">Healthy &amp; Vaccinated</span>
                <span className="text-[11px] text-emerald-800">Protected &amp; Cleared</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-serif text-lg font-bold text-emerald-900">{healthyCount}</span>
              <span className="text-xs font-mono text-emerald-700 block">({healthyPct}%)</span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-950 block">Suspect / Pending Vax</span>
                <span className="text-[11px] text-amber-800">Surveillance required</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-serif text-lg font-bold text-amber-900">{suspectCount}</span>
              <span className="text-xs font-mono text-amber-700 block">({suspectPct}%)</span>
            </div>
          </div>

          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-rose-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-rose-950 block">Quarantined / Deceased</span>
                <span className="text-[11px] text-rose-800">Mortality / ASF Vector</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-serif text-lg font-bold text-rose-900">{quarantinedCount}</span>
              <span className="text-xs font-mono text-rose-700 block">({quarantinedPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ASF BIOSECURITY PROTOCOL & PCIC INSURANCE INTELLIGENCE WIDGET */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2F5C3F]" />
              <span>ASF Biosecurity Zonation &amp; Insurance Protection</span>
            </h3>
            <p className="text-xs text-[#55604F]">
              Official DA-BAI Administrative Circular 02 evaluation and Philippine Crop Insurance Corporation (PCIC) coverage index.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-[#F5EFDD] text-[#203F2B] px-3 py-1 rounded-xl border border-[#DED2AE]">
              Avg Biosecurity: {avgBioScore}/7.0
            </span>
          </div>
        </div>

        {/* 4-Zone Matrix & PCIC Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Green Zone */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800">🟢 Green Zone</span>
              <span className="text-xs font-mono font-bold text-emerald-900">{asfRiskCounts.GREEN}</span>
            </div>
            <p className="text-[11px] text-emerald-900 font-semibold">Free &amp; Protected</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Compliant &ge;5/7, vaccinated</p>
          </div>

          {/* Yellow Zone */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800">🟡 Yellow Zone</span>
              <span className="text-xs font-mono font-bold text-amber-900">{asfRiskCounts.YELLOW}</span>
            </div>
            <p className="text-[11px] text-amber-900 font-semibold">Surveillance Zone</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Unvaccinated or borderline</p>
          </div>

          {/* Pink Zone */}
          <div className="p-3 bg-pink-50/80 border border-pink-200 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase text-pink-800">🌸 Pink Zone</span>
              <span className="text-xs font-mono font-bold text-pink-900">{asfRiskCounts.PINK}</span>
            </div>
            <p className="text-[11px] text-pink-900 font-semibold">Buffer / Deficit</p>
            <p className="text-[10px] text-pink-700 mt-0.5">Score &le;3/7 protocols missing</p>
          </div>

          {/* Red Zone */}
          <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase text-rose-800">🔴 Red Zone</span>
              <span className="text-xs font-mono font-bold text-rose-900">{asfRiskCounts.RED}</span>
            </div>
            <p className="text-[11px] text-rose-900 font-semibold">Infected / High Risk</p>
            <p className="text-[10px] text-rose-700 mt-0.5">Deceased or swill-feeding</p>
          </div>

          {/* PCIC Free Insurance Card */}
          <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase text-teal-800">🛡️ PCIC Qualified</span>
              <span className="text-xs font-mono font-bold text-teal-900">{pcicEligibleCount} ({pcicEligiblePct}%)</span>
            </div>
            <p className="text-[11px] text-teal-900 font-semibold">Govt Indemnity Ready</p>
            <p className="text-[10px] text-teal-700 mt-0.5">Under cap &amp; zero swill</p>
          </div>
        </div>
      </div>

      {/* SWINE DEMOGRAPHICS & RESOURCE ALLOCATION (RECHARTS DISTRIBUTION CHARTS) */}
      <DemographicsDistributionChart 
        pigs={scopedPigs}
        isAdmin={isAdmin}
        selectedBarangayName={currentUser.barangay}
      />

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

      {/* 30-DAY HISTORICAL SWINE HEALTH STATUS TRENDS */}
      <div className="bg-white border border-[#DED2AE] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2F5C3F]" />
              <span>30-Day Swine Health &amp; Surveillance Timeline</span>
            </h3>
            <p className="text-xs text-[#55604F]">
              {isAdmin 
                ? "Chronological 30-day overview of vaccination progress and mortality vectors across all 40 barangays." 
                : `Chronological 30-day overview of vaccination progress and mortality vectors in Barangay ${currentUser.barangay}.`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-[#F5EFDD] text-[#203F2B] border border-[#DED2AE] rounded-xl px-3 py-1.5 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Last 30 Days Trend Analysis</span>
          </div>
        </div>

        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorHealthy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorDeceased" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#be123c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#be123c" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE1C4" opacity={0.6} />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#DED2AE"
              />
              <YAxis 
                tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#DED2AE"
                allowDecimals={false}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[#DED2AE] p-3 rounded-xl shadow-lg font-sans text-xs space-y-1.5">
                        <p className="font-mono font-bold text-[#203F2B] border-b border-[#EAE1C4] pb-1 mb-1">{label}</p>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-1.5 text-[#55604F]">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span className="font-mono font-bold text-[#203F2B]">{entry.value} head(s)</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', color: '#1E2B1F' }}
              />
              <Area 
                type="monotone" 
                dataKey="Healthy / Vaccinated" 
                stackId="1"
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorHealthy)" 
              />
              <Area 
                type="monotone" 
                dataKey="Pending / Suspect" 
                stackId="1"
                stroke="#f59e0b" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPending)" 
              />
              <Area 
                type="monotone" 
                dataKey="Quarantined / Deceased" 
                stackId="1"
                stroke="#be123c" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorDeceased)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3 border-t border-[#EAE1C4] flex items-center justify-between text-[11px] text-[#55604F] font-mono">
          <span>* Trend accounts for date of registration and recorded mortality event timeline.</span>
          <span className="hidden sm:inline">Hinunangan Municipal Agriculture Office · Surveillance Active</span>
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
              {recentPigs.map(pig => {
                const bioEval = calculateBiosecurityScore(pig.biosecurity);
                const asfRisk = determineAsfRiskLevel(pig);
                const pcicEval = evaluatePcicEligibility(pig);
                const headCount = pig.headCount || 1;

                return (
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
                      <div className="space-y-0.5">
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white inline-block"
                          style={{ background: PURPOSE_COLORS[pig.purpose] || '#2F5C3F' }}
                        >
                          {pig.purpose}
                        </span>
                        <div className="text-[10px] font-mono text-[#55604F]">
                          {headCount} {headCount > 1 ? 'heads' : 'head'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${pig.vaccinated ? 'text-emerald-700' : 'text-amber-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pig.vaccinated ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                            {pig.vaccinated ? 'Vaccinated' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span 
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                              asfRisk.code === 'GREEN' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              asfRisk.code === 'YELLOW' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              asfRisk.code === 'PINK' ? 'bg-pink-50 text-pink-800 border-pink-300' :
                              'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {asfRisk.level}
                          </span>
                          <span className="text-[9px] font-mono px-1 bg-[#F5EFDD] border border-[#DED2AE] text-[#203F2B] rounded">
                            {bioEval.score}/7
                          </span>
                          {pcicEval.isEligible && (
                            <span className="text-[9px] px-1 bg-teal-50 text-teal-800 border border-teal-300 rounded font-bold">
                              PCIC ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#55604F]">
                      {pig.dateRegistered}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
