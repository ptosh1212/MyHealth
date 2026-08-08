// POST /api/vapi/master-assistant
// Creates or updates the ONE master Vapi assistant
// This single assistant serves ALL doctors dynamically
// It reads doctor data from Firebase based on forwarding metadata

import { NextRequest, NextResponse } from 'next/server';
import { vapiPost, vapiPatch, vapiGet } from '@/lib/vapi-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
const MASTER_ASSISTANT_ID_KEY = 'VAPI_MASTER_ASSISTANT_ID';

// The master system prompt — doctor data is loaded dynamically via function call
const MASTER_SYSTEM_PROMPT = `You are MyHealth AI, a professional medical receptionist platform serving multiple doctors.

## Your Behavior
When a call comes in:
1. FIRST call the "identifyDoctor" function to find out which doctor this call is for
2. Greet the patient using that doctor's name and clinic
3. Help them book appointments or answer questions

## After Identifying Doctor
- Use the doctor's actual name, fees, timings from the function response
- Book appointments using the "bookAppointment" function
- Answer questions about fees, timings, availability

## Rules
- Always identify the doctor FIRST before saying anything else
- If doctor cannot be identified, say "Thank you for calling My Health. How can I help you?"
- Never give medical advice
- Keep responses short — this is a phone call
- If emergency: "Please call 108 immediately"
- End calls warmly: "Thank you for calling. Have a healthy day!"`;

export async function POST(req: NextRequest) {
  try {
    const existingId = process.env.VAPI_MASTER_ASSISTANT_ID;

    const assistantConfig = {
      name: 'My Health Master Receptionist',
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        systemPrompt: MASTER_SYSTEM_PROMPT,
        temperature: 0.7,
        tools: [
          // Tool 1: Identify which doctor this call is for
          {
            type: 'function',
            function: {
              name: 'identifyDoctor',
              description: 'Call this FIRST to identify which doctor this call is for based on the forwarded number',
              parameters: {
                type: 'object',
                properties: {
                  forwardedFrom: {
                    type: 'string',
                    description: 'The phone number that forwarded this call (the doctor\'s number)',
                  },
                },
                required: ['forwardedFrom'],
              },
            },
            server: { url: `${APP_URL}/api/vapi/identify-doctor` },
          },
          // Tool 2: Book appointment live during call
          {
            type: 'function',
            function: {
              name: 'bookAppointment',
              description: 'Book an appointment after collecting patient details',
              parameters: {
                type: 'object',
                properties: {
                  doctorId: { type: 'string' },
                  patientName: { type: 'string' },
                  patientPhone: { type: 'string' },
                  symptoms: { type: 'string' },
                },
                required: ['doctorId', 'patientName', 'patientPhone'],
              },
            },
            server: { url: `${APP_URL}/api/vapi/webhook` },
          },
        ],
      },
      voice: { provider: 'vapi', voiceId: 'Rohan' },
      firstMessage: '', // Empty — AI will call identifyDoctor first then greet
      endCallMessage: 'Thank you for calling. Have a healthy day!',
      endCallPhrases: ['goodbye', 'bye', "that's all"],
      transcriber: { provider: 'deepgram', model: 'nova-2', language: 'en-IN' },
      serverUrl: `${APP_URL}/api/vapi/webhook`,
    };

    let assistant;
    if (existingId) {
      // Update existing master assistant
      assistant = await vapiPatch(`/assistant/${existingId}`, assistantConfig);
    } else {
      // Create new master assistant
      assistant = await vapiPost('/assistant', assistantConfig);
    }

    return NextResponse.json({
      success: true,
      assistantId: assistant.id,
      message: `Master assistant ${existingId ? 'updated' : 'created'}. Add VAPI_MASTER_ASSISTANT_ID=${assistant.id} to your env vars.`,
    });

  } catch (error: any) {
    console.error('[Master Assistant Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}