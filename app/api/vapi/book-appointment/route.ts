// POST /api/vapi/book-appointment
// Called by Vapi AI MID-CALL via function calling
// Creates a real Firebase booking while the patient is still on the phone

import {NextRequest, NextResponse} from 'next/server'
import {db} from '@/lib/firebase';
import {
  collection, addDoc, query, where, getDocs,
  doc, getDoc, Timestamp
} from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Vapi sends function call data in this shape
    const { message } = body;
    const functionCall = message?.functionCall || body;
    const params = functionCall?.parameters || functionCall;

    const {
      doctorId,
      patientName,
      patientPhone,
      symptoms = 'General consultation',
      appointmentDate,        // optional — defaults to today
    } = params;

    if (!doctorId || !patientName || !patientPhone) {
      return NextResponse.json({
        result: 'Missing required fields: doctorId, patientName, patientPhone'
      });
    }


    // Clean phone number
    const cleanPhone = String(patientPhone).replace(/\D/g, '').slice(-10);

    // Get appointment date
    const dateStr = appointmentDate || new Date().toISOString().split('T')[0];
    
    // Get doctor info
    const doctorSnap = await getDoc(doc(db, 'doctors', doctorId));
    if (!doctorSnap.exists()) {
      return NextResponse.json({ result: 'Doctor not found' });
    }
    const doctor = doctorSnap.data();

    // Get current queue number for this doctor today
    const queueQuery = query(
      collection(db, 'bookings'),
      where('doctorId', '==', doctorId),
      where('appointmentDateStr', '==', dateStr),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const queueSnap = await getDocs(queueQuery);
    const queueNumber = queueSnap.size + 1;

    // Create booking in Firebase
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      doctorId,
      doctorName: doctor.name || 'Doctor',
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
      isInstantBooking: false,
      createdAt: Timestamp.now(),
    });

    console.log('[AI Booking] Created booking:', bookingRef.id, 'for doctor:', doctorId);

    // Return confirmation to AI — it will speak this to the patient
    return NextResponse.json({
      result: `Appointment booked successfully! ${patientName} is number ${queueNumber} in queue for ${dateStr}. The doctor will confirm shortly.`
    });

  } catch (error: any) {
    console.error('[AI Booking Error]', error);
    return NextResponse.json({
      result: 'Sorry, I could not book the appointment right now. Please call back or visit the clinic directly.'
    });
  }
}