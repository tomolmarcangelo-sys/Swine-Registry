import React, { useState } from 'react';
import { X, Lock, User as UserIcon, Shield, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { DEFAULT_USERS } from '../data/constants';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  users: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  users
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const found = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (!found) {
      setErrorMsg('Invalid username or password. Please verify your credentials or use the demo quick-login below.');
      return;
    }

    onLoginSuccess(found);
    onClose();
  };

  const handleQuickLogin = (demoUser: User) => {
    setUsername(demoUser.username);
    setPassword(demoUser.password || 'admin123');
    onLoginSuccess(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141A12]/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-[#DED2AE] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* HEADER */}
        <div className="bg-[#203F2B] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4F7A55] to-[#203F2B] border-2 border-[#D9A441] flex items-center justify-center font-serif text-lg font-bold text-[#D9A441] shadow-md">
              DA
            </div>
            <div>
              <span className="font-mono text-[10px] text-[#D9A441] uppercase tracking-widest block font-semibold">
                LGU Hinunangan
              </span>
              <h3 className="font-serif text-xl font-bold text-white">
                Staff Portal Sign In
              </h3>
            </div>
          </div>

          <p className="text-xs text-[#C9D6C9]">
            Secure access for Municipal Agriculturist staff and all 40 Barangay focal persons.
          </p>
        </div>

        {/* BODY FORM */}
        <div className="p-6 space-y-4 text-xs text-[#1E2B1F]">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#55604F]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. admin or poblacion.brgy"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#55604F]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1E2B1F] focus:bg-white focus:border-[#2F5C3F] outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2F5C3F] hover:bg-[#203F2B] text-white font-bold rounded-xl text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Sign In to System</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* QUICK DEMO LOGINS */}
          <div className="mt-5 pt-4 border-t border-[#EAE1C4] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#55604F] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>Quick Demo Access (1-Click)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin(DEFAULT_USERS[0])}
                className="p-2.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] rounded-xl text-left transition-colors group"
              >
                <div className="font-bold text-[#203F2B] text-xs group-hover:text-[#2F5C3F]">
                  👑 Central Admin
                </div>
                <div className="text-[10px] text-[#55604F] font-mono">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(DEFAULT_USERS[1])}
                className="p-2.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] rounded-xl text-left transition-colors group"
              >
                <div className="font-bold text-[#203F2B] text-xs group-hover:text-[#2F5C3F]">
                  📍 Brgy. Poblacion
                </div>
                <div className="text-[10px] text-[#55604F] font-mono">poblacion.brgy</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(DEFAULT_USERS[2])}
                className="p-2.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] rounded-xl text-left transition-colors group"
              >
                <div className="font-bold text-[#203F2B] text-xs group-hover:text-[#2F5C3F]">
                  📍 Brgy. Nava
                </div>
                <div className="text-[10px] text-[#55604F] font-mono">nava.brgy</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(DEFAULT_USERS[3])}
                className="p-2.5 bg-[#F5EFDD] hover:bg-[#EAE1C4] border border-[#DED2AE] rounded-xl text-left transition-colors group"
              >
                <div className="font-bold text-[#203F2B] text-xs group-hover:text-[#2F5C3F]">
                  📍 Brgy. Ambacon
                </div>
                <div className="text-[10px] text-[#55604F] font-mono">ambacon.brgy</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
