'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setUserRole, setLoading, userRole } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // If role already set in store (e.g. just signed up), skip Firestore fetch
        const storedRole = useAuthStore.getState().userRole;
        if (storedRole) {
          setLoading(false);
          return;
        }

        // Small delay on fresh auth to allow Firestore writes to complete
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
          // Check in doctors collection first
          let userDoc = await getDoc(doc(db, 'doctors', user.uid));
          let role: 'patient' | 'doctor' | 'admin' = 'patient';
          let verificationStatus = null;
          
          if (userDoc.exists()) {
            role = 'doctor';
            setUserRole('doctor');
            const doctorData = userDoc.data();
            verificationStatus = doctorData?.verificationStatus || (doctorData?.verified ? 'approved' : 'pending');
          } else {
            // Check in users collection
            userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists()) {
              role = userDoc.data()?.role || 'patient';
              setUserRole(role);
            } else {
              // Default to patient
              setUserRole('patient');
            }
          }

          // Skip redirects for public pages
          const isPublicRoute = pathname?.startsWith('/instabooking') || pathname?.startsWith('/terms') || pathname?.includes('ADSCUST.html');

          // Redirect based on role and verification status
          if (!isPublicRoute && pathname?.includes('/auth/')) {
            if (role === 'admin') {
              router.push('/admin');
            } else if (role === 'doctor') {
              // Check verification status for doctors
              if (verificationStatus === 'pending') {
                router.push('/doctor/dashboard');
              } else {
                router.push('/doctor/dashboard');
              }
            } else {
              router.push('/patient/home');
            }
          } else if (!isPublicRoute && role === 'doctor' && verificationStatus === 'pending' && !pathname?.includes('/verification-pending')) {
            // Redirect unverified doctors to pending page
            router.push('/doctor/dashboard');
          } else if (!isPublicRoute && pathname?.startsWith('/doctor') && role !== 'doctor') {
            // If trying to access doctor pages but not a doctor, redirect to patient
            router.push('/patient/home');
          } else if (!isPublicRoute && pathname?.startsWith('/patient') && role === 'doctor') {
            // If trying to access patient pages but is a doctor, redirect to doctor dashboard
            if (verificationStatus === 'pending') {
              router.push('/doctor/dashboard');
            } else {
              router.push('/doctor/dashboard');
            }
          } else if (!isPublicRoute && pathname?.startsWith('/admin') && role !== 'admin') {
            // Protect admin routes
            router.push('/patient/home');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('patient');
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setUserRole, setLoading, router, pathname]);

  // Additional check on mount for stored role
  useEffect(() => {
    // Skip all checks for public routes
    if (pathname?.startsWith('/instabooking') || pathname?.startsWith('/terms') || pathname?.includes('ADSCUST.html')) return;

    if (userRole && pathname) {
      if (pathname.startsWith('/doctor') && userRole !== 'doctor') {
        router.push('/patient/home');
      } else if (pathname.startsWith('/patient') && userRole === 'doctor') {
        router.push('/doctor/dashboard');
      } else if (pathname.startsWith('/admin') && userRole !== 'admin') {
        router.push('/patient/home');
      }
    }
  }, [userRole, pathname, router]);

  return <>{children}</>;
}