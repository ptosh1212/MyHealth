'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '@/lib/store';
import { auth, db } from '@/lib/firebase';

export default function RouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, userRole, loading } = useAuthStore();

  const [checkingDoctor, setCheckingDoctor] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkRoutes = async () => {
      // Don't check while AuthProvider is loading
      if (loading) return;

      // Public routes — no login required
      const publicRoutes = [
        '/auth/',
        '/instabooking',
        '/terms',
        '/founder',
      ];

      if (
        pathname === '/' ||
        publicRoutes.some((route) => pathname?.startsWith(route))
      ) {
        return;
      }

      // No logged-in user / no role
      if (!user || !userRole) {
        router.replace('/auth/login');
        return;
      }

      /*
       * ============================================================
       * DOCTOR ROUTE PROTECTION
       * ============================================================
       *
       * Doctors are checked against:
       * doctors/{uid}
       *
       * Pending doctors are ONLY allowed to access:
       * /doctor/verification-pending
       */
      if (userRole === 'doctor') {
        setCheckingDoctor(true);

        try {
          const doctorRef = doc(db, 'doctors', user.uid);
          const doctorSnap = await getDoc(doctorRef);

          if (cancelled) return;

          // Doctor document doesn't exist
          if (!doctorSnap.exists()) {
            console.error(
              'Doctor account found in auth/store but doctors document is missing.'
            );

            setCheckingDoctor(false);
            router.replace('/auth/login');
            return;
          }

          const doctorData = doctorSnap.data();

          /*
           * Support both:
           *
           * verificationStatus: "pending"
           *
           * and the older:
           *
           * verified: true / false
           */
          const verificationStatus =
            doctorData?.verificationStatus ||
            (doctorData?.verified ? 'approved' : 'pending');

          /*
           * PENDING DOCTOR
           *
           * They can ONLY access the verification-pending page.
           */
          if (verificationStatus === 'pending') {
            setCheckingDoctor(false);

            if (
              pathname !== '/doctor/verification-pending'
            ) {
              router.replace('/doctor/verification-pending');
            }

            return;
          }

          /*
           * APPROVED DOCTOR
           *
           * If an approved doctor visits the pending page,
           * send them to their dashboard.
           */
          if (
            verificationStatus !== 'pending' &&
            pathname === '/doctor/verification-pending'
          ) {
            setCheckingDoctor(false);
            router.replace('/doctor/dashboard');
            return;
          }

          setCheckingDoctor(false);

          /*
           * Approved doctor trying to access patient/admin routes
           */
          if (
            pathname?.startsWith('/patient') ||
            pathname?.startsWith('/admin')
          ) {
            router.replace('/doctor/dashboard');
            return;
          }

          return;
        } catch (error) {
          console.error(
            'Error checking doctor verification:',
            error
          );

          if (!cancelled) {
            setCheckingDoctor(false);
            router.replace('/auth/login');
          }

          return;
        }
      }

      /*
       * ============================================================
       * PATIENT ROUTES
       * ============================================================
       *
       * Patient logic remains unchanged.
       */
      if (userRole === 'patient') {
        // Patient trying to access doctor/admin routes
        if (
          pathname?.startsWith('/doctor') ||
          pathname?.startsWith('/admin')
        ) {
          router.replace('/patient/home');
          return;
        }

        return;
      }

      /*
       * ============================================================
       * ADMIN ROUTES
       * ============================================================
       */

      if (userRole === 'admin') {
        // Admin can access everything.
        return;
      }

      /*
       * ============================================================
       * FALLBACK
       * ============================================================
       */

      if (
        userRole !== 'admin' &&
        pathname?.startsWith('/admin')
      ) {
        if (userRole === 'doctor') {
          router.replace('/doctor/dashboard');
        } else {
          router.replace('/patient/home');
        }

        return;
      }
    };

    checkRoutes();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    userRole,
    pathname,
    loading,
    router,
  ]);

  /*
   * Show loading while authentication is being checked.
   */
  if (loading || checkingDoctor) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F3]">
      <div className="flex items-center justify-center">
        <span
          className="text-4xl font-semibold"
          style={{
            color: '#0A1F47',
            animation: 'myHealthFade 1.8s ease-in-out infinite',
          }}
        >
          My Health
        </span>

        <style jsx>{`
          @keyframes myHealthFade {
            0% {
              opacity: 0;
              transform: translateY(12px);
            }

            25% {
              opacity: 1;
              transform: translateY(0);
            }

            70% {
              opacity: 1;
              transform: translateY(0);
            }

            100% {
              opacity: 0;
              transform: translateY(-6px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
}