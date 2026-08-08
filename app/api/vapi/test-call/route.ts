// POST /api/vapi/test-call
// Triggers an outbound call from Vapi to the doctor's phone
// Uses master key — doctor never needs to know about Vapi

import { NextRequest, NextResponse } from 'next/server';
import { vapiPost } from '@/lib/vapi-server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { doctorId, phoneNumber } = await req.json();

    if (!doctorId || !phoneNumber) {
      return NextResponse.json({ error: 'doctorId and phoneNumber required' }, { status: 400 });
    }

    // Get doctor's assistant ID from Firestore
    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const doctor = doctorSnap.data();
    const assistantId = doctor.aiReceptionist?.assistantId;
    const phoneNumberId = doctor.aiReceptionist?.phoneNumberId;

    if (!assistantId) {
      return NextResponse.json({ error: 'AI Receptionist not set up yet. Please activate first.' }, { status: 400 });
    }

    // Format phone number
    const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Build call request
    const callBody: any = {
      assistantId,
      customer: { number: formatted },
    };

    // Use the doctor's assigned number as caller ID if available
    if (phoneNumberId) {
      callBody.phoneNumberId = phoneNumberId;
    }

    const call = await vapiPost('/call/phone', callBody);

    return NextResponse.json({ success: true, callId: call.id });

  } catch (error: any) {
    console.error('[Test Call Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}