'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, ChevronDown, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, signOut: storeSignOut } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  const isDoctor = userRole === 'doctor' || pathname?.startsWith('/doctor');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      storeSignOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      where('unreadCount', '>', 0)
    );
    const unsub = onSnapshot(q, (snap) => {
      setHasUnread(!snap.empty);
    });
    return () => unsub();
  }, [user?.uid]);

  const displayName = user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 h-14 flex items-center border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href={isDoctor ? '/doctor/dashboard' : '/patient/home'} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="#ffffff" />
              <path d="M12 2L3 7l9 5 9-5L12 2z" fill="rgba(255,255,255,0.35)" />
            </svg>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-gray-900">
            My <span className="text-teal-600">Health</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Chat Link Quick Access */}
          <Link
            href={isDoctor ? '/doctor/dashboard' : '/patient/home'}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all relative"
          >
            <MessageSquare size={18} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 border border-white" />
            )}
          </Link>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-teal-700">{initials}</span>
              </div>
              <span className="text-[13px] font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden animate-scale-in origin-top-right">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                    <span className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      isDoctor
                        ? 'bg-violet-50 text-violet-700 border border-violet-200'
                        : 'bg-teal-50 text-teal-700 border border-teal-200'
                    }`}>
                      {isDoctor ? '🩺 Doctor' : '👤 Patient'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="p-2">
                    <Link
                      href={isDoctor ? '/doctor/profile' : '/patient/profile'}
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all text-sm"
                    >
                      <User size={16} />
                      My Profile
                    </Link>
                    <button
                      onClick={() => { setShowMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all text-sm font-medium mt-0.5"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}