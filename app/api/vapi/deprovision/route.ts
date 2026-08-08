// POST /api/vapi/deprovision
// Removes AI Receptionist for a doctor (deletes assistant + releases number)

import { NextRequest, NextResponse } from 'next/server';
import { vapiDelete } from '@/lib/vapi-server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { doctorId } = await req.json();
    if (!doctorId) return NextResponse.json({ error: 'doctorId required' }, { status: 400 });

    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

    const doctor = doctorSnap.data();
    const { assistantId, phoneNumberId } = doctor.aiReceptionist || {};

    // Delete assistant
    if (assistantId) {
      try { await vapiDelete(`/assistant/${assistantId}`); } catch (e) { console.warn('Assistant delete failed:', e); }
    }

    // Release dedicated phone number (only if it's not the shared fallback)
    if (phoneNumberId && phoneNumberId !== 'ad0ef993-4f30-4d8c-a327-45890757f8cf') {
      try { await vapiDelete(`/phone-number/${phoneNumberId}`); } catch (e) { console.warn('Phone number release failed:', e); }
    }

    // Clear from Firestore
    await updateDoc(doc(db, 'doctors', doctorId), {
      aiReceptionist: { enabled: false, assistantId: '', phoneNumberId: '', assignedNumber: '' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Deprovision Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}