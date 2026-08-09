'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

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
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-white/95 transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center text-center px-6">
        <div className="w-16 h-16 border-2 border-black bg-black flex items-center justify-center mb-6">
          <Check size={32} strokeWidth={3} className="text-white" />
        </div>

        <h2 className="text-xl font-bold text-black mb-2">{message}</h2>

        {subMessage && (
          <p className="text-sm text-gray-500">{subMessage}</p>
        )}
      </div>
    </div>
  );
}