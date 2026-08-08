// Vapi Webhook — handles all AI call events
// Uses call forwarding metadata to identify which doctor the call is for
// ONE number + ONE agent serves ALL doctors

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, query, where, getDocs,
  doc, getDoc, Timestamp
} from 'firebase/firestore';

// ── Extract doctor from forwarding metadata ────────────────────────────────
async function getDoctorFromForwardedNumber(forwardedFrom: string): Promise<{ id: string; data: any } | null> {
  if (!forwardedFrom) return null;

  // Clean the number — strip everything except digits and leading +
  const clean = forwardedFrom.replace(/[^\d+]/g, '');
  // Try both with and without country code
  const variants = [
    clean,
    clean.replace(/^\+91/, ''),   // strip +91
    clean.replace(/^91/, ''),     // strip 91
    `+91${clean.slice(-10)}`,     // add +91
  ];

  for (const variant of variants) {
    const q = query(collection(db, 'doctors'), where('phone', '==', variant));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, data: docSnap.data() };
    }
  }
  return null;
}

// ── Extract forwarded-from number from Vapi call object ───────────────────
function extractForwardedFrom(call: any): string {
  // Vapi passes SIP headers when call is forwarded
  const sipHeaders = call?.sipHeaders || call?.customer?.sipHeaders || {};

  // Standard SIP Diversion header
  if (sipHeaders['Diversion']) {
    const match = sipHeaders['Diversion'].match(/tel:([+\d]+)/);
    if (match) return match[1];
  }

  // X-Forwarded-For or similar custom headers
  if (sipHeaders['X-Original-To']) return sipHeaders['X-Original-To'];
  if (sipHeaders['X-Forwarded-To']) return sipHeaders['X-Forwarded-To'];

  // Twilio passes it as ForwardedFrom
  if (call?.forwardedFrom) return call.forwardedFrom;
  if (call?.customer?.forwardedFrom) return call.customer.forwardedFrom;

  return '';
}

// ── Main webhook handler ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;
    const type = message?.type || body?.type;

    console.log('[Vapi Webhook]', type);

    // ── Function call: book-appointment (called mid-call by AI) ──
    if (type === 'function-call' || message?.type === 'function-call') {
      const fnCall = message?.functionCall || body?.functionCall;
      const fnName = fnCall?.name;
      const params = fnCall?.parameters || {};

      if (fnName === 'bookAppointment') {
        return await handleBookAppointment(params);
      }

      if (fnName === 'getDoctorInfo') {
        return await handleGetDoctorInfo(params);
      }
    }

    // ── Call ended: log it ──
    if (type === 'end-of-call-report' || type === 'call-ended') {
      const call = message?.call || body?.call || body;
      await logCall(call);
    }

    return NextResponse.json({ result: 'ok' });

  } catch (error: any) {
    console.error('[Webhook Error]', error);
    return NextResponse.json({ result: 'error', error: error.message }, { status: 500 });
  }
}

// ── Function: Book Appointment (called live during call) ──────────────────
async function handleBookAppointment(params: any) {
  try {
    const { doctorId, patientName, patientPhone, symptoms = 'General consultation', appointmentDate } = params;

    if (!doctorId || !patientName || !patientPhone) {
      return NextResponse.json({
        result: 'I need your name and phone number to complete the booking.'
      });
    }

    const cleanPhone = String(patientPhone).replace(/\D/g, '').slice(-10);
    const dateStr = appointmentDate || new Date().toISOString().split('T')[0];

    // Get doctor
    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) {
      return NextResponse.json({ result: 'I could not find the doctor. Please try again.' });
    }
    const doctor = doctorSnap.data();

    // Get queue number
    const queueSnap = await getDocs(query(
      collection(db, 'bookings'),
      where('doctorId', '==', doctorId),
      where('appointmentDateStr', '==', dateStr),
      where('status', 'in', ['pending', 'confirmed'])
    ));
    const queueNumber = queueSnap.size + 1;

    // Create booking
    await addDoc(collection(db, 'bookings'), {
      doctorId,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialization || '',
      patientName: String(patientName).trim(),
      patientPhone: cleanPhone,
      userId: `phone_${cleanPhone}`,
      appointmentDateStr: dateStr,
      queueNumber,
      status: 'pending',
      source: 'ai_call',
      symptoms: String(symptoms).trim(),
      totalAmount: doctor.fees || doctor.consultationFee || 0,
      consultationFee: doctor.fees || doctor.consultationFee || 0,
      createdAt: Timestamp.now(),
    });

    console.log('[AI Booking] Created for doctor:', doctorId, 'patient:', patientName);

    return NextResponse.json({
      result: `Perfect! I've booked your appointment. You are number ${queueNumber} in the queue for ${dateStr}. You will receive a WhatsApp confirmation shortly. Is there anything else I can help you with?`
    });

  } catch (error: any) {
    console.error('[Book Appointment Error]', error);
    return NextResponse.json({
      result: 'I was unable to complete the booking. Please call back or visit the clinic directly.'
    });
  }
}

// ── Function: Get Doctor Info (called live during call) ───────────────────
async function handleGetDoctorInfo(params: any) {
  try {
    const { doctorId } = params;
    if (!doctorId) return NextResponse.json({ result: 'Doctor ID not provided' });

    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) return NextResponse.json({ result: 'Doctor not found' });

    const d = doctorSnap.data();
    const days = Array.isArray(d.workingDays) ? d.workingDays.join(', ') : 'Monday to Saturday';

    const today = new Date().toISOString().split('T')[0];
    const queueSnap = await getDocs(query(
      collection(db, 'bookings'),
      where('doctorId', '==', doctorId),
      where('appointmentDateStr', '==', today),
      where('status', 'in', ['pending', 'confirmed'])
    ));

    return NextResponse.json({
      result: `Dr. ${d.name} is a ${d.specialization}. Consultation fee is ₹${d.fees || 699}. Working hours are ${d.startTime || '9 AM'} to ${d.endTime || '6 PM'}, ${days}. There are currently ${queueSnap.size} patients in today's queue.`
    });

  } catch (error: any) {
    return NextResponse.json({ result: 'Could not fetch doctor information right now.' });
  }
}

// ── Log completed call to Firestore ───────────────────────────────────────
async function logCall(call: any) {
  try {
    const forwardedFrom = extractForwardedFrom(call);
    let doctorId = call?.assistant?.metadata?.doctorId || '';

    // If no doctorId in metadata, look up by forwarded number
    if (!doctorId && forwardedFrom) {
      const doctor = await getDoctorFromForwardedNumber(forwardedFrom);
      if (doctor) doctorId = doctor.id;
    }

    await addDoc(collection(db, 'ai_calls'), {
      callId: call?.id || '',
      doctorId: doctorId || 'unknown',
      patientPhone: call?.customer?.number || '',
      forwardedFrom,
      transcript: call?.transcript || '',
      summary: call?.summary || '',
      duration: call?.duration || 0,
      status: call?.status || 'ended',
      cost: call?.cost || 0,
      createdAt: Timestamp.now(),
    });

    console.log('[Call Logged] doctorId:', doctorId, 'forwardedFrom:', forwardedFrom);
  } catch (e) {
    console.error('[Log Call Error]', e);
  }
}