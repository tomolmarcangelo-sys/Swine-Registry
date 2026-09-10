import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BiosecurityChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  barangay?: string;
}

interface ChecklistItem {
  id: string;
  category: 'pre-visit' | 'entry' | 'inspection' | 'exit';
  title: string;
  description: string;
  critical: boolean;
}

const SOP_ITEMS: ChecklistItem[] = [
  // Category: Pre-Visit Planning
  {
    id: 'pre-1',
    category: 'pre-visit',
    title: 'Check Zone Classification',
    description: 'Verify the active ASF color zone category (Red, Pink, Yellow, or Green) of the target barangay via the command map.',
    critical: true
  },
  {
    id: 'pre-2',
    category: 'pre-visit',
    title: 'Sanitize Diagnostic Equipment',
    description: 'Disinfect all clipboards, syringes, ear-tagging gear, and mobile devices using a certified virucidal solution (e.g., Virkon S).',
    critical: true
  },
  {
    id: 'pre-3',
    category: 'pre-visit',
    title: 'Prepare Sterile Disposable Gear',
    description: 'Pack clean disposable boots, single-use rubber gloves, coveralls, and thick biohazard bags for waste disposal.',
    critical: false
  },
  // Category: Entry Control
  {
    id: 'ent-1',
    category: 'entry',
    title: 'Vehicle Distance Buffer',
    description: 'Park the surveillance vehicle at least 50 meters away from the swine housing in a designated clean zone.',
    critical: true
  },
  {
    id: 'ent-2',
    category: 'entry',
    title: 'Fencing & Perimeter Isolation',
    description: 'Verify that the farm has active perimeter fences to prevent intrusion by wild pigs, stray dogs, and unauthorized personnel.',
    critical: true
  },
  {
    id: 'ent-3',
    category: 'entry',
    title: 'Footbath Activation',
    description: 'Step into a freshly mixed virucidal footbath at the entry gate. Ensure contact time of at least 30 seconds.',
    critical: true
  },
  {
    id: 'ent-4',
    category: 'entry',
    title: 'Wear PPE Before Contact',
    description: 'Don disposable protective boots and pair of latex gloves before touching any containment cages or animal feed.',
    critical: true
  },
  // Category: Inspection
  {
    id: 'ins-1',
    category: 'inspection',
    title: 'Assess Zero-Swill Compliance',
    description: 'Check feed storage. Confirm absolutely no swill, kitchen waste, or untested table scraps are fed to swine.',
    critical: true
  },
  {
    id: 'ins-2',
    category: 'inspection',
    title: 'Water Source Check',
    description: 'Ensure drinking water is sourced from a deep well or treated supply, completely isolated from surface run-offs.',
    critical: false
  },
  {
    id: 'ins-3',
    category: 'inspection',
    title: 'Observe Clinical Abnormalities',
    description: 'Monitor herds for high fever, skin hemorrhages, lethargy, loss of appetite, or sudden mortality vector patterns.',
    critical: true
  },
  // Category: Exit Protocol
  {
    id: 'ext-1',
    category: 'exit',
    title: 'Bag and Seal Bio-waste',
    description: 'Place dirty gloves, disposable boots, and clinical waste in thick bags. Spray outer bag with virucide and seal.',
    critical: true
  },
  {
    id: 'ext-2',
    category: 'exit',
    title: 'Scrub & Disinfect Boots',
    description: 'For reusable footwear, scrub thoroughly to remove mud and biological matter, then spray with virucide solution.',
    critical: true
  },
  {
    id: 'ext-3',
    category: 'exit',
    title: 'Post-Visit Quarantine Time',
    description: 'Ensure a minimum downtime of 48 hours before visiting another swine farm or entering an ASF-free barangay.',
    critical: true
  }
];

export const BiosecurityChecklistModal: React.FC<BiosecurityChecklistModalProps> = ({
  isOpen,
  onClose,
  barangay
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('biosecurity_checklist_state');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeCategory, setActiveCategory] = useState<'all' | 'pre-visit' | 'entry' | 'inspection' | 'exit'>('all');

  useEffect(() => {
    localStorage.setItem('biosecurity_checklist_state', JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const resetChecklist = () => {
    if (confirm('Are you sure you want to clear all checked items for this checklist?')) {
      setCheckedItems({});
    }
  };

  const criticalItems = SOP_ITEMS.filter(item => item.critical);
  const criticalCheckedCount = criticalItems.filter(item => checkedItems[item.id]).length;
  const isFullyCompliant = criticalCheckedCount === criticalItems.length;

  const filteredItems = activeCategory === 'all' 
    ? SOP_ITEMS 
    : SOP_ITEMS.filter(item => item.category === activeCategory);

  const totalChecked = SOP_ITEMS.filter(item => checkedItems[item.id]).length;
  const completionPct = Math.round((totalChecked / SOP_ITEMS.length) * 100);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1E2B1F]/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className="relative w-full max-w-2xl bg-[#FBF8EF] border border-[#DED2AE] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#203F2B] border-b border-white/10 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D9A441] text-[#203F2B] flex items-center justify-center font-bold shadow-md">
                <ShieldCheck className="w-6 h-6 text-[#203F2B]" />
              </div>
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold leading-tight">Biosecurity SOP Checklist</h3>
                <p className="text-[10px] sm:text-xs text-[#93A893] font-mono">
                  {barangay ? `Assigned Barangay Scope: ${barangay}` : 'Hinunangan Municipal Farm Protocol'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compliance Banner & Progress */}
          <div className="bg-[#F5EFDD] border-b border-[#DED2AE] px-5 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#55604F]">COMPLETION PROGRESS:</span>
                <span className="font-mono text-xs font-black text-[#203F2B]">{completionPct}%</span>
              </div>
              <div className="w-full bg-[#EAE1C4] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#2F5C3F] h-full transition-all duration-500 rounded-full" 
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/80 border border-[#DED2AE] px-3 py-1.5 rounded-2xl">
              {isFullyCompliant ? (
                <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
                  <span>CRITICAL SOPS CLEARED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>CRITICAL SOPS PENDING ({criticalCheckedCount}/{criticalItems.length})</span>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="px-5 py-2.5 bg-white border-b border-[#EAE1C4] flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
            {(['all', 'pre-visit', 'entry', 'inspection', 'exit'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                  activeCategory === cat 
                    ? 'bg-[#203F2B] text-white border-[#203F2B]' 
                    : 'bg-[#FBF8EF] text-[#55604F] border-[#DED2AE] hover:bg-[#F5EFDD]'
                }`}
              >
                {cat === 'all' ? 'All Steps' : cat.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Checklist Items Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 print:overflow-visible">
            {filteredItems.map(item => {
              const isChecked = !!checkedItems[item.id];
              return (
                <div 
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isChecked 
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' 
                      : 'bg-white border-[#EAE1C4] hover:border-[#DED2AE] hover:bg-[#FBF8EF]/60 shadow-3xs'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isChecked 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'bg-white border-[#DED2AE]'
                    }`}>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-serif text-sm font-bold ${isChecked ? 'text-emerald-950 line-through opacity-70' : 'text-[#203F2B]'}`}>
                        {item.title}
                      </span>
                      {item.critical && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          Critical
                        </span>
                      )}
                      <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                    </div>
                    <p className={`text-xs leading-normal ${isChecked ? 'text-emerald-800/80 line-through opacity-60' : 'text-[#55604F]'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer controls */}
          <div className="p-4 bg-white border-t border-[#EAE1C4] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <button
              onClick={resetChecklist}
              className="px-3 py-2 text-xs font-bold text-[#55604F] hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Protocol</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-2 text-xs font-bold text-[#203F2B] bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#2F5C3F]" />
                <span>Print SOP</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-[#203F2B] hover:bg-[#2F5C3F] rounded-xl transition-all cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
