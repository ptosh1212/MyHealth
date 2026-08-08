import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { doctorId, vapiApiKey, doctorData } = await req.json();

    if (!vapiApiKey) {
      return NextResponse.json({ error: 'Vapi API key is required' }, { status: 400 });
    }

    const days = Array.isArray(doctorData.workingDays)
      ? doctorData.workingDays.join(', ')
      : 'Monday to Saturday';

    const systemPrompt = `You are a professional AI receptionist for Dr. ${doctorData.name}, a ${doctorData.specialization} at ${doctorData.clinicName || 'the clinic'}.

## Your Role
You handle incoming patient calls professionally. You can:
1. Book appointments
2. Answer questions about fees, timings, and services
3. Provide clinic information

## Doctor Information
- Doctor: Dr. ${doctorData.name}
- Specialization: ${doctorData.specialization}
- Clinic: ${doctorData.clinicName || 'Private Clinic'}
- Address: ${doctorData.clinicAddress || 'Please call for address'}
- Consultation Fee: ₹${doctorData.fees || 699}
- Working Days: ${days}
- Timings: ${doctorData.startTime || '9:00 AM'} to ${doctorData.endTime || '6:00 PM'}

## Booking Process
When a patient wants to book:
1. Ask for their full name
2. Ask for their phone number
3. Ask what their health concern is briefly
4. Confirm the appointment and tell them they'll get a WhatsApp confirmation

## Rules
- Be warm, professional, and empathetic
- Never give medical advice — only booking and information
- Keep responses concise (this is a phone call)
- End warmly: "Thank you for calling. Have a healthy day!"`;

    // Create assistant via Vapi API
    const res = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `ZR-${doctorId.slice(0, 8)}`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt,
          temperature: 0.7,
        },
        voice: {
          provider: 'vapi',
          voiceId: 'Rohan',
        },
        firstMessage: `Thank you for calling ${doctorData.clinicName || `Dr. ${doctorData.name}'s clinic`}. I'm your AI receptionist. How can I help you today? I can book an appointment, or answer questions about fees and timings.`,
        endCallMessage: 'Thank you for calling. Have a healthy day! Goodbye.',
        endCallPhrases: ['goodbye', 'bye', 'thank you bye', "that's all"],
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
        metadata: {
          doctorId,
          type: 'anant_receptionist',
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Vapi Create Assistant Error]', data);
      return NextResponse.json({ error: data.message || 'Failed to create assistant' }, { status: 400 });
    }

    return NextResponse.json({ success: true, assistantId: data.id, assistant: data });
  } catch (error: any) {
    console.error('[Create Assistant Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}