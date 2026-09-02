import React, { useState } from 'react';
import { 
  ClipboardList, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  Layers, 
  Building2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { BARANGAYS_DATA, HINUNANGAN_CENTER } from '../data/constants';
import { PigRecord } from '../types';

interface LandingViewProps {
  pigs: PigRecord[];
  onOpenLogin: () => void;
  onExploreProgram: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  pigs,
  onOpenLogin,
  onExploreProgram
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBrgyFilter, setSelectedBrgyFilter] = useState<'all' | 'coastal' | 'inland'>('all');

  const totalRegistered = pigs.length;
  const backyardCount = pigs.filter(p => p.purpose === 'Backyard Raising').length;
  const coveredBarangays = new Set(pigs.map(p => p.barangay)).size;

  const now = new Date();
  const thisMonthCount = pigs.filter(p => {
    const d = new Date(p.dateRegistered);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filteredBarangays = BARANGAYS_DATA.filter(b => {
    if (selectedBrgyFilter === 'coastal') return b.isCoastal;
    if (selectedBrgyFilter === 'inland') return !b.isCoastal;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5EFDD] text-[#1E2B1F]">
      
      {/* SITE NAVIGATION */}
      <nav className="sticky top-0 z-40 bg-[#F5EFDD]/90 backdrop-blur-md border-b border-[#DED2AE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          <a href="#home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-radial from-[#4F7A55] via-[#2F5C3F] to-[#203F2B] border-2 border-[#D9A441] flex items-center justify-center font-serif text-base font-bold text-[#D9A441] shadow-md group-hover:scale-105 transition-transform">
              DA
            </div>
            <div className="leading-tight">
              <span className="font-serif font-bold text-base text-[#203F2B] block">
                Hinunangan DA Office
              </span>
              <span className="font-sans text-[11px] text-[#55604F] tracking-wide block">
                Southern Leyte · Swine Registry &amp; Livestock Management
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-[#55604F]">
            <a href="#services" className="hover:text-[#2F5C3F] transition-colors">Programs &amp; Services</a>
            <a href="#about" className="hover:text-[#2F5C3F] transition-colors">About Office</a>
            <a href="#barangays" className="hover:text-[#2F5C3F] transition-colors">40 Barangays</a>
            <a href="#contact" className="hover:text-[#2F5C3F] transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-4 py-2 rounded-full font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <span>Staff &amp; Focal Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Burger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white border border-[#DED2AE] text-[#1E2B1F]"
            >
              <span className="sr-only">Toggle navigation</span>
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="h-0.5 w-full bg-[#1E2B1F] rounded" />
                <span className="h-0.5 w-full bg-[#1E2B1F] rounded" />
                <span className="h-0.5 w-full bg-[#1E2B1F] rounded" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F5EFDD] border-b border-[#DED2AE] px-6 py-4 space-y-3 text-sm font-semibold">
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">Programs &amp; Services</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">About Office</a>
            <a href="#barangays" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">40 Barangays</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">Contact</a>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <header id="home" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#FBF8EF] border border-[#DED2AE] rounded-full px-3.5 py-1 text-xs font-mono text-[#D9A441] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#2F5C3F] animate-pulse" />
              Office of the Municipal Agriculturist · Hinunangan
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#203F2B] leading-[1.08] tracking-tight">
              Rice Granary of Southern Leyte, now registering every <em className="italic text-[#A85C32]">backyard herd</em>.
            </h1>

            <p className="text-base sm:text-lg text-[#55604F] leading-relaxed max-w-xl">
              The official Swine Registration &amp; Livestock Management System of Hinunangan's Municipal Agriculture Office — connecting all 40 barangays to track herd health, guide biosecurity response, and empower local hog raisers.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-6 py-3.5 rounded-full font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <span>Barangay Focal Person Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#services"
                className="flex items-center gap-2 bg-white hover:bg-[#FBF8EF] text-[#203F2B] border border-[#DED2AE] px-6 py-3.5 rounded-full font-bold text-sm transition-colors shadow-xs"
              >
                <ClipboardList className="w-4 h-4 text-[#2F5C3F]" />
                <span>Explore Programs &amp; Registry</span>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#DED2AE]/60 font-mono text-xs">
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">{totalRegistered}</strong>
                <span className="text-[11px] text-[#55604F] uppercase tracking-wider">Registered Swine</span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">40</strong>
                <span className="text-[11px] text-[#55604F] uppercase tracking-wider">Barangays Covered</span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">{backyardCount}</strong>
                <span className="text-[11px] text-[#55604F] uppercase tracking-wider">Backyard Raisers</span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">{thisMonthCount}</strong>
                <span className="text-[11px] text-[#55604F] uppercase tracking-wider">This Month</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#DED2AE] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F5EFDD] text-[#2F5C3F] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#203F2B]">
                  Municipal Biosecurity &amp; Swine Census
                </h3>
                <p className="text-xs text-[#55604F] leading-relaxed">
                  Real-time recording of swine ear tags, vaccination status, owner profiles, and breed distribution across all 40 barangays in Hinunangan.
                </p>
                <div className="pt-2 border-t border-[#EAE1C4] flex items-center justify-between text-xs font-bold text-[#2F5C3F]">
                  <span>Office of the Municipal Agriculturist</span>
                  <span>Province of Southern Leyte</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* BANNER STATS */}
      <section className="bg-[#203F2B] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center font-mono">
            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#D9A441]">{totalRegistered}</span>
              <span className="block text-xs uppercase tracking-widest text-[#C9D6C9]">Total Registered Heads</span>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#D9A441]">{backyardCount}</span>
              <span className="block text-xs uppercase tracking-widest text-[#C9D6C9]">Backyard Raisers</span>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#D9A441]">{coveredBarangays} / 40</span>
              <span className="block text-xs uppercase tracking-widest text-[#C9D6C9]">Barangays with Records</span>
            </div>
            <div className="space-y-1">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#D9A441]">{thisMonthCount}</span>
              <span className="block text-xs uppercase tracking-widest text-[#C9D6C9]">Logged This Month</span>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS & SERVICES */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#D9A441] block mb-2">
            What The Office Runs
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B]">
            Field-tested livestock programs for Hinunangan's hog raisers.
          </h2>
          <p className="text-sm text-[#55604F] mt-3">
            Coordinated assistance from Poblacion's central municipal office to our upland and coastal communities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-[#2F5C3F] flex items-center justify-center mb-4">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              Swine Ear-Tag Registry
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Every backyard and commercial hog is registered with an official municipal ID tag and owner profile.
            </p>
          </div>

          <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-rose-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              ASF Early Warning &amp; Biosecurity
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Barangay-level biosecurity inspection, vaccination tracking, and herd health status verification.
            </p>
          </div>

          <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-[#D9A441] flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              40 Barangay Decentralization
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Assigned focal persons in each barangay manage localized swine records directly from the field.
            </p>
          </div>

          <div className="bg-white border border-[#DED2AE] rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-[#2563EB] flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              Official Printable Reports
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Standardized municipal census documents and barangay reports ready for validation and LGU budget allocations.
            </p>
          </div>

        </div>
      </section>

      {/* ALL 40 BARANGAYS DIRECTORY */}
      <section id="barangays" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white/40 border-y border-[#DED2AE]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#D9A441] block mb-2">
              Full Municipality Coverage
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#203F2B]">
              All 40 Barangays of Hinunangan
            </h2>
            <p className="text-sm text-[#55604F] mt-2">
              Each barangay operates its own scoped agricultural focal person account for decentralized registration.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white border border-[#DED2AE] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedBrgyFilter('all')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${selectedBrgyFilter === 'all' ? 'bg-[#2F5C3F] text-white font-bold' : 'text-[#55604F]'}`}
            >
              All (40)
            </button>
            <button
              onClick={() => setSelectedBrgyFilter('coastal')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${selectedBrgyFilter === 'coastal' ? 'bg-[#2F5C3F] text-white font-bold' : 'text-[#55604F]'}`}
            >
              Coastal Sectors
            </button>
            <button
              onClick={() => setSelectedBrgyFilter('inland')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${selectedBrgyFilter === 'inland' ? 'bg-[#2F5C3F] text-white font-bold' : 'text-[#55604F]'}`}
            >
              Inland &amp; Upland
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredBarangays.map(b => (
            <div
              key={b.name}
              className="bg-white border border-[#DED2AE] rounded-xl p-3 shadow-2xs hover:border-[#2F5C3F] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-bold text-sm text-[#203F2B]">
                  {b.name}
                </span>
                <span className={`w-2 h-2 rounded-full ${b.isCoastal ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              </div>
              <div className="text-[11px] text-[#55604F] mt-1 flex items-center justify-between">
                <span>{b.purokCount} Puroks</span>
                <span className="text-[10px] text-[#2F5C3F] font-semibold">{b.isCoastal ? 'Coastal' : 'Inland'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-[#203F2B] via-[#2F5C3F] to-[#203F2B] text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="font-mono text-xs text-[#D9A441] font-bold uppercase tracking-widest">
              LGU Hinunangan Field Operations
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Are you an assigned Barangay Agricultural Focal Person?
            </h2>
            <p className="text-xs sm:text-sm text-[#C9D6C9]">
              Log in to record today's swine registrations, check vaccination buffers, and print your barangay livestock reports.
            </p>
          </div>

          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] px-8 py-4 rounded-full font-bold text-sm shadow-xl transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            <span>Sign In to Staff Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-[#203F2B] text-[#C9D6C9] py-14 border-t border-[#DED2AE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-radial from-[#4F7A55] to-[#203F2B] border-2 border-[#D9A441] flex items-center justify-center font-serif text-base font-bold text-[#D9A441]">
                  DA
                </div>
                <div className="leading-tight">
                  <span className="font-serif font-bold text-base text-white block">Hinunangan DA Office</span>
                  <span className="text-[11px] text-[#93A893]">Municipal Agriculture</span>
                </div>
              </div>
              <p className="text-xs text-[#AEC0AE] leading-relaxed">
                Office of the Municipal Agriculturist, Hinunangan Municipal Hall Complex, Southern Leyte, Philippines 6608.
              </p>
            </div>

            <div>
              <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</h4>
              <div className="space-y-2 text-xs">
                <a href="#services" className="block hover:text-white transition-colors">Programs &amp; Services</a>
                <a href="#about" className="block hover:text-white transition-colors">About the Office</a>
                <a href="#barangays" className="block hover:text-white transition-colors">40 Barangays Directory</a>
              </div>
            </div>

            <div>
              <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider mb-3">Office Hours &amp; Hotline</h4>
              <div className="space-y-1.5 text-xs text-[#AEC0AE]">
                <p>Monday – Friday: 8:00 AM – 5:00 PM</p>
                <p>Hotline: (053) 572-8812</p>
                <p>Mobile: 0917-822-4911</p>
                <p>agri.hinunangan@southernleyte.gov.ph</p>
              </div>
            </div>

            <div>
              <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider mb-3">Portal Access</h4>
              <p className="text-xs text-[#AEC0AE] mb-3">
                Restricted to authorized Municipal Agriculture Office staff and designated barangay livestock inspectors.
              </p>
              <button
                onClick={onOpenLogin}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Launch Portal Login
              </button>
            </div>

          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8FA48F] gap-2">
            <span>© 2026 Municipality of Hinunangan · Office of the Municipal Agriculturist</span>
            <span>Swine Registration &amp; Livestock Information System</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
