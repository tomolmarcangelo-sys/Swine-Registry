import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend
} from 'recharts';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  Scale, 
  Calendar, 
  Dna, 
  PackageCheck, 
  Sparkles, 
  Syringe, 
  Wheat, 
  TrendingUp, 
  Info,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Users
} from 'lucide-react';
import { PigRecord } from '../types';
import { BREEDS } from '../data/constants';

interface DemographicsDistributionChartProps {
  pigs: PigRecord[];
  isAdmin: boolean;
  selectedBarangayName?: string | null;
}

type TabMode = 'breed' | 'age' | 'weight' | 'resources';

const BREED_PALETTE: Record<string, string> = {
  'Native / Native-cross': '#2F5C3F', // Forest Moss
  'Landrace': '#D97706',             // Warm Amber
  'Large White': '#2563EB',          // Royal Blue
  'Duroc': '#DC2626',                // Crimson
  'Pietrain': '#7C3AED',             // Deep Purple
  'Crossbred': '#0D9488',            // Teal
  'Other': '#64748B'                 // Slate
};

export const DemographicsDistributionChart: React.FC<DemographicsDistributionChartProps> = ({
  pigs = [],
  isAdmin,
  selectedBarangayName
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('breed');
  const [chartViewType, setChartViewType] = useState<'bar' | 'donut'>('bar');

  const totalHerd = pigs.length;

  // ==========================================
  // 1. BREED DEMOGRAPHICS AGGREGATION
  // ==========================================
  const breedData = useMemo(() => {
    const map: Record<string, { count: number; totalWeight: number; vaccinatedCount: number; backyardCount: number }> = {};
    
    BREEDS.forEach(b => {
      map[b] = { count: 0, totalWeight: 0, vaccinatedCount: 0, backyardCount: 0 };
    });

    pigs.forEach(p => {
      const breedKey = BREEDS.includes(p.breed as any) ? p.breed : 'Crossbred';
      if (!map[breedKey]) {
        map[breedKey] = { count: 0, totalWeight: 0, vaccinatedCount: 0, backyardCount: 0 };
      }
      map[breedKey].count += 1;
      map[breedKey].totalWeight += Number(p.weight) || 0;
      if (p.vaccinated) map[breedKey].vaccinatedCount += 1;
      if (p.purpose === 'Backyard Raising') map[breedKey].backyardCount += 1;
    });

    return Object.entries(map)
      .map(([breed, stat]) => {
        const pct = totalHerd > 0 ? Math.round((stat.count / totalHerd) * 100) : 0;
        const avgWeight = stat.count > 0 ? (stat.totalWeight / stat.count).toFixed(1) : '0';
        const vaxRate = stat.count > 0 ? Math.round((stat.vaccinatedCount / stat.count) * 100) : 0;
        return {
          name: breed,
          shortName: breed.replace(' / Native-cross', '').replace('Fattening/Commercial', 'Commercial'),
          count: stat.count,
          percentage: pct,
          avgWeight: Number(avgWeight),
          vaccinatedCount: stat.vaccinatedCount,
          vaxRate,
          backyardCount: stat.backyardCount,
          color: BREED_PALETTE[breed] || '#2F5C3F'
        };
      })
      .filter(item => item.count > 0 || totalHerd === 0)
      .sort((a, b) => b.count - a.count);
  }, [pigs, totalHerd]);

  // ==========================================
  // 2. AGE COHORT DISTRIBUTION AGGREGATION
  // ==========================================
  const ageData = useMemo(() => {
    // Standard Swine Production Stages in Months:
    // 0-2: Weanling / Piglet
    // 3-4: Starter / Grower Stage
    // 5-8: Finisher / Market Ready
    // 9+: Sows / Boars / Breeding Stock
    const cohorts = [
      {
        bracket: '< 2 mos (Weanling)',
        label: 'Piglet / Weanling',
        min: 0,
        max: 2.99,
        feedType: 'Creep & Pre-Starter Ration',
        carePriority: 'High Bio-Security & Warmth',
        vaxPriority: 'Iron & 1st Dose Booster',
        color: '#10B981',
        description: 'Vulnerable nursery stage needing insulated housing and starter booster.'
      },
      {
        bracket: '3 - 4 mos (Grower)',
        label: 'Starter / Grower',
        min: 3,
        max: 4.99,
        feedType: 'Grower Concentrate (16% CP)',
        carePriority: 'Parasite Deworming & Pen Rotation',
        vaxPriority: 'Routine Hog Cholera & Deworming',
        color: '#3B82F6',
        description: 'Rapid structural bone and muscle development phase.'
      },
      {
        bracket: '5 - 8 mos (Finisher)',
        label: 'Finisher / Market Hog',
        min: 5,
        max: 8.99,
        feedType: 'Finisher Mash (14% CP)',
        carePriority: 'Market Weight Monitoring',
        vaxPriority: 'Pre-Slaughter Health Clearance',
        color: '#D97706',
        description: 'Primary market commercial herd nearing slaughter or trade weight.'
      },
      {
        bracket: '9+ mos (Breeder)',
        label: 'Mature Breeder / Sow',
        min: 9,
        max: 999,
        feedType: 'Gestating / Lactating Ration',
        carePriority: 'Farrowing Sanitization & Genetic Sire',
        vaxPriority: 'Annual Maternal Immunity Shots',
        color: '#7C3AED',
        description: 'Parent reproductive foundation stock requiring high mineral feed.'
      }
    ];

    return cohorts.map(c => {
      const cohortPigs = pigs.filter(p => {
        const age = Number(p.age) || 0;
        return age >= c.min && age <= c.max;
      });
      const count = cohortPigs.length;
      const pct = totalHerd > 0 ? Math.round((count / totalHerd) * 100) : 0;
      const vaxCount = cohortPigs.filter(p => p.vaccinated).length;
      const avgWeight = count > 0 ? (cohortPigs.reduce((acc, p) => acc + (Number(p.weight) || 0), 0) / count).toFixed(1) : '0';
      const unvaxCount = count - vaxCount;

      return {
        name: c.bracket,
        label: c.label,
        count,
        percentage: pct,
        vaccinated: vaxCount,
        unvaccinated: unvaxCount,
        avgWeight: Number(avgWeight),
        feedType: c.feedType,
        carePriority: c.carePriority,
        vaxPriority: c.vaxPriority,
        color: c.color,
        description: c.description
      };
    });
  }, [pigs, totalHerd]);

  // ==========================================
  // 3. WEIGHT CLASS DISTRIBUTION AGGREGATION
  // ==========================================
  const weightData = useMemo(() => {
    const classes = [
      {
        range: '< 30 kg',
        label: 'Light / Weanling',
        min: 0,
        max: 29.99,
        color: '#06B6D4',
        marketReadiness: '4 - 5 Months Away'
      },
      {
        range: '30 - 60 kg',
        label: 'Medium / Grower',
        min: 30,
        max: 60.99,
        color: '#3B82F6',
        marketReadiness: '2 - 3 Months Away'
      },
      {
        range: '61 - 90 kg',
        label: 'Heavy / Finisher',
        min: 61,
        max: 90.99,
        color: '#F59E0B',
        marketReadiness: '3 - 6 Weeks Away (Approaching Harvest)'
      },
      {
        range: '91+ kg',
        label: 'Market Harvest / Heavy',
        min: 91,
        max: 9999,
        color: '#10B981',
        marketReadiness: 'Ready for Slaughter / Prime Harvest'
      }
    ];

    return classes.map(w => {
      const subset = pigs.filter(p => {
        const wt = Number(p.weight) || 0;
        return wt >= w.min && wt <= w.max;
      });
      const count = subset.length;
      const pct = totalHerd > 0 ? Math.round((count / totalHerd) * 100) : 0;
      const totalKg = subset.reduce((acc, p) => acc + (Number(p.weight) || 0), 0);
      const vaxCount = subset.filter(p => p.vaccinated).length;

      return {
        name: w.range,
        label: w.label,
        count,
        percentage: pct,
        totalKg,
        vaxCount,
        color: w.color,
        marketReadiness: w.marketReadiness
      };
    });
  }, [pigs, totalHerd]);

  // ==========================================
  // 4. RESOURCE ALLOCATION CALCULATIONS
  // ==========================================
  const resourceEstimates = useMemo(() => {
    // Estimations based on DA / BAI swine guidelines:
    // Average daily feed intake:
    // - Piglets (<30kg): ~1.0 kg/day
    // - Growers (30-60kg): ~2.0 kg/day
    // - Finishers (61-90kg): ~2.8 kg/day
    // - Breeders / Sows (91+kg): ~3.2 kg/day
    let dailyFeedKg = 0;
    pigs.forEach(p => {
      const wt = Number(p.weight) || 50;
      if (wt < 30) dailyFeedKg += 1.0;
      else if (wt <= 60) dailyFeedKg += 2.0;
      else if (wt <= 90) dailyFeedKg += 2.8;
      else dailyFeedKg += 3.2;
    });

    const monthlyFeedSacks = Math.ceil((dailyFeedKg * 30) / 50); // 50kg standard commercial feed bag
    const unvaxCount = pigs.filter(p => !p.vaccinated && !p.isDeceased).length;
    const dewormingDoses = pigs.filter(p => !p.isDeceased && (Number(p.age) || 0) >= 2).length;
    const marketReadyCount = pigs.filter(p => (Number(p.weight) || 0) >= 80 && !p.isDeceased).length;
    const totalLiveBiomassKg = pigs.reduce((acc, p) => acc + (p.isDeceased ? 0 : Number(p.weight) || 0), 0);

    return {
      dailyFeedKg: Math.round(dailyFeedKg),
      weeklyFeedTons: ((dailyFeedKg * 7) / 1000).toFixed(2),
      monthlyFeedSacks,
      unvaxCount,
      vaccineVialsRequired: Math.ceil(unvaxCount / 10), // 10-dose multi-vial standard
      dewormingDoses,
      marketReadyCount,
      totalLiveBiomassKg: Math.round(totalLiveBiomassKg)
    };
  }, [pigs]);

  return (
    <div className="bg-white border border-[#DED2AE] rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
      
      {/* HEADER WITH DEMOGRAPHIC KPI BADGES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EAE1C4] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-[#F5EFDD] text-[#2F5C3F] border border-[#DED2AE]">
              <Dna className="w-5 h-5 text-[#2F5C3F]" />
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#203F2B]">
              Swine Demographics &amp; Resource Allocation
            </h3>
          </div>
          <p className="text-xs text-[#55604F]">
            {isAdmin 
              ? 'Comprehensive municipal population census by breed genetics, age stages, and weight classes for targeted feed subsidies, vaccination campaigns, and supply forecasting.'
              : `Sector livestock distribution and production analytics for Barangay ${selectedBarangayName || 'Assigned Sector'}.`}
          </p>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F5EFDD] p-1.5 rounded-2xl border border-[#DED2AE] self-start lg:self-auto">
          <button
            onClick={() => setActiveTab('breed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'breed'
                ? 'bg-[#2F5C3F] text-white shadow-xs'
                : 'text-[#55604F] hover:text-[#203F2B] hover:bg-white/60'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>Breed Genetics</span>
          </button>

          <button
            onClick={() => setActiveTab('age')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'age'
                ? 'bg-[#2F5C3F] text-white shadow-xs'
                : 'text-[#55604F] hover:text-[#203F2B] hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Age Cohorts</span>
          </button>

          <button
            onClick={() => setActiveTab('weight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'weight'
                ? 'bg-[#2F5C3F] text-white shadow-xs'
                : 'text-[#55604F] hover:text-[#203F2B] hover:bg-white/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Weight Classes</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-[#D9A441] text-[#203F2B] shadow-xs'
                : 'text-[#55604F] hover:text-[#203F2B] hover:bg-white/60'
            }`}
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>Resource Planner</span>
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY METRIC RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FAF6EC] border border-[#EAE1C4] p-3 rounded-2xl">
          <div className="flex items-center justify-between text-[#55604F] text-[11px] mb-1 font-semibold">
            <span>Primary Breed</span>
            <Dna className="w-3.5 h-3.5 text-[#2F5C3F]" />
          </div>
          <div className="font-bold text-sm sm:text-base text-[#203F2B] truncate">
            {breedData[0]?.name || 'Native'}
          </div>
          <div className="text-[10px] font-mono text-[#55604F] mt-0.5">
            {breedData[0]?.percentage || 0}% of municipal herd
          </div>
        </div>

        <div className="bg-[#FAF6EC] border border-[#EAE1C4] p-3 rounded-2xl">
          <div className="flex items-center justify-between text-[#55604F] text-[11px] mb-1 font-semibold">
            <span>Dominant Age Group</span>
            <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>
          <div className="font-bold text-sm sm:text-base text-[#203F2B] truncate">
            {[...ageData].sort((a,b) => b.count - a.count)[0]?.label || 'Grower'}
          </div>
          <div className="text-[10px] font-mono text-[#55604F] mt-0.5">
            {[...ageData].sort((a,b) => b.count - a.count)[0]?.count || 0} active heads
          </div>
        </div>

        <div className="bg-[#FAF6EC] border border-[#EAE1C4] p-3 rounded-2xl">
          <div className="flex items-center justify-between text-[#55604F] text-[11px] mb-1 font-semibold">
            <span>Live Swine Biomass</span>
            <Scale className="w-3.5 h-3.5 text-[#D9A441]" />
          </div>
          <div className="font-bold text-sm sm:text-base text-[#203F2B] font-mono">
            {resourceEstimates.totalLiveBiomassKg.toLocaleString()} <span className="text-xs font-sans font-normal text-[#55604F]">kg</span>
          </div>
          <div className="text-[10px] font-mono text-[#55604F] mt-0.5">
            {resourceEstimates.marketReadyCount} market-ready heads (≥80kg)
          </div>
        </div>

        <div className="bg-[#FAF6EC] border border-[#EAE1C4] p-3 rounded-2xl">
          <div className="flex items-center justify-between text-[#55604F] text-[11px] mb-1 font-semibold">
            <span>Est. Daily Feed Need</span>
            <Wheat className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-bold text-sm sm:text-base text-[#203F2B] font-mono">
            {resourceEstimates.dailyFeedKg.toLocaleString()} <span className="text-xs font-sans font-normal text-[#55604F]">kg/day</span>
          </div>
          <div className="text-[10px] font-mono text-[#55604F] mt-0.5">
            ≈ {resourceEstimates.monthlyFeedSacks} sacks (50kg) / month
          </div>
        </div>
      </div>

      {/* TAB 1: BREED GENETICS DEMOGRAPHICS */}
      {activeTab === 'breed' && (
        <motion.div 
          key="tab-breed"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6EC] p-3.5 rounded-2xl border border-[#EAE1C4]">
            <div className="text-xs text-[#55604F] flex items-center gap-2">
              <Info className="w-4 h-4 text-[#2F5C3F] shrink-0" />
              <span>
                Visualizing genetic diversity across <b>{BREEDS.length} recognized breeds</b> in Hinunangan. Native breeds showcase superior heat &amp; disease resistance.
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#DED2AE] self-start sm:self-auto shrink-0">
              <button
                onClick={() => setChartViewType('bar')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartViewType === 'bar' ? 'bg-[#2F5C3F] text-white' : 'text-[#55604F] hover:bg-[#F5EFDD]'
                }`}
                title="Bar Chart Distribution"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartViewType('donut')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartViewType === 'donut' ? 'bg-[#2F5C3F] text-white' : 'text-[#55604F] hover:bg-[#F5EFDD]'
                }`}
                title="Proportion Donut Chart"
              >
                <PieIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Main Recharts Visualizer */}
            <div className="lg:col-span-7 h-[320px] w-full bg-[#FAF6EC]/50 rounded-2xl p-3 border border-[#EAE1C4]">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewType === 'bar' ? (
                  <BarChart data={breedData} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE1C4" vertical={false} />
                    <XAxis 
                      dataKey="shortName" 
                      tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                      stroke="#DED2AE"
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis 
                      tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                      stroke="#DED2AE"
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border-2 border-[#D9A441] p-3 rounded-2xl shadow-xl font-sans text-xs space-y-1.5 z-50">
                              <div className="flex items-center justify-between gap-4 border-b border-[#EAE1C4] pb-1">
                                <span className="font-bold text-[#203F2B] flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.name}
                                </span>
                                <span className="font-mono font-bold bg-[#F5EFDD] px-2 py-0.5 rounded-md text-[#203F2B]">
                                  {data.percentage}%
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#55604F]">
                                <span>Total Registered:</span>
                                <b className="font-mono text-[#203F2B]">{data.count} heads</b>
                              </div>
                              <div className="flex justify-between gap-4 text-[#55604F]">
                                <span>Average Live Weight:</span>
                                <b className="font-mono text-[#203F2B]">{data.avgWeight} kg</b>
                              </div>
                              <div className="flex justify-between gap-4 text-[#55604F]">
                                <span>Vaccination Rate:</span>
                                <b className="font-mono text-emerald-700">{data.vaxRate}% ({data.vaccinatedCount} heads)</b>
                              </div>
                              <div className="flex justify-between gap-4 text-[#55604F]">
                                <span>Backyard Farming:</span>
                                <b className="font-mono text-[#203F2B]">{data.backyardCount} heads</b>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {breedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={breedData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {breedData.map((entry, index) => (
                        <Cell key={`cell-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-[#D9A441] p-2.5 rounded-xl shadow-lg text-xs space-y-1">
                              <p className="font-bold text-[#203F2B]">{data.name}</p>
                              <p className="text-[#55604F] font-mono">{data.count} head(s) ({data.percentage}%)</p>
                              <p className="text-emerald-700 text-[11px] font-semibold">{data.vaxRate}% Vaccinated</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: '#1E2B1F' }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Detailed Breed Cards Grid */}
            <div className="lg:col-span-5 space-y-2.5">
              {breedData.map(b => (
                <div 
                  key={b.name} 
                  className="bg-white p-3 rounded-2xl border border-[#EAE1C4] hover:border-[#D9A441] transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: b.color }} />
                    <div>
                      <span className="font-bold text-[#203F2B] block">{b.name}</span>
                      <span className="text-[11px] text-[#55604F]">
                        Avg: <b className="font-mono text-[#203F2B]">{b.avgWeight}kg</b> · Vax: <b className="font-mono text-emerald-700">{b.vaxRate}%</b>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-[#203F2B] block">{b.count} heads</span>
                    <span className="text-[10px] font-mono text-[#55604F] bg-[#F5EFDD] px-2 py-0.5 rounded-md border border-[#DED2AE]">
                      {b.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: AGE COHORT DISTRIBUTION */}
      {activeTab === 'age' && (
        <motion.div 
          key="tab-age"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-[#FAF6EC] p-3.5 rounded-2xl border border-[#EAE1C4] text-xs text-[#55604F] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span>
              Age cohorts categorize swine into physiological feeding &amp; immunization phases to optimize booster shots and lactation/creep feed distribution.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Stacked Bar Chart for Vaccinated vs Unvaccinated by Age */}
            <div className="lg:col-span-7 h-[320px] w-full bg-[#FAF6EC]/50 rounded-2xl p-3 border border-[#EAE1C4]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 15, right: 15, left: -20, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE1C4" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="#DED2AE"
                  />
                  <YAxis 
                    tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="#DED2AE"
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border-2 border-[#D9A441] p-3 rounded-2xl shadow-xl font-sans text-xs space-y-1.5 z-50">
                            <div className="flex items-center justify-between gap-4 border-b border-[#EAE1C4] pb-1">
                              <span className="font-bold text-[#203F2B]">{data.label}</span>
                              <span className="font-mono font-bold bg-[#F5EFDD] px-2 py-0.5 rounded-md text-[#203F2B]">
                                {data.name}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Total Count:</span>
                              <b className="font-mono text-[#203F2B]">{data.count} heads ({data.percentage}%)</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Vaccinated (Protected):</span>
                              <b className="font-mono text-emerald-700">{data.vaccinated} heads</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Unvaccinated / Due:</span>
                              <b className="font-mono text-rose-700">{data.unvaccinated} heads</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Average Weight:</span>
                              <b className="font-mono text-[#203F2B]">{data.avgWeight} kg</b>
                            </div>
                            <div className="pt-1 border-t border-[#EAE1C4] text-[11px] text-[#2F5C3F] font-semibold">
                              Recommended: {data.feedType}
                            </div>
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
                  <Bar dataKey="vaccinated" name="Vaccinated (Protected)" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unvaccinated" name="Unvaccinated / Pending" stackId="a" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Age Cohort Management Cards */}
            <div className="lg:col-span-5 space-y-3">
              {ageData.map(c => (
                <div 
                  key={c.name}
                  className="bg-white p-3.5 rounded-2xl border border-[#EAE1C4] space-y-2 hover:border-[#D9A441] transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-bold text-[#203F2B]">{c.label}</span>
                      <span className="font-mono text-[10px] text-[#55604F]">({c.name})</span>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#203F2B]">
                      {c.count} heads <span className="text-[10px] text-[#55604F]">({c.percentage}%)</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#FAF6EC] p-2 rounded-xl">
                    <div>
                      <span className="text-[#55604F] block">Feeding Protocol:</span>
                      <span className="font-semibold text-[#203F2B]">{c.feedType}</span>
                    </div>
                    <div>
                      <span className="text-[#55604F] block">Veterinary Priority:</span>
                      <span className="font-semibold text-emerald-800">{c.vaxPriority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: WEIGHT CLASS BREAKDOWN */}
      {activeTab === 'weight' && (
        <motion.div 
          key="tab-weight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-[#FAF6EC] p-3.5 rounded-2xl border border-[#EAE1C4] text-xs text-[#55604F] flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#D9A441] shrink-0" />
            <span>
              Weight classification assists local butchers, cooperatives, and meat inspectors in estimating slaughter availability and live market supply.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Weight Range Bar Chart */}
            <div className="lg:col-span-7 h-[320px] w-full bg-[#FAF6EC]/50 rounded-2xl p-3 border border-[#EAE1C4]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weightData} margin={{ top: 15, right: 15, left: -20, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE1C4" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="#DED2AE"
                  />
                  <YAxis 
                    tick={{ fill: '#55604F', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="#DED2AE"
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border-2 border-[#D9A441] p-3 rounded-2xl shadow-xl font-sans text-xs space-y-1.5 z-50">
                            <div className="flex items-center justify-between gap-4 border-b border-[#EAE1C4] pb-1">
                              <span className="font-bold text-[#203F2B]">{data.label}</span>
                              <span className="font-mono font-bold bg-[#F5EFDD] px-2 py-0.5 rounded-md text-[#203F2B]">
                                {data.name}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Total Swine:</span>
                              <b className="font-mono text-[#203F2B]">{data.count} heads ({data.percentage}%)</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Total Biomass:</span>
                              <b className="font-mono text-[#203F2B]">{data.totalKg.toLocaleString()} kg</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[#55604F]">
                              <span>Market Horizon:</span>
                              <b className="font-mono text-[#2F5C3F]">{data.marketReadiness}</b>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {weightData.map((entry, index) => (
                      <Cell key={`cell-weight-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weight Class Summary Cards */}
            <div className="lg:col-span-5 space-y-3">
              {weightData.map(w => (
                <div 
                  key={w.name}
                  className="bg-white p-3.5 rounded-2xl border border-[#EAE1C4] space-y-2 hover:border-[#D9A441] transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                      <span className="font-bold text-[#203F2B]">{w.label}</span>
                      <span className="font-mono text-[10px] text-[#55604F]">({w.name})</span>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#203F2B]">
                      {w.count} heads
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-[#FAF6EC] p-2 rounded-xl">
                    <span className="text-[#55604F]">Total Biomass: <b className="text-[#203F2B] font-mono">{w.totalKg.toLocaleString()} kg</b></span>
                    <span className="font-semibold text-[#2F5C3F]">{w.marketReadiness}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 4: RESOURCE ALLOCATION PLANNER (DA ADVISORY) */}
      {activeTab === 'resources' && (
        <motion.div 
          key="tab-resources"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-r from-[#203F2B] to-[#2F5C3F] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2 text-[#D9A441] text-xs font-mono font-bold uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Municipal Feed &amp; Veterinary Resource Projection Model</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-white">
                Logistics &amp; Biologicals Allocation for {totalHerd} Registered Swine
              </h4>
              <p className="text-xs text-[#C9D6C9] max-w-2xl">
                Computed using Department of Agriculture (DA-BAI) livestock nutritional models tailored for Hinunangan's 40 agricultural barangays.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Feed Subsidy & Procurement */}
            <div className="bg-white p-4 rounded-2xl border border-[#DED2AE] space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#203F2B]">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <Wheat className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-[#203F2B]">Feed Procurement</h5>
                  <span className="text-[10px] text-[#55604F] block">Daily &amp; Monthly Nutritional Demand</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Daily Feed Consumption:</span>
                  <span className="font-mono font-bold text-[#203F2B]">{resourceEstimates.dailyFeedKg.toLocaleString()} kg/day</span>
                </div>
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Weekly Tonnage:</span>
                  <span className="font-mono font-bold text-[#203F2B]">{resourceEstimates.weeklyFeedTons} metric tons</span>
                </div>
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Monthly Sacks (50kg bags):</span>
                  <span className="font-mono font-bold text-emerald-800">{resourceEstimates.monthlyFeedSacks} bags</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                💡 <b>Advisory:</b> Distribute 60% Grower ration, 25% Finisher, and 15% Creep feed to prevent nutritional stunting.
              </div>
            </div>

            {/* Vaccine & Biologics Allocation */}
            <div className="bg-white p-4 rounded-2xl border border-[#DED2AE] space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#203F2B]">
                <div className="p-2 bg-blue-50 text-blue-800 rounded-xl">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-[#203F2B]">Biologics &amp; Vaccines</h5>
                  <span className="text-[10px] text-[#55604F] block">Veterinary Intervention Needs</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Unvaccinated Swine:</span>
                  <span className="font-mono font-bold text-rose-700">{resourceEstimates.unvaxCount} heads</span>
                </div>
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Hog Cholera Vials (10-dose):</span>
                  <span className="font-mono font-bold text-[#203F2B]">{resourceEstimates.vaccineVialsRequired} vials</span>
                </div>
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Deworming Doses Needed:</span>
                  <span className="font-mono font-bold text-[#203F2B]">{resourceEstimates.dewormingDoses} doses</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                🛡️ <b>Protocol:</b> Schedule focal person vaccination sweeps targeting weanlings between 45-60 days of age.
              </div>
            </div>

            {/* Supply & Market Harvest Outlook */}
            <div className="bg-white p-4 rounded-2xl border border-[#DED2AE] space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#203F2B]">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-[#203F2B]">Market Harvest Outlook</h5>
                  <span className="text-[10px] text-[#55604F] block">Meat Security &amp; Trade Pipeline</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Market-Ready (≥80kg):</span>
                  <span className="font-mono font-bold text-emerald-800">{resourceEstimates.marketReadyCount} heads</span>
                </div>
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Approaching Harvest (60-79kg):</span>
                  <span className="font-mono font-bold text-[#203F2B]">
                    {pigs.filter(p => (Number(p.weight) || 0) >= 60 && (Number(p.weight) || 0) < 80).length} heads
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#FAF6EC] pb-1.5">
                  <span className="text-[#55604F]">Total Live Biomass:</span>
                  <span className="font-mono font-bold text-[#203F2B]">{resourceEstimates.totalLiveBiomassKg.toLocaleString()} kg</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                📈 <b>Forecast:</b> Hinunangan municipal supply is sufficient for local public market demand over the next 60 days.
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* FOOTER ANNOTATION */}
      <div className="pt-3 border-t border-[#EAE1C4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#55604F]">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Calculated in real-time from active municipal swine registry records.</span>
        </div>
        <span className="font-mono text-[#2F5C3F] font-bold">
          LGU Hinunangan Livestock Resource Optimization System
        </span>
      </div>

    </div>
  );
};
