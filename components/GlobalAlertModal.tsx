'use client';

import { useAlertStore } from '@/lib/alert-store';
import { 
  CheckCircle, AlertCircle, ShieldAlert, Info, 
  X, ChevronRight, Zap 
} from 'lucide-react';

export default function GlobalAlertModal() {
  const { isOpen, title, message, type, hideAlert, onConfirm } = useAlertStore();

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: <CheckCircle className="text-primary" size={48} />,
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      shadow: 'shadow-[0_0_40px_rgba(0,229,160,0.15)]',
      accent: 'text-primary'
    },
    error: {
      icon: <AlertCircle className="text-rose" size={48} />,
      bg: 'bg-rose/10',
      border: 'border-rose/20',
      shadow: 'shadow-[0_0_40px_rgba(255,59,92,0.15)]',
      accent: 'text-rose'
    },
    warning: {
      icon: <ShieldAlert className="text-amber" size={48} />,
      bg: 'bg-amber/10',
      border: 'border-amber/20',
      shadow: 'shadow-[0_0_40px_rgba(255,193,7,0.15)]',
      accent: 'text-amber'
    },
    info: {
      icon: <Info className="text-violet" size={48} />,
      bg: 'bg-violet/10',
      border: 'border-violet/20',
      shadow: 'shadow-[0_0_40px_rgba(139,92,246,0.15)]',
      accent: 'text-violet'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  const handleConfirm = () => {
    hideAlert();
    if (onConfirm) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" 
        onClick={hideAlert} 
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-sm bg-[#0E1419] rounded-[32px] border border-white/10 shadow-2xl p-8 flex flex-col items-center text-center animate-scale-in`}>
        
        {/* Decorative Aura */}
        <div className={`absolute -top-20 w-40 h-40 rounded-full blur-[80px] opacity-20 ${config.bg}`} />

        {/* Status Icon */}
        <div className={`w-24 h-24 rounded-[32px] ${config.bg} ${config.border} flex items-center justify-center mb-6 relative z-10`}>
           {config.icon}
        </div>

        {/* Content */}
        <h3 className="text-[22px] font-black text-white mb-2 leading-tight uppercase tracking-tight">
          {title}
        </h3>
        <p className="text-[14px] text-white/50 leading-relaxed font-medium mb-8 max-w-[240px]">
          {message}
        </p>

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className={`w-full h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center gap-2 group hover:bg-white/[0.08] transition-all active:scale-95`}
        >
          <span className={`text-[14px] font-black uppercase tracking-[2px] ${config.accent}`}>
            Got It
          </span>
          <ChevronRight size={18} className={`${config.accent} group-hover:translate-x-1 transition-transform`} />
        </button>

        {/* Close hint for better UX */}
        <button 
          onClick={hideAlert}
          className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <style>{`
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}