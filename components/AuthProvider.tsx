'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setUserRole, setLoading, userRole } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUser(user);

      try {
        // ---------------------------------------------------------
        // PUBLIC ROUTES
        // ---------------------------------------------------------
        const isPublicRoute =
          pathname?.startsWith('/instabooking') ||
          pathname?.startsWith('/terms') ||
          pathname?.startsWith('/download') ||
          pathname?.startsWith('/fownload/apk') ||
          pathname?.startsWith('/founder') ||
          pathname?.includes('ADSCUST.html');

        // ---------------------------------------------------------
        // CHECK DOCTOR FIRST
        // ---------------------------------------------------------
        const doctorRef = doc(db, 'doctors', user.uid);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();

          setUserRole('doctor');

          // Get verification status
          const verificationStatus =
            doctorData?.verificationStatus ||
            (doctorData?.verified === true ? 'approved' : 'pending');

          // -------------------------------------------------------
          // DOCTOR ROUTING
          // -------------------------------------------------------

          if (!isPublicRoute) {
            // Pending doctor
            if (
              verificationStatus === 'pending' &&
              !pathname?.startsWith('/doctor/verification-pending')
            ) {
              router.push('/doctor/verification-pending');
            }

            // Rejected doctor
            else if (
              verificationStatus === 'rejected' &&
              !pathname?.startsWith('/doctor/verification-pending')
            ) {
              router.push('/doctor/verification-pending');
            }

            // Approved doctor
            else if (
              verificationStatus === 'approved' &&
              pathname?.startsWith('/doctor/verification-pending')
            ) {
              router.push('/doctor/dashboard');
            }

            // Doctor trying to access patient pages
            else if (pathname?.startsWith('/patient')) {
              if (verificationStatus === 'pending') {
                router.push('/doctor/verification-pending');
              } else {
                router.push('/doctor/dashboard');
              }
            }

            // Doctor trying to access admin
            else if (pathname?.startsWith('/admin')) {
              router.push('/doctor/dashboard');
            }

            // Doctor on login/signup
            else if (pathname?.startsWith('/auth/')) {
              if (verificationStatus === 'pending') {
                router.push('/doctor/verification-pending');
              } else {
                router.push('/doctor/dashboard');
              }
            }
          }

          setLoading(false);
          return;
        }

        // ---------------------------------------------------------
        // NOT A DOCTOR → EXISTING USER LOGIC
        // ---------------------------------------------------------
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        const role = userSnap.exists()
          ? userSnap.data()?.role || 'patient'
          : 'patient';

        setUserRole(role);

        // ---------------------------------------------------------
        // KEEP PATIENT / ADMIN BEHAVIOUR
        // ---------------------------------------------------------
        if (!isPublicRoute) {
          if (pathname?.startsWith('/admin') && role !== 'admin') {
            router.push('/patient/home');
          } else if (
            pathname?.startsWith('/doctor') &&
            role !== 'doctor'
          ) {
            router.push('/patient/home');
          } else if (
            pathname?.startsWith('/patient') &&
            role === 'admin'
          ) {
            router.push('/admin');
          } else if (
            pathname?.startsWith('/auth/')
          ) {
            if (role === 'admin') {
              router.push('/admin');
            } else {
              router.push('/patient/home');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('patient');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setUserRole, setLoading, router, pathname]);

  // ---------------------------------------------------------------
  // EXTRA ROUTE PROTECTION
  // Only doctor verification handling is added here.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (
      pathname?.startsWith('/instabooking') ||
      pathname?.startsWith('/terms') ||
      pathname?.includes('ADSCUST.html')
    ) {
      return;
    }

    if (!userRole || !pathname) return;

    // Doctor accessing patient pages
    if (
      userRole === 'doctor' &&
      pathname.startsWith('/patient')
    ) {
      // The main auth listener will determine whether the doctor
      // is pending or approved.
      router.push('/doctor/dashboard');
    }

    // Non-doctor accessing doctor pages
    if (
      pathname.startsWith('/doctor') &&
      userRole !== 'doctor'
    ) {
      router.push('/patient/home');
    }

    // Non-admin accessing admin
    if (
      pathname.startsWith('/admin') &&
      userRole !== 'admin'
    ) {
      router.push('/patient/home');
    }
  }, [userRole, pathname, router]);

  return <>{children}</>;
}