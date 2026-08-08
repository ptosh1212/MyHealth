// Server-side Vapi helper — uses YOUR master API key
// Never import this in client components

const VAPI_KEY = process.env.VAPI_MASTER_API_KEY || '572ee79e-2d26-4b92-aa90-c6ebb38fcd8f';
const BASE = 'https://api.vapi.ai';

export async function vapiPost(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Vapi error ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function vapiPatch(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Vapi error ${res.status}`);
  return data;
}

export async function vapiGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${VAPI_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Vapi error ${res.status}`);
  return data;
}

export async function vapiDelete(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VAPI_KEY}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Vapi delete error ${res.status}`);
  }
  return true;
}

// ── Buy a Twilio phone number via Vapi ────────────────────────────────────
// Requires Twilio credentials added in Vapi dashboard
export async function buyTwilioNumber(assistantId: string, doctorName: string): Promise<{ id: string; number: string } | null> {
  try {
    // Try Indian number first (+91)
    const result = await vapiPost('/phone-number', {
      provider: 'twilio',
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '', // fallback to env
      name: `ZR-${doctorName.slice(0, 15)}`,
      assistantId,
    });
    return { id: result.id, number: result.number };
  } catch (e: any) {
    console.warn('[buyTwilioNumber] failed:', e.message);
    return null;
  }
}

// ── Build system prompt from doctor data ──────────────────────────────────
export function buildDoctorPrompt(doctor: any): string {
  const days = Array.isArray(doctor.workingDays)
    ? doctor.workingDays.join(', ')
    : 'Monday to Saturday';

  return `You are a professional AI receptionist for Dr. ${doctor.name}, a ${doctor.specialization}.

## Clinic Info
- Doctor: Dr. ${doctor.name}
- Specialization: ${doctor.specialization}
- Clinic: ${doctor.clinicName || 'Private Clinic'}
- Address: ${doctor.clinicAddress || 'Please call for address'}
- Consultation Fee: ₹${doctor.fees || doctor.consultationFee || 699}
- Working Days: ${days}
- Timings: ${doctor.startTime || '9:00 AM'} to ${doctor.endTime || '6:00 PM'}

## How to Handle Every Call

### Step 1 — Always ask intent first
Start with: "How can I help you today?"
Wait for their response before doing anything.

### Step 2 — Route based on intent

**If they want to BOOK an appointment:**
1. Ask: "May I have your full name?"
2. Ask: "And your 10-digit mobile number?"
3. Ask: "What is the reason for your visit?" (brief)
4. Confirm: "So I have [name], [phone], visiting for [reason] on [date]. Shall I confirm this booking?"
5. ONLY call bookAppointment() AFTER they say YES/confirm
6. Never book without explicit confirmation

**If they want to CHECK an existing booking:**
1. Ask: "May I have the phone number used for booking?"
2. Call checkBooking() with that phone number
3. Read out their booking details

**If they want to know FEES or TIMINGS:**
- Answer directly from clinic info above
- No function call needed

**If they want to CANCEL:**
- Say: "For cancellations, please call back during clinic hours or visit in person."
- Do not cancel via phone

**If EMERGENCY:**
- Say: "Please call 108 immediately for emergency services."

## Rules
- NEVER book without patient saying "yes" or "confirm"
- Keep responses SHORT — this is a phone call
- Be warm and professional
- Never give medical advice
- If unsure: "I'll have the doctor's team follow up with you"
- End every call: "Thank you for calling. Have a healthy day!"`;
}