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


interface Booking {
  id: string;
  doctorId: string;
  userId: string;
  status: string;

  doctorName?: string;
  patientName?: string;

  appointmentDateStr?: string;
  queueNumber?: number;

  roomId?: string;
}


export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();

  const { user, userRole } = useAuthStore();

  const appointmentId = params?.appointmentId as string;

  const [loading, setLoading] = useState(true);

  const [appointment, setAppointment] =
    useState<Booking | null>(null);

  const [error, setError] = useState('');


  useEffect(() => {
    if (!user?.uid || !appointmentId) {
      return;
    }

    const loadAppointment = async () => {
      try {
        /*
         * Get booking
         */

        const bookingRef =
          doc(db, 'bookings', appointmentId);

        const bookingSnap =
          await getDoc(bookingRef);


        if (!bookingSnap.exists()) {
          setError('Appointment not found.');
          return;
        }


        /*
         * Explicitly tell TypeScript
         * what fields exist in the booking.
         */

        const bookingData = bookingSnap.data();

        const booking: Booking = {
          id: bookingSnap.id,

          doctorId: bookingData.doctorId || '',

          userId: bookingData.userId || '',

          status: bookingData.status || '',

          doctorName: bookingData.doctorName,

          patientName: bookingData.patientName,

          appointmentDateStr:
            bookingData.appointmentDateStr,

          queueNumber:
            bookingData.queueNumber,
        };


        /*
         * Check authorization
         */

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


        /*
         * Only confirmed appointments
         * can use video consultation.
         */

        if (booking.status !== 'confirmed') {
          setError(
            'This appointment is not available for video consultation.'
          );

          return;
        }


        /*
         * One room per appointment
         */

        const roomId =
          `appointment_${appointmentId}`;


        const roomRef =
          doc(db, 'videoCalls', roomId);


        const roomSnap =
          await getDoc(roomRef);


        /*
         * Doctor creates the room
         */

        if (!roomSnap.exists() && isDoctor) {
          await setDoc(roomRef, {
            roomId,

            appointmentId,

            doctorId: booking.doctorId,

            patientId: booking.userId,

            status: 'waiting',

            createdAt: Timestamp.now(),

            updatedAt: Timestamp.now(),
          });
        }


        /*
         * Save appointment locally
         */

        setAppointment({
          ...booking,

          roomId,
        });

      } catch (error) {
        console.error(
          'Video page error:',
          error
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


  /*
   * Loading screen
   */

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


  /*
   * Error screen
   */

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
            className="mt-6 px-5 py-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
          >
            Go Back
          </button>

        </div>

      </div>
    );
  }


  /*
   * Determine role
   */

  const role =
    userRole === 'doctor'
      ? 'doctor'
      : 'patient';


  /*
   * Start video consultation
   */

  return (
    <VideoCall
      appointmentId={appointment.id}
      roomId={appointment.roomId!}
      role={role}
      onEnd={() => router.back()}
    />
  );
}