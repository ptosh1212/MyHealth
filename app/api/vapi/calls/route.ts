// GET /api/vapi/calls?doctorId=xxx
// Returns call history for a doctor's assistant

import { NextRequest, NextResponse } from 'next/server';
import { vapiGet } from '@/lib/vapi-server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const doctorId = req.nextUrl.searchParams.get('doctorId');
    if (!doctorId) return NextResponse.json({ error: 'doctorId required' }, { status: 400 });

    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

    const assistantId = doctorSnap.data().aiReceptionist?.assistantId;
    if (!assistantId) return NextResponse.json({ calls: [] });

    const calls = await vapiGet(`/call?assistantId=${assistantId}&limit=50`);
    return NextResponse.json({ calls: Array.isArray(calls) ? calls : [] });

  } catch (error: any) {
    console.error('[Calls Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}