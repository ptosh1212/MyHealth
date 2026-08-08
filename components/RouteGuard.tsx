'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userRole, loading } = useAuthStore();

  useEffect(() => {
    // Don't check while loading
    if (loading) return;

    // Public routes — no login required
    const publicRoutes = ['/auth/', '/instabooking', '/terms'];
    if (pathname === '/' || publicRoutes.some(r => pathname?.startsWith(r))) return;

    // If no role, redirect to login
    if (!userRole) {
      router.push('/auth/login');
      return;
    }

    // Doctor trying to access patient/admin routes
    if (userRole === 'doctor' && (pathname?.startsWith('/patient') || pathname?.startsWith('/admin'))) {
      router.push('/doctor/dashboard');
      return;
    }

    // Patient trying to access doctor/admin routes
    if (userRole === 'patient' && (pathname?.startsWith('/doctor') || pathname?.startsWith('/admin'))) {
      router.push('/patient/home');
      return;
    }

    // Admin trying to access other routes (they can if they want, but usually stay in /admin)
    if (userRole === 'admin' && !pathname?.startsWith('/admin') && !pathname?.startsWith('/auth/')) {
        // Option: restricted to admin panel or allow all? Usually restricted to prevent UI bugs.
        // Let's keep them in /admin for management.
        return;
    }

    // Non-admin trying to access admin routes
    if (userRole !== 'admin' && pathname?.startsWith('/admin')) {
      if (userRole === 'doctor') router.push('/doctor/dashboard');
      else router.push('/patient/home');
      return;
    }
  }, [userRole, pathname, loading, router]);

  // Show loading while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e0a] via-[#0F110B] to-[#1a1410]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}