import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type ConsultationStatus = 'waiting' | 'active' | 'ended';

export interface Consultation {
  bookingId: string;
  doctorId: string;
  patientId: string;
  status: ConsultationStatus;
  startedAt?: any;
  endedAt?: any;
}

export async function getConsultation(bookingId: string) {
  const ref = doc(db, 'consultations', bookingId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as Consultation & { id: string };
}

export async function startConsultation(
  bookingId: string,
  doctorId: string,
  patientId: string
) {
  const ref = doc(db, 'consultations', bookingId);

  await setDoc(
    ref,
    {
      bookingId,
      doctorId,
      patientId,
      status: 'active',
      startedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function endConsultation(bookingId: string) {
  await updateDoc(doc(db, 'consultations', bookingId), {
    status: 'ended',
    endedAt: Timestamp.now(),
  });
}

export function subscribeToConsultation(
  bookingId: string,
  callback: (consultation: Consultation | null) => void
) {
  return onSnapshot(doc(db, 'consultations', bookingId), snapshot => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(snapshot.data() as Consultation);
  });
}

/**
 * Send one WebRTC signaling message.
 *
 * We use one document per signal so both browsers can receive
 * signals through Firestore's realtime listener.
 */
export async function sendSignal(
  bookingId: string,
  senderId: string,
  signal: any
) {
  const signalRef = doc(
    collection(db, 'consultations', bookingId, 'signals')
  );

  await setDoc(signalRef, {
    senderId,
    signal,
    createdAt: Timestamp.now(),
  });
}

export function subscribeToSignals(
  bookingId: string,
  currentUserId: string,
  callback: (signal: any) => void
) {
  return onSnapshot(
    collection(db, 'consultations', bookingId, 'signals'),
    snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type !== 'added') return;

        const data = change.doc.data();

        // Never feed our own signaling message back into the peer.
        if (data.senderId === currentUserId) return;

        callback(data.signal);
      });
    }
  );
}