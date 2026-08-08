// Interakt WhatsApp API Integration — routed via /api/whatsapp to avoid CORS

interface WhatsAppMessage {
  countryCode: string;
  phoneNumber: string;
  type: 'Template';
  template: {
    name: string;
    languageCode: string;
    bodyValues?: string[];
  };
}

async function sendWhatsAppMessage(message: WhatsAppMessage) {
  try {
    const response = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
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

// Extract phone number and country code
function parsePhoneNumber(phone: string): { countryCode: string; phoneNumber: string } {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return { countryCode: '+91', phoneNumber: cleaned.substring(2) };
  }
  if (cleaned.length === 10) {
    return { countryCode: '+91', phoneNumber: cleaned };
  }
  return {
    countryCode: '+' + cleaned.substring(0, 2),
    phoneNumber: cleaned.substring(2),
  };
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
  const patientPhoneParsed = parsePhoneNumber(patientPhone);
  const doctorPhoneParsed = parsePhoneNumber(doctorPhone);

  // Send to patient
  await sendWhatsAppMessage({
    countryCode: patientPhoneParsed.countryCode,
    phoneNumber: patientPhoneParsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'appointment_booked_patient',
      languageCode: 'en',
      bodyValues: [patientName, doctorName, appointmentDate, appointmentTime],
    },
  });

  // Send to doctor
  await sendWhatsAppMessage({
    countryCode: doctorPhoneParsed.countryCode,
    phoneNumber: doctorPhoneParsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'appointment_booked_doctor',
      languageCode: 'en',
      bodyValues: [doctorName, patientName, appointmentDate, appointmentTime],
    },
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
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'appointment_confirmed',
      languageCode: 'en',
      bodyValues: [patientName, doctorName, appointmentDate, appointmentTime],
    },
  });
}

// 3. Appointment Cancelled
export async function notifyAppointmentCancelled(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string
) {
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'appointment_cancelled',
      languageCode: 'en',
      bodyValues: [patientName, doctorName, appointmentDate],
    },
  });
}

// 4. Prescription Ready
export async function notifyPrescriptionReady(
  patientPhone: string,
  patientName: string,
  doctorName: string
) {
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'prescription_ready',
      languageCode: 'en',
      bodyValues: [patientName, doctorName],
    },
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
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'appointment_reminder',
      languageCode: 'en',
      bodyValues: [patientName, doctorName, appointmentDate, appointmentTime],
    },
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
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'follow_up',
      languageCode: 'en',
      bodyValues: [patientName, doctorName, callbackDate, reason],
    },
  });
}

// 7. Visit Complete
export async function notifyVisitComplete(
  patientPhone: string,
  patientName: string,
  doctorName: string
) {
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'visit_complete',
      languageCode: 'en',
      bodyValues: [patientName, doctorName],
    },
  });
}

// 8. Welcome Message for New Users
export async function notifyWelcome(
  phone: string,
  name: string,
  role: 'patient' | 'doctor'
) {
  const parsed = parsePhoneNumber(phone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: role === 'doctor' ? 'welcome_doctor' : 'welcome_patient',
      languageCode: 'en',
      bodyValues: [name],
    },
  });
}

// 9. New Chat Message from Doctor
export async function notifyNewMessage(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  messagePreview: string
) {
  const parsed = parsePhoneNumber(patientPhone);

  await sendWhatsAppMessage({
    countryCode: parsed.countryCode,
    phoneNumber: parsed.phoneNumber,
    type: 'Template',
    template: {
      name: 'new_chat_message',
      languageCode: 'en',
      bodyValues: [patientName, doctorName, messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : '')],
    },
  }).catch(e => console.error('WhatsApp notifyNewMessage failed:', e));
}