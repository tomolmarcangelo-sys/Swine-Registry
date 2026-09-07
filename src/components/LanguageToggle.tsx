import React from 'react';
import { Languages, Globe } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface LanguageToggleProps {
  variant?: 'topbar' | 'sidebar' | 'landing' | 'compact';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'topbar',
  className = ''
}) => {
  const { language, setLanguage, toggleLanguage, t } = useI18n();

  if (variant === 'sidebar') {
    return (
      <div className={`w-full bg-white/5 border border-white/10 rounded-xl p-2.5 ${className}`}>
        <div className="flex items-center justify-between text-xs text-[#B9CBB9] mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-[#D9A441]" />
            <span>{t('common.language')}</span>
          </span>
          <span className="text-[10px] font-mono text-[#D9A441] font-semibold">
            {language === 'ceb' ? 'Binisaya' : 'English'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5 bg-black/20 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-[#D9A441] text-[#203F2B] font-bold shadow-xs'
                : 'text-[#B9CBB9] hover:text-white hover:bg-white/5'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ceb')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              language === 'ceb'
                ? 'bg-[#D9A441] text-[#203F2B] font-bold shadow-xs'
                : 'text-[#B9CBB9] hover:text-white hover:bg-white/5'
            }`}
          >
            Cebuano
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'landing') {
    return (
      <div className={`inline-flex items-center bg-white/80 backdrop-blur-xs border border-[#DED2AE] rounded-full p-1 shadow-2xs ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
            language === 'en'
              ? 'bg-[#2F5C3F] text-white shadow-xs'
              : 'text-[#55604F] hover:text-[#1E2B1F]'
          }`}
          title="English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('ceb')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
            language === 'ceb'
              ? 'bg-[#2F5C3F] text-white shadow-xs'
              : 'text-[#55604F] hover:text-[#1E2B1F]'
          }`}
          title="Cebuano / Binisaya"
        >
          CEB
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-[#DED2AE] bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] transition-colors cursor-pointer ${className}`}
        title={t('common.toggleLanguage')}
      >
        <Globe className="w-3.5 h-3.5 text-[#2F5C3F]" />
        <span>{language === 'en' ? 'EN' : 'CEB'}</span>
      </button>
    );
  }

  // Default 'topbar' segmented switch
  return (
    <div 
      className={`inline-flex items-center bg-[#F5EFDD] border border-[#DED2AE] rounded-full p-0.5 shadow-2xs font-mono text-xs ${className}`}
      title={t('common.toggleLanguage')}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-[#203F2B] text-white shadow-xs'
            : 'text-[#55604F] hover:text-[#1E2B1F]'
        }`}
      >
        <span className="text-[11px]">EN</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ceb')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
          language === 'ceb'
            ? 'bg-[#203F2B] text-white shadow-xs'
            : 'text-[#55604F] hover:text-[#1E2B1F]'
        }`}
      >
        <span className="text-[11px]">CEB</span>
      </button>
    </div>
  );
};
