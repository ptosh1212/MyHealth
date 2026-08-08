'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  LayoutDashboard, Users, Calendar, Wallet, MessageSquare,
  User, LogOut, PhoneCall, Pill, QrCode, Settings, X, Bot
} from 'lucide-react';

// ---- palette (matches dashboard / signup / login) --------------------------
const paper = '#FAF8F3';
const ink = '#14322E';
const inkMuted = '#5C6B63';
const sage = '#3F6F5E';
const sageTint = '#EDF2EE';
const line = '#E1DBCB';
const stamp = '#A5342C';
const stampTint = '#FBEDEB';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/doctor/dashboard' },
  { icon: Bot, label: 'AI Receptionist', href: '/doctor/ai-receptionist', badge: 'NEW' },
  { icon: MessageSquare, label: 'Inbox', href: '/doctor/chats' },
  { icon: Calendar, label: 'Appointments', href: '/doctor/appointments' },
  { icon: PhoneCall, label: 'Callbacks', href: '/doctor/callbacks' },
  { icon: Users, label: 'Patients', href: '/doctor/patients' },
  { icon: Pill, label: 'Medicines', href: '/doctor/medicines' },
  { icon: QrCode, label: 'QR Booking', href: '/doctor/qr-booking' },
  { icon: Settings, label: 'Settings', href: '/doctor/settings' },
  { icon: Wallet, label: 'Earnings', href: '/doctor/earnings' },
  { icon: User, label: 'Profile', href: '/doctor/profile' },
];

const mobileNav = [
  { icon: LayoutDashboard, label: 'Home', href: '/doctor/dashboard' },
  { icon: MessageSquare, label: 'Inbox', href: '/doctor/chats' },
  { icon: Calendar, label: 'Appts', href: '/doctor/appointments' },
];

export default function DoctorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut: storeSignOut, user } = useAuthStore();
  const [showSheet, setShowSheet] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      storeSignOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const displayName = user?.email?.split('@')[0] || 'Doctor';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 h-full w-64 flex-col border-r z-40"
        style={{ backgroundColor: paper, borderColor: line }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: line }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ink }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill={paper} />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[14px] tracking-tight" style={{ color: ink }}>MyHealth</p>
              <p className="text-[11px]" style={{ color: inkMuted }}>Doctor Portal</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: sageTint, color: sage }
                    : { color: inkMuted }
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {(item as any).badge && !isActive && (
                  <span
                    className="ml-auto px-1.5 py-0.5 text-[9px] font-semibold rounded-full uppercase tracking-wider"
                    style={{ backgroundColor: stampTint, color: stamp }}
                  >
                    {(item as any).badge}
                  </span>
                )}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sage }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className="p-3 border-t" style={{ borderColor: line }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2" style={{ backgroundColor: sageTint }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border"
              style={{ borderColor: sage, backgroundColor: paper }}
            >
              <span className="text-[12px] font-semibold" style={{ color: sage }}>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: ink }}>{displayName}</p>
              <p className="text-[11px] truncate" style={{ color: inkMuted }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-[14px] font-medium hover:opacity-80"
            style={{ color: stamp }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-2xl border shadow-sm"
          style={{ backgroundColor: paper, borderColor: line }}
        >
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors"
                style={{ color: isActive ? sage : inkMuted }}
              >
                <div className="p-1.5 rounded-xl" style={isActive ? { backgroundColor: sageTint } : {}}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-semibold" style={{ opacity: isActive ? 1 : 0 }}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowSheet(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors"
            style={{ color: inkMuted }}
          >
            <div className="p-1.5">
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-semibold opacity-60">More</span>
          </button>
        </div>
      </nav>

      {/* ═══ MOBILE MORE SHEET ═══ */}
      {showSheet && (
        <div className="lg:hidden fixed inset-0 z-[80] flex items-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowSheet(false)}
          />
          <div
            className="relative w-full rounded-t-[28px] border-t shadow-xl pb-safe"
            style={{ backgroundColor: paper, borderColor: line }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: line }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <p className="text-[16px] font-semibold" style={{ color: ink }}>Menu</p>
              <button
                onClick={() => setShowSheet(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: sageTint, color: inkMuted }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-4 gap-3 px-4 pb-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowSheet(false)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                      style={
                        isActive
                          ? { backgroundColor: sageTint, borderColor: sage }
                          : { backgroundColor: paper, borderColor: line }
                      }
                    >
                      <Icon size={22} style={{ color: isActive ? sage : inkMuted }} />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight" style={{ color: inkMuted }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              {/* Logout in grid */}
              <button
                onClick={() => { setShowSheet(false); handleLogout(); }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: stampTint, borderColor: stamp }}>
                  <LogOut size={22} style={{ color: stamp }} />
                </div>
                <span className="text-[10px] font-medium text-center" style={{ color: stamp }}>Sign Out</span>
              </button>
            </div>

            {/* User card */}
            <div className="mx-4 mb-6 p-4 rounded-2xl border flex items-center gap-3" style={{ backgroundColor: sageTint, borderColor: line }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: sage, backgroundColor: paper }}>
                <span className="text-[13px] font-semibold" style={{ color: sage }}>{initials}</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: ink }}>{displayName}</p>
                <p className="text-[12px]" style={{ color: inkMuted }}>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}