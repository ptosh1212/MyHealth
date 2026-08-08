// POST /api/vapi/check-booking
// Called by AI mid-call when patient wants to check their existing booking
// Looks up by phone number

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = body?.message?.functionCall?.parameters || body?.functionCall?.parameters || body;
    const { patientPhone, doctorId } = params;

    if (!patientPhone) {
      return NextResponse.json({
        result: 'I need your phone number to look up your booking. Could you please share it?'
      });
    }

    const cleanPhone = String(patientPhone).replace(/\D/g, '').slice(-10);

    // Search by phone number
    const phoneVariants = [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`];
    let bookings: any[] = [];

    for (const phone of phoneVariants) {
      const q = query(
        collection(db, 'bookings'),
        where('patientPhone', '==', phone),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        break;
      }
    }

    // Filter by doctorId if provided
    if (doctorId && bookings.length > 0) {
      const filtered = bookings.filter((b: any) => b.doctorId === doctorId);
      if (filtered.length > 0) bookings = filtered;
    }

    if (bookings.length === 0) {
      return NextResponse.json({
        result: `I couldn't find any active booking for phone number ${cleanPhone}. Would you like to book a new appointment?`
      });
    }

    // Sort by date, get most recent
    bookings.sort((a: any, b: any) => {
      const dateA = a.appointmentDateStr || '';
      const dateB = b.appointmentDateStr || '';
      return dateB.localeCompare(dateA);
    });

    const booking = bookings[0];
    const statusText = booking.status === 'confirmed' ? 'confirmed' : 'pending confirmation';

    return NextResponse.json({
      result: `I found your booking. You have an appointment with Dr. ${booking.doctorName} on ${booking.appointmentDateStr}. Your queue number is ${booking.queueNumber} and the status is ${statusText}. Is there anything else I can help you with?`
    });

  } catch (error: any) {
    console.error('[Check Booking Error]', error);
    return NextResponse.json({
      result: 'I was unable to look up your booking right now. Please try again or visit the clinic directly.'
    });
  }
}