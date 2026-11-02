// lib/whatsapp.ts

interface WhatsAppMessage {
  number: string;
  message: string;
}

async function sendWhatsAppMessage({ number, message }: WhatsAppMessage) {
  try {
    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, message }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// Extract and format phone number for whatsapp-web.js (No '+' sign)
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  // If already has 91 country code
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  // If standard 10-digit Indian number, append 91
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  // Fallback for other countries
  return cleaned;
}

// 1. Appointment Booked — Send to both patient and doctor
export async function notifyAppointmentBooked(
  patientPhone: string,
  doctorPhone: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string
) {
  const pPhone = formatPhoneNumber(patientPhone);
  const dPhone = formatPhoneNumber(doctorPhone);

  // Send to patient
  await sendWhatsAppMessage({
    number: pPhone,
    message: `Hello ${patientName}, your appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime} has been successfully booked.`,
  });

  // Send to doctor
  await sendWhatsAppMessage({
    number: dPhone,
    message: `New Appointment: Dr. ${doctorName}, you have a new booking with ${patientName} on ${appointmentDate} at ${appointmentTime}.`,
  });
}

// 2. Appointment Confirmed by Doctor
export async function notifyAppointmentConfirmed(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string
) {
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Hello ${patientName}, your appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime} has been CONFIRMED.`,
  });
}

// 3. Appointment Cancelled
export async function notifyAppointmentCancelled(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string
) {
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Hello ${patientName}, please note that your appointment with Dr. ${doctorName} on ${appointmentDate} has been cancelled.`,
  });
}

// 4. Prescription Ready
export async function notifyPrescriptionReady(
  patientPhone: string,
  patientName: string,
  doctorName: string
) {
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Hello ${patientName}, your prescription from Dr. ${doctorName} is now ready. Please check your My Health portal to view it.`,
  });
}

// 5. Appointment Reminder (1 day before)
export async function notifyAppointmentReminder(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string
) {
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Reminder: Hello ${patientName}, you have an appointment with Dr. ${doctorName} tomorrow, ${appointmentDate} at ${appointmentTime}.`,
  });
}

// 6. Follow-up / Callback Message
export async function notifyFollowUp(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  callbackDate: string,
  reason: string
) {
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Hello ${patientName}, Dr. ${doctorName} has requested a follow-up on ${callbackDate}. Reason: ${reason}.`,
  });
}

// 7. Visit Complete
export async function notifyVisitComplete(
  patientPhone: string,
  patientName: string,
  doctorName: string
) {
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Hello ${patientName}, thank you for your visit with Dr. ${doctorName}. We wish you good health!`,
  });
}

// 8. Welcome Message for New Users
export async function notifyWelcome(
  phone: string,
  name: string,
  role: 'patient' | 'doctor'
) {
  const roleName = role === 'doctor' ? `Dr. ${name}` : name;
  await sendWhatsAppMessage({
    number: formatPhoneNumber(phone),
    message: `Welcome to My Health, ${roleName}! We are glad to have you on board.`,
  });
}

// 9. New Chat Message from Doctor
export async function notifyNewMessage(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  messagePreview: string
) {
  const snippet = messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '');
  
  await sendWhatsAppMessage({
    number: formatPhoneNumber(patientPhone),
    message: `Hello ${patientName}, you have a new message from Dr. ${doctorName}:\n\n"${snippet}"\n\nPlease log in to reply.`,
  }).catch(e => console.error('WhatsApp notifyNewMessage failed:', e));
}