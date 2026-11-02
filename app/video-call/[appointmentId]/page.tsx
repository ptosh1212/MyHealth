'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import VideoCall from '@/components/video/VideoCall';

import { Loader2, AlertCircle } from 'lucide-react';

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

  const appointmentId = typeof params?.appointmentId === 'string' ? params.appointmentId : '';

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<VideoAppointment | null>(null);
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

        const bookingRef = doc(db, 'bookings', appointmentId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          setError('Appointment not found.');
          return;
        }

        const bookingData = bookingSnap.data();

        const booking: Booking = {
          id: bookingSnap.id,
          doctorId: String(bookingData.doctorId || ''),
          userId: String(bookingData.userId || ''),
          doctorName: bookingData.doctorName || '',
          patientName: bookingData.patientName || '',
          userPhone: bookingData.userPhone || '',
          status: bookingData.status || '',
          appointmentDateStr: bookingData.appointmentDateStr || '',
          symptoms: bookingData.symptoms || '',
          existingConditions: bookingData.existingConditions || '',
          createdAt: bookingData.createdAt,
          ...bookingData,
        };

        if (!booking.doctorId) {
          setError('This appointment does not have a doctor assigned.');
          return;
        }

        if (!booking.userId) {
          setError('This appointment does not have a patient assigned.');
          return;
        }

        const isDoctor = userRole === 'doctor' && booking.doctorId === user.uid;
        const isPatient = userRole === 'patient' && booking.userId === user.uid;

        if (!isDoctor && !isPatient) {
          setError('You are not authorized to join this consultation.');
          return;
        }

        if (booking.status !== 'confirmed') {
          setError('This appointment is not available for video consultation.');
          return;
        }

        // Pass control to the VideoCall component directly.
        // The VideoCall component will handle the "waiting" state automatically.
        setAppointment({
          ...booking,
          roomId: `appointment_${appointmentId}`,
        });

      } catch (err) {
        console.error('Video page error:', err);
        setError('Unable to load the consultation.');
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [user?.uid, userRole, appointmentId]);

  /* =======================================================
     DOCTOR COMPLETION HANDLER
  ======================================================= */
  const handleCompleteBooking = async () => {
    if (!appointment) return;
    try {
      await setDoc(doc(db, 'bookings', appointment.id), {
        status: 'completed',
        updatedAt: Timestamp.now(),
      }, { merge: true });
      
      router.back();
    } catch (err) {
      console.error('Failed to mark booking as complete:', err);
      router.back();
    }
  };

  /* =======================================================
     LOADING SCREEN
  ======================================================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-teal-400 animate-spin mx-auto" />
          <p className="text-white/50 text-sm mt-3">Preparing consultation...</p>
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
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-lg font-semibold">Cannot join consultation</h1>
          <p className="text-white/50 text-sm mt-2">{error || 'Appointment unavailable.'}</p>
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
     DETERMINE VIDEO PROPS
  ======================================================= */
  const role = userRole === 'doctor' ? 'doctor' : 'patient';
  
  const remoteName = role === 'doctor' 
    ? appointment.patientName || 'Patient' 
    : appointment.doctorName || 'Doctor';

  /* =======================================================
     VIDEO CALL
  ======================================================= */
  return (
    <VideoCall
      appointmentId={appointment.id}
      roomId={appointment.roomId}
      role={role}
      remoteName={remoteName}
      onEnd={() => router.back()} 
      onComplete={handleCompleteBooking} 
    />
  );
}