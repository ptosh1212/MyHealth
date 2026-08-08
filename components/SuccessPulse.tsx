'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';

interface SuccessPulseProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  subMessage?: string;
}

export default function SuccessPulse({ isOpen, onClose, message, subMessage }: SuccessPulseProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActive(true);
      const timer = setTimeout(() => {
        setActive(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center pointer-events-none transition-all duration-700 ${
      active ? 'bg-[#080C10]/80 backdrop-blur-md opacity-100' : 'bg-transparent opacity-0'
    }`}>
      
      <div className="relative flex flex-col items-center text-center px-6">
        
        {/* Shockwave Rings */}
        <div className={`absolute w-32 h-32 rounded-full border-2 border-primary transition-all duration-1000 ${
          active ? 'scale-[4] opacity-0' : 'scale-1 opacity-100'
        }`} />
        <div className={`absolute w-32 h-32 rounded-full border-2 border-primary/50 transition-all duration-1000 delay-200 ${
          active ? 'scale-[3] opacity-0' : 'scale-1 opacity-100'
        }`} />
        
        {/* Content */}
        <div className={`transition-all duration-500 transform ${
          active ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-8'
        }`}>
          <div className="w-24 h-24 rounded-[40px] bg-primary flex items-center justify-center text-[#080C10] shadow-[0_0_50px_rgba(0,229,160,0.5)] mb-8 animate-bounce-subtle">
             <CheckCircle size={48} strokeWidth={3} />
          </div>
          
          <h2 className="text-[32px] font-black text-white tracking-tight leading-none mb-4">
            {message}
          </h2>
          {subMessage && (
            <div className="flex items-center justify-center gap-2 text-primary font-bold tracking-widest text-[12px] uppercase">
              <Sparkles size={14} />
              {subMessage}
            </div>
          )}
        </div>
        
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}