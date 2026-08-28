'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import VideoCall from '@/components/video/VideoCall';

import {
  Loader2,
  AlertCircle,
} from 'lucide-react';

/* =========================================================
   BOOKING TYPE
========================================================= */

interface Booking {
  id: string;

  doctorId: string;
  userId: string;

  doctorName?: string;
  patientName?: string;

  userPhone?: string;

  status: string;

  appointmentDateStr?: string;

  symptoms?: string;
  existingConditions?: string;

  createdAt?: any;

  [key: string]: any;
}

/* =========================================================
   VIDEO APPOINTMENT TYPE
========================================================= */

interface VideoAppointment extends Booking {
  roomId: string;
}

/* =========================================================
   PAGE
========================================================= */

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();

  const { user, userRole } = useAuthStore();

  const appointmentId =
    typeof params?.appointmentId === 'string'
      ? params.appointmentId
      : '';

  const [loading, setLoading] = useState(true);

  const [appointment, setAppointment] =
    useState<VideoAppointment | null>(null);

  const [error, setError] = useState('');

  /* =======================================================
     LOAD APPOINTMENT
  ======================================================= */

  useEffect(() => {
    if (!user?.uid || !appointmentId) {
      return;
    }

    const loadAppointment = async () => {
      try {
        setLoading(true);
        setError('');

        /* ---------------------------------------------------
           1. GET BOOKING
        --------------------------------------------------- */

        const bookingRef = doc(
          db,
          'bookings',
          appointmentId
        );

        const bookingSnap =
          await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          setError('Appointment not found.');
          return;
        }

        /* ---------------------------------------------------
           2. CONVERT FIRESTORE DATA TO TYPED BOOKING
        --------------------------------------------------- */

        const bookingData =
          bookingSnap.data();

        const booking: Booking = {
          id: bookingSnap.id,

          doctorId:
            String(bookingData.doctorId || ''),

          userId:
            String(bookingData.userId || ''),

          doctorName:
            bookingData.doctorName || '',

          patientName:
            bookingData.patientName || '',

          userPhone:
            bookingData.userPhone || '',

          status:
            bookingData.status || '',

          appointmentDateStr:
            bookingData.appointmentDateStr || '',

          symptoms:
            bookingData.symptoms || '',

          existingConditions:
            bookingData.existingConditions || '',

          createdAt:
            bookingData.createdAt,

          ...bookingData,
        };

        /* ---------------------------------------------------
           3. MAKE SURE REQUIRED IDS EXIST
        --------------------------------------------------- */

        if (!booking.doctorId) {
          setError(
            'This appointment does not have a doctor assigned.'
          );
          return;
        }

        if (!booking.userId) {
          setError(
            'This appointment does not have a patient assigned.'
          );
          return;
        }

        /* ---------------------------------------------------
           4. CHECK USER AUTHORIZATION
        --------------------------------------------------- */

        const isDoctor =
          userRole === 'doctor' &&
          booking.doctorId === user.uid;

        const isPatient =
          userRole === 'patient' &&
          booking.userId === user.uid;

        if (!isDoctor && !isPatient) {
          setError(
            'You are not authorized to join this consultation.'
          );
          return;
        }

        /* ---------------------------------------------------
           5. CHECK APPOINTMENT STATUS
        --------------------------------------------------- */

        if (booking.status !== 'confirmed') {
          setError(
            'This appointment is not available for video consultation.'
          );
          return;
        }

        /* ---------------------------------------------------
           6. CREATE ONE VIDEO ROOM PER APPOINTMENT
        --------------------------------------------------- */

        const roomId =
          `appointment_${appointmentId}`;

        const roomRef =
          doc(db, 'videoCalls', roomId);

        const roomSnap =
          await getDoc(roomRef);

        /* ---------------------------------------------------
           7. DOCTOR CREATES THE ROOM
        --------------------------------------------------- */

        if (!roomSnap.exists() && isDoctor) {
          await setDoc(roomRef, {
            roomId,

            appointmentId,

            doctorId:
              booking.doctorId,

            patientId:
              booking.userId,

            status: 'waiting',

            createdAt:
              Timestamp.now(),

            updatedAt:
              Timestamp.now(),
          });
        }

        /* ---------------------------------------------------
           8. PATIENT WAITS FOR ROOM
        --------------------------------------------------- */

        if (!roomSnap.exists() && isPatient) {
          setError(
            'The doctor has not started the consultation yet.'
          );
          return;
        }

        /* ---------------------------------------------------
           9. SAVE APPOINTMENT
        --------------------------------------------------- */

        setAppointment({
          ...booking,
          roomId,
        });

      } catch (err) {
        console.error(
          'Video page error:',
          err
        );

        setError(
          'Unable to load the consultation.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();

  }, [
    user?.uid,
    userRole,
    appointmentId,
  ]);

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">

        <div className="text-center">

          <Loader2
            size={32}
            className="text-teal-400 animate-spin mx-auto"
          />

          <p className="text-white/50 text-sm mt-3">
            Preparing consultation...
          </p>

        </div>

      </div>
    );
  }

  /* =======================================================
     ERROR SCREEN
  ======================================================= */

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-6">

        <div className="text-center max-w-md">

          <AlertCircle
            size={40}
            className="text-red-400 mx-auto mb-4"
          />

          <h1 className="text-white text-lg font-semibold">
            Cannot join consultation
          </h1>

          <p className="text-white/50 text-sm mt-2">
            {error || 'Appointment unavailable.'}
          </p>

          <button
            onClick={() => router.back()}
            className="mt-6 px-5 py-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition"
          >
            Go Back
          </button>

        </div>

      </div>
    );
  }

  /* =======================================================
     DETERMINE VIDEO ROLE
  ======================================================= */

  const role =
    userRole === 'doctor'
      ? 'doctor'
      : 'patient';

  /* =======================================================
     VIDEO CALL
  ======================================================= */

  return (
    <VideoCall
      appointmentId={appointment.id}
      roomId={appointment.roomId}
      role={role}
      onEnd={() => router.back()}
    />
  );
}