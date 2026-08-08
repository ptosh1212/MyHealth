'use client';

import { useState } from 'react';
import { addDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Phone, Calendar, DollarSign, Search, User } from 'lucide-react';

const CALLBACK_REASONS = [
  { key: 'follow_up_previous', label: 'Follow-up on Previous Visit', icon: '🔄' },
  { key: 'report_review', label: 'Lab Report / Test Review', icon: '📋' },
  { key: 'medicine_adjustment', label: 'Medicine Adjustment', icon: '💊' },
  { key: 'post_procedure', label: 'Post-Procedure Check', icon: '🏥' },
  { key: 'urgent_concern', label: 'Urgent Medical Concern', icon: '⚠️' },
  { key: 'other', label: 'Other / Personal Note', icon: '📝' },
];

export default function CreateCallbackModal({ 
  completedBookings, 
  doctorData, 
  onClose, 
  onSaved 
}: { 
  completedBookings: any[]; 
  doctorData: any; 
  onClose: () => void; 
  onSaved: () => void;
}) {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [customFee, setCustomFee] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredBookings = completedBookings.filter(booking =>
    booking.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedReason) {
      alert('Please select a callback reason');
      return;
    }

    if (selectedReason === 'other' && !customNote.trim()) {
      alert('Please write your reason for the callback');
      return;
    }

    if (!callbackDate.trim()) {
      alert('Please enter a date for the callback appointment');
      return;
    }

    if (!isFree && (!customFee.trim() || isNaN(parseInt(customFee)))) {
      alert('Enter the consultation fee or mark it as free');
      return;
    }

    setSaving(true);
    try {
      const reasonLabel = CALLBACK_REASONS.find(r => r.key === selectedReason)?.label ?? selectedReason;
      const fee = isFree ? 0 : parseInt(customFee);
      const extraCharge = isFree ? 0 : 25;
      const total = fee + extraCharge;

      // Parse date
      let appointmentTimestamp: any = null;
      let appointmentDateStr = callbackDate.trim();
      const parsedDate = new Date(callbackDate.trim());
      
      if (!isNaN(parsedDate.getTime())) {
        appointmentTimestamp = Timestamp.fromDate(parsedDate);
        appointmentDateStr = parsedDate.toISOString().split('T')[0];
      } else {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 3);
        appointmentTimestamp = Timestamp.fromDate(fallback);
      }

      // Mark callback on original booking
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        callbackRequested: true,
        callbackReasonType: selectedReason,
        callbackReason: reasonLabel,
        callbackNote: customNote.trim(),
        callbackDate: callbackDate.trim(),
        callbackRequestedAt: Timestamp.now(),
        callbackRequestedBy: doctorData?.name || 'Doctor',
      });

      // Create new confirmed booking
      await addDoc(collection(db, 'bookings'), {
        doctorId: doctorData?.uid || '',
        doctorName: doctorData?.name || '',
        doctorSpecialty: doctorData?.specialty || 'General',
        userId: selectedBooking.userId,
        userName: selectedBooking.userName || '',
        userPhone: selectedBooking.userPhone || '',
        patientName: selectedBooking.patientName,
        patientAge: selectedBooking.patientAge,
        appointmentDate: appointmentTimestamp,
        appointmentDateStr: appointmentDateStr,
        appointmentDay: appointmentTimestamp.toDate().toLocaleDateString('en-US', { weekday: 'long' }),
        appointmentDateHint: callbackDate.trim(),
        queueNumber: 0,
        symptoms: `[CALLBACK] ${selectedBooking.symptoms}`,
        existingConditions: selectedBooking.existingConditions || '',
        notes: customNote.trim() ? `Callback reason: ${reasonLabel}. ${customNote.trim()}` : `Callback reason: ${reasonLabel}`,
        paymentMethod: isFree ? 'free' : 'cash_on_counter',
        consultationFee: fee,
        extraCharge: extraCharge,
        totalAmount: total,
        paymentStatus: isFree ? 'free' : 'pending',
        isFreeConsultation: isFree,
        status: 'confirmed',
        confirmedByDoctor: true,
        autoConfirmed: true,
        isCallback: true,
        callbackReasonType: selectedReason,
        callbackReason: reasonLabel,
        callbackNote: customNote.trim(),
        callbackFromBookingId: selectedBooking.id,
        createdAt: Timestamp.now(),
      });

      onSaved();
    } catch (error) {
      console.error('Error creating callback:', error);
      alert('Failed to create callback appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={ onClose} />
        <div className="relative w-full sm:max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl p-6 md:p-8 animate-slide-up pb-12 sm:pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Phone className="text-primary" size={28} />
              Schedule Callback
            </h2>
            <p className="text-slate-500">
              {step === 'select' ? 'Select a patient from completed visits' : `Creating callback for ${selectedBooking?.patientName}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Step 1: Select Patient */}
        {step === 'select' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Patients List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <User size={48} className="mx-auto mb-3 text-gray-600" />
                  <p>No completed visits found</p>
                </div>
              ) : (
                filteredBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setStep('details');
                    }}
                    className="w-full p-4 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-primary/50 transition text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {booking.patientName?.charAt(0) || 'P'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{booking.patientName}</h3>
                        <p className="text-sm text-slate-500">
                          {booking.patientAge} years · Last visit: Completed
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{booking.symptoms}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Callback Details */}
        {step === 'details' && selectedBooking && (
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="p-4 bg-white rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {selectedBooking.patientName?.charAt(0) || 'P'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold">{selectedBooking.patientName}</h3>
                  <p className="text-sm text-slate-500">{selectedBooking.patientAge} years</p>
                </div>
              </div>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Why are you calling this patient back?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CALLBACK_REASONS.map((reason) => (
                  <button
                    key={reason.key}
                    onClick={() => setSelectedReason(reason.key)}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      selectedReason === reason.key
                        ? 'border-primary bg-primary/20'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reason.icon}</span>
                      <span className="font-medium text-sm">{reason.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Note */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {selectedReason === 'other' ? 'Your Reason (Required) *' : 'Additional Note (Optional)'}
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition min-h-[100px]"
                placeholder="Describe the specific reason for calling this patient back..."
              />
            </div>

            {/* Callback Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Appointment Date / Time *</label>
              <input
                type="text"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
                placeholder="e.g. 2026-01-15, Tomorrow 10 AM, After 3 days"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Enter a standard date for proper calendar display
              </p>
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="block text-sm font-medium mb-3">Consultation Fee *</label>
              
              <button
                onClick={() => setIsFree(!isFree)}
                className={`w-full p-4 rounded-xl border-2 transition mb-3 ${
                  isFree ? 'border-green-500 bg-green-500/20' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎁</span>
                    <div className="text-left">
                      <p className="font-medium">{isFree ? 'Free Consultation ✓' : 'Mark as Free Consultation'}</p>
                      <p className="text-sm text-slate-500">No charge for this callback visit</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isFree ? 'border-green-500 bg-green-500' : 'border-white/30'
                  }`}>
                    {isFree && <span className="text-slate-900 text-xs">✓</span>}
                  </div>
                </div>
              </button>

              {!isFree && (
                <div>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <DollarSign className="text-primary" size={20} />
                    <input
                      type="number"
                      value={customFee}
                      onChange={(e) => setCustomFee(e.target.value)}
                      className="flex-1 bg-transparent focus:outline-none"
                      placeholder={`Default: ${doctorData?.fees ?? 699}`}
                    />
                    <span className="text-sm text-slate-500">+ ₹25 handling</span>
                  </div>
                  {customFee && !isNaN(parseInt(customFee)) && (
                    <p className="text-sm text-primary mt-2">
                      Patient pays: ₹{parseInt(customFee) + 25} total
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep('select')}
                className="flex-1 px-6 py-3 bg-slate-100 rounded-xl hover:bg-white/20 transition font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-primary text-slate-900 rounded-xl hover:opacity-90 transition font-semibold disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Callback'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}