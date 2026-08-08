// POST /api/vapi/provision
// Activates AI Receptionist for a doctor
// Uses ONE master assistant — no per-doctor agents needed
// Doctor just needs to forward their number to Anant's number

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

// The ONE shared Anant AI number
const ANANT_NUMBER    = '+17755403097';
const ANANT_NUMBER_ID = 'ad0ef993-4f30-4d8c-a327-45890757f8cf';

// The ONE master assistant (set after running /api/vapi/master-assistant once)
const MASTER_ASSISTANT_ID = process.env.VAPI_MASTER_ASSISTANT_ID || '';

export async function POST(req: NextRequest) {
  try {
    const { doctorId } = await req.json();
    if (!doctorId) return NextResponse.json({ error: 'doctorId required' }, { status: 400 });

    // 1. Fetch doctor
    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    const doctor = doctorSnap.data();

    // 2. Already provisioned
    if (doctor.aiReceptionist?.enabled && doctor.aiReceptionist?.assignedNumber) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        phoneNumber: doctor.aiReceptionist.assignedNumber,
        masterAssistantId: MASTER_ASSISTANT_ID,
      });
    }

    // 3. No per-doctor assistant needed!
    // Just save the config — the master assistant handles everything
    const aiConfig = {
      enabled:          true,
      masterAssistantId: MASTER_ASSISTANT_ID,
      phoneNumberId:    ANANT_NUMBER_ID,
      assignedNumber:   ANANT_NUMBER,
      forwardingSetup:  false,
      provisionedAt:    Timestamp.now(),
    };

    await updateDoc(doc(db, 'doctors', doctorId), { aiReceptionist: aiConfig });

    console.log('[Provision] ✅ Doctor activated:', doctorId, '→ forward to', ANANT_NUMBER);

    return NextResponse.json({
      success:     true,
      phoneNumber: ANANT_NUMBER,
      message:     `Doctor activated. They need to forward their number to ${ANANT_NUMBER}`,
    });

  } catch (error: any) {
    console.error('[Provision Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}