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
import { PigRecord, SystemSettings } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { LanguageToggle } from './LanguageToggle';

interface LandingViewProps {
  pigs: PigRecord[];
  onOpenLogin: () => void;
  onExploreProgram: () => void;
  systemSettings?: SystemSettings;
}

export const LandingView: React.FC<LandingViewProps> = ({
  pigs,
  onOpenLogin,
  onExploreProgram,
  systemSettings = {} as SystemSettings
}) => {
  const { t } = useI18n();
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
    <div className="min-h-screen text-[#1E2B1F] relative overflow-hidden">
      {/* Hinunangan Southern Leyte Crisp Full-page Parallax Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0 scale-100"
        style={{ 
          backgroundImage: `url('https://southernleyte.gov.ph/wp-content/uploads/2023/04/hinunangan-1.jpg')` 
        }}
      />
      {/* Clean, low-opacity warm gradient with zero blur to make the background perfectly clear and vivid */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#F5EFDD]/30 via-[#F5EFDD]/40 to-[#F5EFDD]/50 z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
      
      {/* SITE NAVIGATION */}
      <nav className="sticky top-0 z-40 bg-[#F5EFDD]/90 backdrop-blur-md border-b border-[#DED2AE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2">
          
          <a href="#home" className="flex items-center gap-2 sm:gap-3 group shrink">
            <img 
              src={systemSettings?.logoUrl || "/hinunangan_logo.jpg"} 
              alt="LGU Hinunangan OMAS Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full border-2 border-[#D9A441] shadow-md group-hover:scale-105 transition-transform shrink-0 object-cover bg-white"
            />
            <div className="leading-tight">
              <span className="font-serif font-bold text-sm sm:text-base text-[#203F2B] block truncate max-w-[140px] sm:max-w-none">
                Hinunangan DA Office
              </span>
              <span className="font-sans text-[10px] text-[#55604F] tracking-wide hidden sm:block">
                Southern Leyte · Swine Registry &amp; Livestock Management
              </span>
              <span className="font-sans text-[10px] text-[#55604F] tracking-wide block sm:hidden">
                Swine Registry System
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-[#55604F]">
            <a href="#services" className="hover:text-[#2F5C3F] transition-colors">{t('landing.navServices')}</a>
            <a href="#about" className="hover:text-[#2F5C3F] transition-colors">{t('landing.navAbout')}</a>
            <a href="#barangays" className="hover:text-[#2F5C3F] transition-colors">40 Barangays</a>
            <a href="#contact" className="hover:text-[#2F5C3F] transition-colors">{t('landing.contactUs')}</a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Language Switcher Pill - Hidden on small mobile screens to prevent layout overflow */}
            <div className="hidden sm:block">
              <LanguageToggle variant="landing" />
            </div>

            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <span>{t('landing.loginBtn')}</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
            <div className="pb-2 border-b border-[#DED2AE]">
              <LanguageToggle variant="sidebar" />
            </div>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">{t('landing.navServices')}</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">{t('landing.navAbout')}</a>
            <a href="#barangays" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">40 Barangays</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#55604F]">{t('landing.contactUs')}</a>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <header id="home" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 bg-white/85 backdrop-blur-md border border-[#DED2AE]/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#FBF8EF] border border-[#DED2AE] rounded-full px-3.5 py-1 text-[10px] sm:text-xs font-mono text-[#D9A441] font-semibold max-w-full overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-[#2F5C3F] animate-pulse shrink-0" />
              <span className="truncate">Municipal Agriculture Office · Hinunangan</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#203F2B] leading-[1.12] tracking-tight">
              {systemSettings.landingHeroTitle || 'Rice Granary of Southern Leyte, now registering every backyard herd.'}
            </h1>

            <p className="text-sm sm:text-base text-[#55604F] leading-relaxed max-w-xl">
              {systemSettings.landingHeroSubtitle || 'The official Swine Registration & Livestock Management System of Hinunangan\'s Municipal Agriculture Office — connecting all 40 barangays to track herd health, guide biosecurity response, and empower local hog raisers.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-5 py-3 rounded-full font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <span>Barangay Focal Person Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#services"
                className="flex items-center gap-2 bg-white hover:bg-[#FBF8EF] text-[#203F2B] border border-[#DED2AE] px-5 py-3 rounded-full font-bold text-xs sm:text-sm transition-colors shadow-xs"
              >
                <ClipboardList className="w-4 h-4 text-[#2F5C3F]" />
                <span>Explore Programs &amp; Registry</span>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#DED2AE]/60 font-mono text-xs">
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">{totalRegistered}</strong>
                <span className="text-[10px] text-[#55604F] uppercase tracking-wider">Registered Swine</span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">40</strong>
                <span className="text-[10px] text-[#55604F] uppercase tracking-wider">Barangays Covered</span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">{backyardCount}</strong>
                <span className="text-[10px] text-[#55604F] uppercase tracking-wider">Backyard Raisers</span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-bold text-[#203F2B]">{thisMonthCount}</strong>
                <span className="text-[10px] text-[#55604F] uppercase tracking-wider">This Month</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5">
            {systemSettings?.landingHeroPhotoUrl ? (
              <img src={systemSettings.landingHeroPhotoUrl} alt="Hero" className="w-full h-auto aspect-square object-cover rounded-3xl shadow-xl border border-[#DED2AE]" />
            ) : (
              <div className="bg-white/80 backdrop-blur-md border border-[#DED2AE]/60 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden hover:bg-white/95 transition-all duration-300">
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
            )}
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
        <div className="max-w-2xl mb-12 bg-white/85 backdrop-blur-md border border-[#DED2AE]/60 rounded-3xl p-6 sm:p-8 shadow-md">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#D9A441] block mb-2">
            What The Office Runs
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#203F2B]">
            Field-tested livestock programs for Hinunangan's hog raisers.
          </h2>
          <p className="text-xs sm:text-sm text-[#55604F] mt-3">
            Coordinated assistance from Poblacion's central municipal office to our upland and coastal communities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white/80 backdrop-blur-md border border-[#DED2AE]/60 rounded-2xl p-6 shadow-sm hover:bg-white/95 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-[#2F5C3F] flex items-center justify-center mb-4 shadow-2xs">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              Swine Ear-Tag Registry
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Every backyard and commercial hog is registered with an official municipal ID tag and owner profile.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#DED2AE]/60 rounded-2xl p-6 shadow-sm hover:bg-white/95 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-rose-700 flex items-center justify-center mb-4 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              ASF Early Warning &amp; Biosecurity
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Barangay-level biosecurity inspection, vaccination tracking, and herd health status verification.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#DED2AE]/60 rounded-2xl p-6 shadow-sm hover:bg-white/95 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-[#D9A441] flex items-center justify-center mb-4 shadow-2xs">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#203F2B] mb-2">
              40 Barangay Decentralization
            </h3>
            <p className="text-xs text-[#55604F] leading-relaxed">
              Assigned focal persons in each barangay manage localized swine records directly from the field.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-[#DED2AE]/60 rounded-2xl p-6 shadow-sm hover:bg-white/95 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFDD] text-[#2563EB] flex items-center justify-center mb-4 shadow-2xs">
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
      <section id="barangays" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-white/30 backdrop-blur-sm border-y border-[#DED2AE]/60 rounded-3xl my-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl bg-white/85 backdrop-blur-md border border-[#DED2AE]/60 rounded-3xl p-6 sm:p-8 shadow-md">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#D9A441] block mb-2">
              Full Municipality Coverage
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#203F2B]">
              All 40 Barangays of Hinunangan
            </h2>
            <p className="text-xs sm:text-sm text-[#55604F] mt-2">
              Each barangay operates its own scoped agricultural focal person account for decentralized registration.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-[#DED2AE]/60 p-1.5 rounded-2xl text-xs font-semibold shadow-xs">
            <button
              onClick={() => setSelectedBrgyFilter('all')}
              className={`px-4 py-2 rounded-xl cursor-pointer transition-all duration-200 ${selectedBrgyFilter === 'all' ? 'bg-[#2F5C3F] text-white font-bold shadow-xs' : 'text-[#55604F] hover:bg-[#F5EFDD]/50'}`}
            >
              All (40)
            </button>
            <button
              onClick={() => setSelectedBrgyFilter('coastal')}
              className={`px-4 py-2 rounded-xl cursor-pointer transition-all duration-200 ${selectedBrgyFilter === 'coastal' ? 'bg-[#2F5C3F] text-white font-bold shadow-xs' : 'text-[#55604F] hover:bg-[#F5EFDD]/50'}`}
            >
              Coastal Sectors
            </button>
            <button
              onClick={() => setSelectedBrgyFilter('inland')}
              className={`px-4 py-2 rounded-xl cursor-pointer transition-all duration-200 ${selectedBrgyFilter === 'inland' ? 'bg-[#2F5C3F] text-white font-bold shadow-xs' : 'text-[#55604F] hover:bg-[#F5EFDD]/50'}`}
            >
              Inland &amp; Upland
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {filteredBarangays.map(b => (
            <div
              key={b.name}
              className="bg-white/80 backdrop-blur-md border border-[#DED2AE]/60 rounded-2xl p-4 shadow-sm hover:border-[#2F5C3F] hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-bold text-sm text-[#203F2B]">
                  {b.name}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${b.isCoastal ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
              </div>
              <div className="text-[11px] text-[#55604F] mt-2 flex items-center justify-between font-medium">
                <span>{b.purokCount} Puroks</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.isCoastal ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {b.isCoastal ? 'Coastal' : 'Inland'}
                </span>
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
                <img 
                  src={systemSettings?.logoUrl || "/hinunangan_logo.jpg"} 
                  alt="LGU Hinunangan OMAS Logo"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border-2 border-[#D9A441] shadow-md shrink-0 object-cover bg-white"
                />
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
                {systemSettings?.facebookUrl && (
                  <a href={systemSettings.facebookUrl} target="_blank" rel="noreferrer" className="block text-emerald-400 hover:text-white transition-colors">Facebook Page</a>
                )}
                {systemSettings?.twitterUrl && (
                  <a href={systemSettings.twitterUrl} target="_blank" rel="noreferrer" className="block text-emerald-400 hover:text-white transition-colors">Twitter / X</a>
                )}
                {systemSettings?.documentationUrl && (
                  <a href={systemSettings.documentationUrl} target="_blank" rel="noreferrer" className="block text-emerald-400 hover:text-white transition-colors">Documentation</a>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-serif text-sm font-bold text-white uppercase tracking-wider mb-3">Office Hours &amp; Hotline</h4>
              <div className="space-y-1.5 text-xs text-[#AEC0AE]">
                <p>Monday – Friday: 8:00 AM – 5:00 PM</p>
                <p>Hotline: (053) 572-8812</p>
                <p>Mobile: 0917-822-4911</p>
                <p>agri.hinunangan@southernleyte.gov.ph</p>
                {systemSettings?.contactEmail && (
                  <p className="text-emerald-300 break-all">{systemSettings.contactEmail}</p>
                )}
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
    </div>
  );
};
