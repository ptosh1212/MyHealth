'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, FileText, User, MessageCircle } from 'lucide-react';

const menuItems = [
  { icon: Home, href: '/patient/home', label: 'Home' },
  { icon: MessageCircle, href: '/patient/chats', label: 'Chat' },
  { icon: Calendar, href: '/patient/appointments', label: 'Visits' },
  { icon: FileText, href: '/patient/prescriptions', label: 'Rx' },
  { icon: User, href: '/patient/profile', label: 'Profile' },
];

export default function PatientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      {/* Floating pill */}
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-surface/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 select-none ${
                isActive
                  ? 'text-primary'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary/15 shadow-[0_0_12px_rgba(0,229,160,0.2)]'
                  : ''
              }`}>
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse-slow" />
                )}
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="relative z-10"
                />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`} style={{ width: 28, textAlign: 'center' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}