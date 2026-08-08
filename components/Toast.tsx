'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const config = {
  success: {
    icon: CheckCircle2,
    color: '#00E5A0',
    bg: 'rgba(0,229,160,0.08)',
    border: 'rgba(0,229,160,0.2)',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    color: '#FF4D6D',
    bg: 'rgba(255,77,109,0.08)',
    border: 'rgba(255,77,109,0.2)',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    color: '#FFB547',
    bg: 'rgba(255,181,71,0.08)',
    border: 'rgba(255,181,71,0.2)',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: '#7C6FFF',
    bg: 'rgba(124,111,255,0.08)',
    border: 'rgba(124,111,255,0.2)',
    label: 'Info',
  },
};

export default function Toast({ message, type = 'info', duration = 3500, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const c = config[type];
  const Icon = c.icon;

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 280);
  };

  useEffect(() => {
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-2xl min-w-[280px] max-w-[360px] shadow-modal"
      style={{
        background: '#0E1419',
        border: `1px solid ${c.border}`,
        animation: exiting
          ? 'toastOut 0.28s ease-in forwards'
          : 'toastIn 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${c.border}, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: c.bg }}
      >
        <Icon size={16} style={{ color: c.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[13px] font-semibold text-white/90 mb-0.5">{c.label}</p>
        <p className="text-[12px] text-white/50 leading-relaxed">{message}</p>
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all mt-0.5 flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/* Toast container — usage: render this at app root and use context / zustand */
export function ToastContainer({ toasts }: { toasts: Array<{ id: string; message: string; type: ToastType }> }) {
  return (
    <div className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 lg:bottom-6 lg:right-6">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => {}} />
      ))}
    </div>
  );
}