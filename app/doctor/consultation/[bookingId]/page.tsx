'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  endConsultation,
  subscribeToConsultation,
} from '@/lib/consultation';
import VideoConsultation from '@/components/VideoConsultation';

export default function DoctorConsultationPage() {
  const params = useParams();
  const router = useRouter();

  const bookingId = params.bookingId as string;

  const { user } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !bookingId) return;

    const load = async () => {
      try {
        const bookingSnap = await getDoc(
          doc(db, 'bookings', bookingId)
        );

        if (!bookingSnap.exists()) {
          router.replace('/doctor/appointments');
          return;
        }

        const data = bookingSnap.data();

        if (data.doctorId !== user.uid) {
          router.replace('/doctor/appointments');
          return;
        }

        setBooking({
          id: bookingSnap.id,
          ...data,
        });

        setAuthorized(true);
      } catch (error) {
        console.error(error);
        router.replace('/doctor/appointments');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId, user?.uid, router]);

  useEffect(() => {
    if (!authorized) return;

    return subscribeToConsultation(
      bookingId,
      consultation => {
        if (!consultation) return;

        if (consultation.status === 'ended') {
          router.replace('/doctor/appointments');
        }
      }
    );
  }, [authorized, bookingId, router]);

  if (loading || !booking || !authorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <VideoConsultation
      bookingId={bookingId}
      peerRole="doctor"
      remoteName={booking.patientName || 'Patient'}
      onLeave={async () => {
        try {
          await endConsultation(bookingId);
        } catch (error) {
          console.error('Failed to end consultation:', error);
        }

        router.replace('/doctor/appointments');
      }}
    />
  );
}