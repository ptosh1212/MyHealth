'use client';

import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, ShieldCheck, ChevronRight, Info, Activity } from 'lucide-react';
import { addDoc, collection, Timestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { useAlertStore } from '@/lib/alert-store';
import { notifyAppointmentBooked } from '@/lib/whatsapp';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: any;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, label: 'Schedule' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Confirm' },
];

export default function BookingModal({ isOpen, onClose, doctor, onSuccess }: BookingModalProps) {
  const { user } = useAuthStore();
  const { showAlert } = useAlertStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [queueCount, setQueueCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [existingConditions, setExistingConditions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_counter');
  const [timeSlots, setTimeSlots] = useState<any[]>([]);

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate time slots when date changes
  useEffect(() => {
    if (!selectedDate || !doctor) {
      setTimeSlots([]);
      return;
    }

    const selectedDateObj = new Date(selectedDate);
    const isToday = selectedDateObj.toDateString() === new Date().toDateString();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let startHour = 9;
    let endHour = 18;

    if (doctor.timings) {
      const timingMatch = doctor.timings.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*-\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (timingMatch) {
        let [, startH, , startAP, endH, , endAP] = timingMatch;
        startHour = parseInt(startH);
        endHour = parseInt(endH);
        if (startAP && startAP.toLowerCase() === 'pm' && startHour !== 12) startHour += 12;
        if (startAP && startAP.toLowerCase() === 'am' && startHour === 12) startHour = 0;
        if (endAP && endAP.toLowerCase() === 'pm' && endHour !== 12) endHour += 12;
        if (endAP && endAP.toLowerCase() === 'am' && endHour === 12) endHour = 0;
      }
    }

    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) continue;
        const nextMinute = minute + 30;
        const nextHour = nextMinute >= 60 ? hour + 1 : hour;
        const adjustedNextMinute = nextMinute >= 60 ? 0 : nextMinute;
        if (nextHour > endHour || (nextHour === endHour && adjustedNextMinute > 0)) break;

        const formatTime = (h: number, m: number) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
          return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
        };

        const startTime = formatTime(hour, minute);
        const endTime = formatTime(nextHour, adjustedNextMinute);
        let period = 'Morning';
        if (hour >= 12 && hour < 17) period = 'Afternoon';
        else if (hour >= 17 && hour < 20) period = 'Evening';
        else if (hour >= 20 || hour < 6) period = 'Night';

        slots.push({ id: `${startTime} - ${endTime}`, label: `${startTime} - ${endTime}`, period });
      }
    }

    // Extra late-night slot spanning midnight
    if (!(isToday && (currentHour > 23 || (currentHour === 23 && currentMinute >= 50)))) {
      slots.push({ id: '11:50 PM - 12:00 AM', label: '11:50 PM - 12:00 AM', period: 'Night' });
    }

    setTimeSlots(slots);
  }, [selectedDate, doctor]);

  // Fetch queue count
  useEffect(() => {
    if (selectedDate && doctor) {
      const fetchQueueCount = async () => {
        try {
          const q = query(collection(db, 'bookings'), where('doctorId', '==', doctor.id), where('appointmentDateStr', '==', selectedDate));
          const snapshot = await getDocs(q);
          setQueueCount(snapshot.size);
        } catch (error) {
          console.error('Error fetching queue:', error);
          setQueueCount(0);
        }
      };
      fetchQueueCount();
    }
  }, [selectedDate, doctor]);

  if (!isOpen || !doctor) return null;

  const isDoctorAvailableOnDay = (date: Date) => {
    const dayName = DAYS[date.getDay()];
    const workingDays = doctor.workingDays || doctor.availableDays || [];
    if (workingDays.length === 0) return true;
    return workingDays.some((day: string) =>
      day.toLowerCase() === dayName.toLowerCase() ||
      day.toLowerCase().startsWith(dayName.toLowerCase().slice(0, 3))
    );
  };

  const getNext14Days = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        dateStr: date.toISOString().split('T')[0],
        day: SHORT_DAYS[date.getDay()],
        dayNum: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: i === 0,
        isAvailable: isDoctorAvailableOnDay(date)
      });
    }
    return days;
  };

  const availableDates = getNext14Days();

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !symptoms.trim()) {
      showAlert('Input Required', 'Please fill all required fields to proceed with your booking.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const consultationFee = doctor.fees || doctor.consultationFee || 699;
      const extraCharge = 25;
      const totalAmount = consultationFee + extraCharge;

      await addDoc(collection(db, 'bookings'), {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialization || doctor.specialty || 'General',
        userId: user?.uid,
        userName: user?.email,
        patientName: user?.email?.split('@')[0],
        patientAge: 25,
        symptoms: symptoms.trim(),
        existingConditions: existingConditions.trim(),
        appointmentDate: Timestamp.fromDate(new Date(selectedDate)),
        appointmentDateStr: selectedDate,
        appointmentDay: new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }),
        appointmentTimeSlot: selectedTime,
        queueNumber: queueCount + 1,
        paymentMethod: paymentMethod,
        consultationFee: consultationFee,
        extraCharge: extraCharge,
        totalAmount: totalAmount,
        paymentStatus: 'pending',
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      try {
        const patientDoc = await getDoc(doc(db, 'users', user?.uid || ''));
        const doctorDoc = await getDoc(doc(db, 'doctors', doctor.id));
        const patientPhone = patientDoc.data()?.phone || '';
        const doctorPhone = doctorDoc.data()?.phone || '';
        const patientName = patientDoc.data()?.name || user?.email?.split('@')[0] || 'Patient';
        if (patientPhone && doctorPhone) {
          await notifyAppointmentBooked(patientPhone, doctorPhone, patientName, doctor.name, new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), selectedTime.split(' - ')[0]);
        }
      } catch (waErr) { console.error('WhatsApp notify failed:', waErr); }

      onSuccess();
      onClose();
      setStep(1);
    } catch (error) {
      console.error('Booking error:', error);
      showAlert('Booking Failed', 'We encountered a synchronization error. Please try again or check your connectivity.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full sm:max-w-xl max-h-[92svh] bg-white rounded-t-2xl sm:rounded-2xl border-t border-gray-200 sm:border sm:border-gray-200 shadow-sm flex flex-col animate-slide-up">

        {/* Handle for mobile */}
        <div className="sm:hidden flex justify-center py-2.5">
          <div className="w-12 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="text-[17px] font-semibold text-gray-900">Book appointment</h2>
            <p className="text-[13px] text-gray-500">Dr. {doctor.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="px-6 py-4 flex items-center gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 flex flex-col gap-1.5">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= s.id ? 'bg-teal-500' : 'bg-gray-100'
              }`} />
              <span className={`text-[11px] font-medium ${
                step >= s.id ? 'text-teal-700' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">

          {step === 1 && (
            <div className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="block text-[13px] font-medium text-gray-600 mb-4">
                  Select consultation date
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {availableDates.map((dateObj) => {
                    const isSelected = selectedDate === dateObj.dateStr;
                    return (
                      <button
                        key={dateObj.dateStr}
                        onClick={() => dateObj.isAvailable && setSelectedDate(dateObj.dateStr)}
                        disabled={!dateObj.isAvailable}
                        className={`flex flex-col items-center py-3 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? 'bg-teal-50 border-teal-400 text-teal-700'
                            : dateObj.isAvailable
                            ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                            : 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase mb-1">{dateObj.day}</span>
                        <span className="text-[16px] font-semibold mb-0.5">{dateObj.dayNum}</span>
                        <span className="text-[10px] font-medium opacity-70">{dateObj.month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Queue Status */}
              {selectedDate && (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Activity size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-teal-800">Live queue info</h4>
                    <p className="text-[12px] text-gray-500 leading-tight">
                      {queueCount === 0
                        ? "You'll be the first patient to be seen."
                        : `${queueCount} patients already booked. You'll be #${queueCount + 1}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <label className="block text-[13px] font-medium text-gray-600 mb-4">
                    Available time slots
                  </label>
                  {timeSlots.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-[14px] text-gray-400">No slots available for this day</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {timeSlots.map((slot) => {
                        const isSelected = selectedTime === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedTime(slot.id)}
                            className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                              isSelected
                                ? 'bg-teal-50 border-teal-400'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{slot.period}</p>
                            <p className={`text-[13px] font-semibold ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                              {slot.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-800 leading-snug">
                  Please describe your health concerns accurately to help the doctor prepare for your visit.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-600 mb-2">
                    What symptoms are you feeling? *
                  </label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full min-h-[140px] rounded-xl border border-gray-200 bg-white px-4 pt-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                    placeholder="Example: Mild fever, cough, chest pain since 2 days..."
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-600 mb-2">
                    Existing conditions / allergies
                  </label>
                  <textarea
                    value={existingConditions}
                    onChange={(e) => setExistingConditions(e.target.value)}
                    className="w-full min-h-[100px] rounded-xl border border-gray-200 bg-white px-4 pt-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                    placeholder="Example: Diabetes, Hypertension, Penicillin allergy..."
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-white border border-gray-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-[15px] font-semibold text-gray-900">Booking summary</h3>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold">
                    <ShieldCheck size={11} className="mr-1" /> Verified
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium mb-1">Doctor</p>
                    <p className="text-[14px] text-gray-900 font-semibold flex items-center gap-1.5">
                      Dr. {doctor.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium mb-1">Date & time</p>
                    <p className="text-[14px] text-gray-900 font-semibold">
                      {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {selectedTime.split(' - ')[0]}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-gray-400 font-medium mb-1">Payment via</p>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                        <DollarSign size={16} className="text-teal-600" />
                      </div>
                      <p className="text-[14px] text-gray-900 font-semibold">Pay at clinic counter</p>
                      <CheckCircle size={16} className="text-teal-600 ml-auto" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 space-y-2 border-t border-gray-100">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">Consultation fee</span>
                    <span className="text-gray-900 font-medium">₹{doctor.fees || 699}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">Platform & processing</span>
                    <span className="text-gray-900 font-medium">₹25</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[15px] font-semibold text-gray-900">Total amount</span>
                    <span className="text-[20px] font-bold text-teal-700">₹{(doctor.fees || 699) + 25}</span>
                  </div>
                </div>
              </div>

              {/* Policy Hint */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <ShieldCheck size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  Your privacy is important. Patient data is encrypted and only visible to the assigned doctor.
                  By proceeding, you agree to our <span className="text-teal-700 cursor-pointer hover:underline">Terms of Service</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center justify-center w-14 h-[50px] rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-800 transition-all active:scale-95"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
            )}
            <button
              onClick={() => {
                if (step < 3) {
                  if (step === 1 && (!selectedDate || !selectedTime)) return;
                  setStep(step + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={loading || (step === 1 && (!selectedDate || !selectedTime))}
              className="flex-1 h-[50px] rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[15px] font-semibold transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {step === 3 ? 'Confirm & book' : 'Continue'}
                  {step !== 3 && <ChevronRight size={18} />}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper for DollarSign as it's not imported but used in summary
function DollarSign({ size, className }: { size: number, className: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}