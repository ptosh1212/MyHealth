'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import DoctorSidebar from '@/components/DoctorSidebar';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, userRole, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && (!user || userRole !== 'doctor')) {
      router.push('/auth/login');
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || userRole !== 'doctor') {
    return null;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-dark w-full max-w-[100vw] overflow-x-hidden">
      <DoctorSidebar />
      <main className="flex-1 lg:ml-64 pb-28 lg:pb-0 w-full min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}