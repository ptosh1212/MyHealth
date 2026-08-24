'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  subscribeToConsultation,
} from '@/lib/consultation';
import VideoConsultation from '@/components/VideoConsultation';

export default function PatientConsultationPage() {
  const params = useParams();
  const router = useRouter();

  const bookingId = params.bookingId as string;

  const { user } = useAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [consultation, setConsultation] = useState<any>(null);
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
          router.replace('/patient/appointments');
          return;
        }

        const data = bookingSnap.data();

        if (data.userId !== user.uid) {
          router.replace('/patient/appointments');
          return;
        }

        setBooking({
          id: bookingSnap.id,
          ...data,
        });

        setAuthorized(true);
      } catch (error) {
        console.error(error);
        router.replace('/patient/appointments');
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
      currentConsultation => {
        setConsultation(currentConsultation);

        if (
          currentConsultation?.status === 'ended'
        ) {
          router.replace('/patient/appointments');
        }
      }
    );
  }, [authorized, bookingId, router]);

  if (loading || !booking || !authorized) {
    return (
      <div className="min-h-screen bg-[#080C10] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!consultation || consultation.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#080C10] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.05] flex items-center justify-center text-white/30">
            <VideoIcon />
          </div>

          <h1 className="mt-5 text-lg font-semibold">
            Waiting for your doctor
          </h1>

          <p className="mt-2 text-sm text-white/35">
            Dr. {booking.doctorName} hasn't started the
            video consultation yet.
          </p>

          <button
            onClick={() => router.back()}
            className="mt-6 px-5 py-3 rounded-xl bg-white/[0.06] text-sm font-semibold hover:bg-white/[0.1]"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoConsultation
      bookingId={bookingId}
      peerRole="patient"
      remoteName={`Dr. ${booking.doctorName}`}
      onLeave={() => router.replace('/patient/appointments')}
    />
  );
}

function VideoIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="13" height="14" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}