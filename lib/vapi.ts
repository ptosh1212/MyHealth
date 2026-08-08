// Vapi AI Voice Integration
// Vapi handles: phone calls, speech-to-text, AI conversation, text-to-speech
// Docs: https://docs.vapi.ai

export const VAPI_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY || process.env.VAPI_API_KEY || '',
  baseUrl: 'https://api.vapi.ai',
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface VapiAssistant {
  id: string;
  name: string;
  model: {
    provider: string;
    model: string;
    systemPrompt: string;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage: string;
  endCallMessage: string;
  phoneNumberId?: string;
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  assistantId?: string;
  name?: string;
  createdAt: string;
}

export interface VapiCall {
  id: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  transcript?: string;
  summary?: string;
  phoneNumber?: string;
  customer?: { number: string };
  assistant?: { name: string };
  cost?: number;
}

// ── API Helpers ────────────────────────────────────────────────────────────

async function vapiRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${VAPI_CONFIG.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${VAPI_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vapi API error ${res.status}: ${error}`);
  }

  return res.json();
}

// ── Assistant Management ───────────────────────────────────────────────────

export async function createAssistant(doctorData: {
  name: string;
  specialization: string;
  fees: number;
  clinicName: string;
  clinicAddress: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  doctorId: string;
}): Promise<VapiAssistant> {
  const systemPrompt = buildSystemPrompt(doctorData);

  return vapiRequest('/assistant', {
    method: 'POST',
    body: JSON.stringify({
      name: `${doctorData.name} - AI Receptionist`,
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        systemPrompt,
        temperature: 0.7,
      },
      voice: {
        provider: 'playht',
        voiceId: 'jennifer',
      },
      firstMessage: `Thank you for calling ${doctorData.clinicName || `Dr. ${doctorData.name}'s clinic`}. I'm your AI receptionist. How can I help you today? I can book an appointment, tell you about timings, fees, or answer any questions.`,
      endCallMessage: 'Thank you for calling. Have a healthy day! Goodbye.',
      endCallPhrases: ['goodbye', 'bye', 'thank you bye', 'that\'s all'],
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en-IN', // Indian English
      },
      metadata: {
        doctorId: doctorData.doctorId,
        type: 'receptionist',
      },
      serverUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/api/vapi/webhook`,
    }),
  });
}

export async function getAssistant(assistantId: string): Promise<VapiAssistant> {
  return vapiRequest(`/assistant/${assistantId}`);
}

export async function updateAssistant(assistantId: string, doctorData: any): Promise<VapiAssistant> {
  const systemPrompt = buildSystemPrompt(doctorData);
  return vapiRequest(`/assistant/${assistantId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      model: { systemPrompt },
      firstMessage: `Thank you for calling ${doctorData.clinicName || `Dr. ${doctorData.name}'s clinic`}. I'm your AI receptionist. How can I help you today?`,
    }),
  });
}

export async function deleteAssistant(assistantId: string): Promise<void> {
  await vapiRequest(`/assistant/${assistantId}`, { method: 'DELETE' });
}

// ── Phone Number Management ────────────────────────────────────────────────

export async function listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
  return vapiRequest('/phone-number');
}

export async function buyPhoneNumber(areaCode?: string): Promise<VapiPhoneNumber> {
  return vapiRequest('/phone-number', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'twilio',
      areaCode: areaCode || '415', // Default SF area code
      name: 'MyHealth Clinic Number',
    }),
  });
}

export async function assignAssistantToNumber(phoneNumberId: string, assistantId: string): Promise<VapiPhoneNumber> {
  return vapiRequest(`/phone-number/${phoneNumberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ assistantId }),
  });
}

// ── Call Management ────────────────────────────────────────────────────────

export async function listCalls(assistantId?: string, limit = 20): Promise<VapiCall[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (assistantId) params.set('assistantId', assistantId);
  return vapiRequest(`/call?${params}`);
}

export async function getCall(callId: string): Promise<VapiCall> {
  return vapiRequest(`/call/${callId}`);
}

// Make an outbound test call (for developer testing)
export async function makeTestCall(phoneNumber: string, assistantId: string): Promise<VapiCall> {
  return vapiRequest('/call/phone', {
    method: 'POST',
    body: JSON.stringify({
      assistantId,
      customer: { number: phoneNumber },
    }),
  });
}

// ── System Prompt Builder ──────────────────────────────────────────────────

function buildSystemPrompt(doctor: any): string {
  const days = Array.isArray(doctor.workingDays)
    ? doctor.workingDays.join(', ')
    : 'Monday to Saturday';

  return `You are a professional AI receptionist for Dr. ${doctor.name}, a ${doctor.specialization} at ${doctor.clinicName || 'the clinic'}.

## Your Role
You handle incoming patient calls professionally. You can:
1. Book appointments
2. Answer questions about fees, timings, and services
3. Provide clinic information
4. Handle cancellations

## Doctor Information
- Doctor: Dr. ${doctor.name}
- Specialization: ${doctor.specialization}
- Clinic: ${doctor.clinicName || 'Private Clinic'}
- Address: ${doctor.clinicAddress || 'Please visit us in person for address'}
- Consultation Fee: ₹${doctor.fees || doctor.consultationFee || 699}
- Working Days: ${days}
- Timings: ${doctor.startTime || '9:00 AM'} to ${doctor.endTime || '6:00 PM'}

## Booking Process
When a patient wants to book:
1. Ask for their full name
2. Ask for their phone number (10 digits)
3. Ask what their health concern is (briefly)
4. Confirm the appointment details
5. Tell them they'll receive a WhatsApp confirmation

## Important Rules
- Always be warm, professional, and empathetic
- Speak in simple, clear English (patients may not be tech-savvy)
- If asked about something you don't know, say "I'll have the doctor's team follow up with you"
- Never give medical advice — only booking and information
- Keep responses concise (this is a phone call)
- If the patient speaks Hindi, respond in simple Hindi-English mix

## Booking Confirmation
After collecting details, say:
"I've noted your appointment. You'll receive a WhatsApp message with the confirmation shortly. Is there anything else I can help you with?"

## End of Call
Always end warmly: "Thank you for calling Dr. ${doctor.name}'s clinic. Have a healthy day!"`;
}

// ── Webhook Event Parser ───────────────────────────────────────────────────

export interface VapiWebhookEvent {
  type: 'call-started' | 'call-ended' | 'transcript' | 'function-call' | 'hang' | 'speech-update' | 'status-update';
  call?: VapiCall;
  transcript?: string;
  functionCall?: {
    name: string;
    parameters: Record<string, any>;
  };
}

export function parseWebhookEvent(body: any): VapiWebhookEvent {
  return body as VapiWebhookEvent;
}