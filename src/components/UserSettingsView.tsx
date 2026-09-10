import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  ShieldAlert, 
  MapPin, 
  User as UserIcon, 
  Check, 
  AlertTriangle,
  HeartPulse,
  Sliders,
  Play,
  Sparkles
} from 'lucide-react';
import { User, PigRecord } from '../types';

export interface UserSettingsViewProps {
  currentUser: User;
  onSaveNotificationSettings?: () => void;
  pigs: PigRecord[];
}

export interface FocalNotificationSettings {
  notifyOnBarangayUpdate: boolean;
  notifyOnSuspectStatus: boolean;
  notifyOnQuarantineStatus: boolean;
  enableBrowserPush: boolean;
  soundAlerts: boolean;
}

const DEFAULT_SETTINGS: FocalNotificationSettings = {
  notifyOnBarangayUpdate: true,
  notifyOnSuspectStatus: true,
  notifyOnQuarantineStatus: true,
  enableBrowserPush: false,
  soundAlerts: true
};

// Pure offline audio synthesizer for pleasant notification alerts
export function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, ctx.currentTime); // G5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (err) {
    console.warn("Audio Context chime failed to play:", err);
  }
}

export function triggerBrowserPush(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: 'swine-registry-alert',
        badge: '/hinunangan-bg.jpg'
      });
    } catch (e) {
      console.warn("Native Notification trigger failed:", e);
    }
  }
}

export function triggerUnifiedAlert(title: string, body: string, settings: FocalNotificationSettings) {
  // 1. Play chime if sound alerts are active
  if (settings.soundAlerts) {
    playAlertChime();
  }
  // 2. Trigger native browser push
  if (settings.enableBrowserPush) {
    triggerBrowserPush(title, body);
  }
}

export function UserSettingsView({ currentUser, pigs }: UserSettingsViewProps) {
  const [settings, setSettings] = useState<FocalNotificationSettings>(() => {
    const stored = localStorage.getItem('focal_notification_settings');
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [toastMessage, setToastMessage] = useState('');
  const [testNotificationActive, setTestNotificationActive] = useState(false);

  // Request browser permission for native Web Notifications
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("Browser push notifications are not supported in this browser.");
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setSettings(prev => {
        const updated = { ...prev, enableBrowserPush: true };
        localStorage.setItem('focal_notification_settings', JSON.stringify(updated));
        return updated;
      });
      triggerBrowserPush("🔔 Notifications Enabled", "You will now receive desktop push notifications from the Hinunangan Swine Registry.");
      showToast("Browser push notifications activated successfully.");
    } else {
      setSettings(prev => {
        const updated = { ...prev, enableBrowserPush: false };
        localStorage.setItem('focal_notification_settings', JSON.stringify(updated));
        return updated;
      });
      showToast("Notification permission denied or blocked.");
    }
  };

  const toggleSetting = (key: keyof FocalNotificationSettings) => {
    setSettings(prev => {
      let val = !prev[key];
      const updated = { ...prev, [key]: val };
      localStorage.setItem('focal_notification_settings', JSON.stringify(updated));
      return updated;
    });
    showToast("Trigger preference updated and saved.");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Run a manual trigger simulation to verify physical/audio system feedback instantly
  const runSimulation = (type: 'barangay_update' | 'suspect_shift' | 'quarantine_shift') => {
    setTestNotificationActive(true);
    let title = '';
    let body = '';

    const testBrgy = currentUser.barangay || 'Poblacion';

    if (type === 'barangay_update') {
      title = `📢 Barangay Registry Alert`;
      body = `Swine record POB-2026-081 has been registered in Brgy. ${testBrgy}.`;
    } else if (type === 'suspect_shift') {
      title = `⚠️ Health Status Shift: SUSPECT`;
      body = `Swine record ILAY-2026-042 in Brgy. ${testBrgy} shifted to SUSPECT due to missed vaccines.`;
    } else if (type === 'quarantine_shift') {
      title = `🚨 Health Status Shift: QUARANTINED`;
      body = `Swine record BAG-2026-115 in Brgy. ${testBrgy} marked as QUARANTINED due to sudden mortality.`;
    }

    triggerUnifiedAlert(title, body, settings);
    showToast(`Trigger active: ${title}`);
    setTimeout(() => setTestNotificationActive(false), 800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Toast Alert popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#203F2B] text-[#F5EFDD] border border-[#D9A441] rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 animate-fadeIn text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-[#D9A441]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Settings Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DED2AE] p-6 rounded-3xl shadow-3xs">
        <div className="space-y-1">
          <h2 className="text-xl font-serif font-extrabold text-[#203F2B] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D9A441]" />
            <span>Focal Officer Settings</span>
          </h2>
          <p className="text-xs text-[#55604F]">
            Configure and test real-time notification rules, hardware chimes, and outbreak monitoring triggers.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#FAF6EC] border border-[#EAE1C4] px-4 py-2 rounded-2xl text-xs font-mono font-bold text-[#2F5C3F]">
          <MapPin className="w-4 h-4 text-[#D9A441]" />
          <span>Barangay Scope: {currentUser.barangay || 'All Barangays'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white border border-[#DED2AE] rounded-3xl shadow-3xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="border-b border-[#FAF6EC] pb-3">
              <h3 className="font-serif font-bold text-sm text-[#203F2B] uppercase tracking-wide">Focal Profile</h3>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-3">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Focal officer profile" className="w-20 h-20 rounded-full object-cover border-2 border-[#D9A441] shadow-xs" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#4F7A55] text-[#FAF6EC] flex items-center justify-center font-bold text-3xl shadow-xs">
                  {currentUser.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="font-serif font-extrabold text-base text-[#1E2B1F]">{currentUser.fullName}</h4>
                <p className="text-xs font-mono text-[#D9A441] font-bold">@{currentUser.username}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="bg-[#FAF6EC] p-3 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-[#55604F] uppercase tracking-wider block">Assigned Barangay</span>
                <span className="text-xs font-extrabold text-[#2F5C3F] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D9A441]" />
                  {currentUser.barangay || 'Municipal Administrator'}
                </span>
              </div>
              <div className="bg-[#FAF6EC] p-3 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-[#55604F] uppercase tracking-wider block">Security Credentials</span>
                <span className="text-xs font-extrabold text-[#2F5C3F] flex items-center gap-1.5 capitalize">
                  <UserIcon className="w-3.5 h-3.5 text-[#D9A441]" />
                  {currentUser.role} Account
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#FAF6EC] p-4 text-center border-t border-[#EAE1C4]">
            <p className="text-[10px] text-[#55604F] leading-relaxed">
              Hinunangan Local Swine Surveillance Network • Official Account Registry
            </p>
          </div>
        </div>

        {/* Configurations Card */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Notification Rule Switches */}
          <div className="bg-white border border-[#DED2AE] p-6 rounded-3xl shadow-3xs space-y-4">
            <div className="border-b border-[#FAF6EC] pb-3 flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-[#203F2B] uppercase tracking-wide flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#D9A441]" />
                <span>Trigger Configuration</span>
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Surveillance Active
              </span>
            </div>

            {/* Switch Items */}
            <div className="space-y-3.5">
              
              {/* Trigger 1: Barangay Updates */}
              <div className="flex items-start justify-between gap-4 p-3 hover:bg-[#FAF6EC] rounded-2xl transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#1E2B1F] block">On Barangay Record Updates</span>
                  <span className="text-[11px] text-[#55604F] block leading-tight">
                    Receive alert chimes and triggers when any swine record in your designated barangay ({currentUser.barangay || 'Hinunangan'}) is created or modified.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('notifyOnBarangayUpdate')}
                  className={`w-11 h-6 shrink-0 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                    settings.notifyOnBarangayUpdate ? 'bg-[#203F2B]' : 'bg-[#DED2AE]'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    settings.notifyOnBarangayUpdate ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Trigger 2: Shift to Suspect */}
              <div className="flex items-start justify-between gap-4 p-3 hover:bg-[#FAF6EC] rounded-2xl transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#1E2B1F] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>On Status Shift to Suspect</span>
                  </span>
                  <span className="text-[11px] text-[#55604F] block leading-tight">
                    Trigger warning notifications when any swine's health category shifts to 'Suspect' / Unvaccinated.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('notifyOnSuspectStatus')}
                  className={`w-11 h-6 shrink-0 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                    settings.notifyOnSuspectStatus ? 'bg-[#203F2B]' : 'bg-[#DED2AE]'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    settings.notifyOnSuspectStatus ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Trigger 3: Shift to Quarantine */}
              <div className="flex items-start justify-between gap-4 p-3 hover:bg-[#FAF6EC] rounded-2xl transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#1E2B1F] flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>On Status Shift to Quarantined</span>
                  </span>
                  <span className="text-[11px] text-[#55604F] block leading-tight">
                    Immediate high-priority triggers when a mortality is recorded and the swine is placed in 'Quarantined / Deceased' category.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('notifyOnQuarantineStatus')}
                  className={`w-11 h-6 shrink-0 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                    settings.notifyOnQuarantineStatus ? 'bg-[#203F2B]' : 'bg-[#DED2AE]'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    settings.notifyOnQuarantineStatus ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 4: Sound Chimes */}
              <div className="flex items-start justify-between gap-4 p-3 border-t border-[#FAF6EC] pt-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#1E2B1F] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#D9A441]" />
                    <span>Play Sound Chimes on Alerts</span>
                  </span>
                  <span className="text-[11px] text-[#55604F] block leading-tight">
                    Uses built-in browser synthesizer to play a high-frequency acoustic alert chime when a trigger is registered.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('soundAlerts')}
                  className={`w-11 h-6 shrink-0 flex items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                    settings.soundAlerts ? 'bg-[#203F2B]' : 'bg-[#DED2AE]'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                    settings.soundAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          </div>

          {/* Browser Notifications Activation card */}
          <div className="bg-[#203F2B] border border-[#2F5C3F] p-6 rounded-3xl text-white space-y-4 shadow-sm">
            <div className="space-y-1">
              <h4 className="font-serif font-extrabold text-sm text-[#D9A441] uppercase tracking-wide flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                <span>HTML5 Browser Push Notifications</span>
              </h4>
              <p className="text-[11px] text-[#B9CBB9] leading-relaxed">
                Connect directly with your browser's background push service. When registered, notifications will appear on your desktop or mobile locked screen even if the Hinunangan Swine surveillance app is minimised.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 border border-white/15 p-3 rounded-2xl">
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold block">Native Browser Permission</span>
                <span className="text-[10px] text-[#93A893] block font-mono">
                  Current: {('Notification' in window) ? Notification.permission.toUpperCase() : 'NOT SUPPORTED'}
                </span>
              </div>
              
              {settings.enableBrowserPush && ('Notification' in window) && Notification.permission === 'granted' ? (
                <div className="bg-[#D9A441] text-[#203F2B] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Push Granted</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] text-xs font-bold rounded-xl transition-transform active:scale-95 cursor-pointer shadow-md"
                >
                  Authorize Push Permissions
                </button>
              )}
            </div>
          </div>

          {/* Testing Playground Container */}
          <div className="bg-white border border-[#DED2AE] p-6 rounded-3xl shadow-3xs space-y-4">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-sm text-[#203F2B] uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D9A441]" />
                <span>Surveillance Trigger Testing Playground</span>
              </h3>
              <p className="text-xs text-[#55604F]">
                Simulate events locally to instantly verify and test your acoustic chime synthesis and notification pipelines.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => runSimulation('barangay_update')}
                className="p-3 bg-[#FAF6EC] hover:bg-[#EAE1C4] border border-[#DED2AE] hover:border-[#2F5C3F] rounded-2xl transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2 text-emerald-800 group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#1E2B1F] block">Test Brgy Update</span>
                <span className="text-[9px] text-[#55604F] block mt-1 leading-tight">Simulation for registry actions</span>
              </button>

              <button
                type="button"
                onClick={() => runSimulation('suspect_shift')}
                className="p-3 bg-[#FAF6EC] hover:bg-[#EAE1C4] border border-[#DED2AE] hover:border-amber-400 rounded-2xl transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2 text-amber-800 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#1E2B1F] block">Test Suspect Trigger</span>
                <span className="text-[9px] text-[#55604F] block mt-1 leading-tight">Simulation for health status warnings</span>
              </button>

              <button
                type="button"
                onClick={() => runSimulation('quarantine_shift')}
                className="p-3 bg-[#FAF6EC] hover:bg-[#EAE1C4] border border-[#DED2AE] hover:border-rose-400 rounded-2xl transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-2 text-rose-800 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#1E2B1F] block">Test Quarantine Alert</span>
                <span className="text-[9px] text-[#55604F] block mt-1 leading-tight">Simulation for outbreak mortalities</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
