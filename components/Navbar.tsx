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
    <nav className="sticky top-0 z-50 h-14 flex items-center border-b-2 border-black bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href={isDoctor ? '/doctor/dashboard' : '/patient/home'} className="flex items-center gap-2.5">
          <div className="w-7 h-7 border-2 border-black bg-black flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="#ffffff" />
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-tight text-black">
            My Health
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Chat link */}
          <Link
            href={isDoctor ? '/doctor/dashboard' : '/patient/home'}
            className="p-2 text-black hover:bg-gray-100 transition-colors relative"
          >
            <MessageSquare size={18} />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-black" />
            )}
          </Link>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-1.5 border-2 border-transparent hover:border-black transition-colors"
            >
              <div className="w-7 h-7 border-2 border-black flex items-center justify-center">
                <span className="text-[11px] font-bold text-black">{initials}</span>
              </div>
              <span className="text-[13px] font-medium text-black hidden sm:block max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className={`text-black transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border-2 border-black z-20">
                  {/* User info */}
                  <div className="px-4 py-3 border-b-2 border-black">
                    <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
                    <p className="text-sm font-medium text-black truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 text-[11px] font-bold uppercase px-2 py-0.5 border border-black text-black">
                      {isDoctor ? 'Doctor' : 'Patient'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div>
                    <Link
                      href={isDoctor ? '/doctor/profile' : '/patient/profile'}
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-black hover:bg-gray-100 transition-colors text-sm border-b border-gray-200"
                    >
                      <User size={16} />
                      My profile
                    </Link>
                    <button
                      onClick={() => { setShowMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-black hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                      <LogOut size={16} />
                      Sign out
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