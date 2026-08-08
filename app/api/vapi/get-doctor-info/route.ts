// POST /api/vapi/get-doctor-info
// Called by Vapi AI MID-CALL to fetch live doctor data
// Enables ONE master agent to serve ALL doctors dynamically

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = body?.message?.functionCall?.parameters || body;
    const { doctorId } = params;

    if (!doctorId) {
      return NextResponse.json({ result: 'doctorId required' });
    }

    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) {
      return NextResponse.json({ result: 'Doctor not found' });
    }

    const d = doctorSnap.data();
    const days = Array.isArray(d.workingDays) ? d.workingDays.join(', ') : 'Monday to Saturday';

    // Get today's queue count
    const today = new Date().toISOString().split('T')[0];
    const queueSnap = await getDocs(query(
      collection(db, 'bookings'),
      where('doctorId', '==', doctorId),
      where('appointmentDateStr', '==', today),
      where('status', 'in', ['pending', 'confirmed'])
    ));

    return NextResponse.json({
      result: JSON.stringify({
        name: d.name,
        specialization: d.specialization,
        clinicName: d.clinicName || 'Private Clinic',
        fees: d.fees || d.consultationFee || 699,
        workingDays: days,
        startTime: d.startTime || '9:00 AM',
        endTime: d.endTime || '6:00 PM',
        todayQueueCount: queueSnap.size,
        isOnline: d.online !== false,
      })
    });

  } catch (error: any) {
    console.error('[Get Doctor Info Error]', error);
    return NextResponse.json({ result: 'Could not fetch doctor information' });
  }
}