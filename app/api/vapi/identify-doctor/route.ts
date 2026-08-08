// POST /api/vapi/identify-doctor
// Called by master AI assistant at the START of every call
// Reads the forwarded-from number and finds the matching doctor in Firebase
// This is how ONE agent serves ALL doctors

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Vapi sends the call object with the function parameters
    const params = body?.message?.functionCall?.parameters || body?.functionCall?.parameters || body;
    const call   = body?.message?.call || body?.call || {};

    // Get forwarded-from number — try multiple sources
    let forwardedFrom = params?.forwardedFrom || '';

    if (!forwardedFrom) {
      // Try SIP headers (most reliable for call forwarding)
      const sipHeaders = call?.sipHeaders || call?.customer?.sipHeaders || {};
      if (sipHeaders['Diversion']) {
        const match = sipHeaders['Diversion'].match(/tel:([+\d]+)/);
        if (match) forwardedFrom = match[1];
      }
      if (!forwardedFrom && call?.forwardedFrom) forwardedFrom = call.forwardedFrom;
      if (!forwardedFrom && call?.customer?.forwardedFrom) forwardedFrom = call.customer.forwardedFrom;
    }

    console.log('[Identify Doctor] forwardedFrom:', forwardedFrom);

    if (!forwardedFrom) {
      return NextResponse.json({
        result: JSON.stringify({
          found: false,
          message: 'Could not identify the doctor. Greet as My Health receptionist.',
        }),
      });
    }

    // Clean number and try variants
    const clean = forwardedFrom.replace(/[^\d]/g, '');
    const variants = [
      clean,
      clean.slice(-10),           // last 10 digits
      `+91${clean.slice(-10)}`,   // with +91
      `91${clean.slice(-10)}`,    // with 91
    ];

    for (const variant of variants) {
      const q = query(collection(db, 'doctors'), where('phone', '==', variant));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const doctorDoc = snap.docs[0];
        const d = doctorDoc.data();
        const days = Array.isArray(d.workingDays) ? d.workingDays.join(', ') : 'Monday to Saturday';

        console.log('[Identify Doctor] Found:', d.name, 'id:', doctorDoc.id);

        return NextResponse.json({
          result: JSON.stringify({
            found: true,
            doctorId: doctorDoc.id,
            doctorName: d.name,
            specialization: d.specialization || 'General Physician',
            clinicName: d.clinicName || `Dr. ${d.name}'s Clinic`,
            fees: d.fees || d.consultationFee || 699,
            workingDays: days,
            startTime: d.startTime || '9:00 AM',
            endTime: d.endTime || '6:00 PM',
            greeting: `Thank you for calling ${d.clinicName || `Dr. ${d.name}'s clinic`}. I'm your AI receptionist. How can I help you today?`,
          }),
        });
      }
    }

    // Doctor not found
    console.log('[Identify Doctor] No doctor found for number:', forwardedFrom);
    return NextResponse.json({
      result: JSON.stringify({
        found: false,
        message: 'Doctor not found. Greet as My Health and offer to help.',
      }),
    });

  } catch (error: any) {
    console.error('[Identify Doctor Error]', error);
    return NextResponse.json({
      result: JSON.stringify({ found: false, message: 'Error identifying doctor.' }),
    });
  }
}