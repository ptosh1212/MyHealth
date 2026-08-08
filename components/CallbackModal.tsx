'use client';

import { useState } from 'react';
import { addDoc, collection, updateDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifyFollowUp } from '@/lib/whatsapp';
import { X, Phone, DollarSign, Calendar, ChevronRight, CheckCircle, Info, Sparkles, Gift } from 'lucide-react';

const CALLBACK_REASONS = [
  { key: 'follow_up_previous', label: 'Follow-up Visit', icon: '🔄', color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'report_review', label: 'Report Review', icon: '📋', color: 'text-violet', bg: 'bg-violet/10' },
  { key: 'medicine_adjustment', label: 'Medicine Check', icon: '💊', color: 'text-rose', bg: 'bg-rose/10' },
  { key: 'urgent_concern', label: 'Urgent Medical', icon: '⚠️', color: 'text-amber', bg: 'bg-amber/10' },
];

export default function CallbackModal({ 
  booking, 
  doctorData, 
  onClose, 
  onSaved 
}: { 
  booking: any; 
  doctorData: any; 
  onClose: () => void; 
  onSaved: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [customFee, setCustomFee] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedReason) { alert('Please select a callback reason'); return; }
    if (!callbackDate.trim()) { alert('Please enter a date for the callback appointment'); return; }
    if (!isFree && (!customFee.trim() || isNaN(parseInt(customFee)))) { alert('Enter the consultation fee'); return; }

    setSaving(true);
    try {
      const reasonLabel = CALLBACK_REASONS.find(r => r.key === selectedReason)?.label ?? selectedReason;
      const fee = isFree ? 0 : parseInt(customFee);
      const extraCharge = isFree ? 0 : 25;
      const total = fee + extraCharge;

      let appointmentTimestamp: any = Timestamp.now();
      let appointmentDateStr = callbackDate.trim();
      const parsedDate = new Date(callbackDate.trim());
      if (!isNaN(parsedDate.getTime())) {
        appointmentTimestamp = Timestamp.fromDate(parsedDate);
        appointmentDateStr = parsedDate.toISOString().split('T')[0];
      }

      await updateDoc(doc(db, 'bookings', booking.id), {
        callbackRequested: true,
        callbackReason: reasonLabel,
        callbackRequestedAt: Timestamp.now(),
      });

      await addDoc(collection(db, 'bookings'), {
        doctorId: doctorData?.uid || '',
        doctorName: doctorData?.name || '',
        userId: booking.userId,
        userName: booking.userName || '',
        userPhone: booking.userPhone || '',
        patientName: booking.patientName,
        patientAge: booking.patientAge,
        appointmentDate: appointmentTimestamp,
        appointmentDateStr: appointmentDateStr,
        queueNumber: 0,
        symptoms: `[CALLBACK] ${booking.symptoms}`,
        paymentMethod: isFree ? 'free' : 'cash_on_counter',
        consultationFee: fee,
        totalAmount: total,
        status: 'confirmed',
        confirmedByDoctor: true,
        isCallback: true,
        callbackReason: reasonLabel,
        createdAt: Timestamp.now(),
      });

      try {
        const patientSnap = await getDoc(doc(db, 'users', booking.userId));
        const patientPhone = patientSnap.data()?.phone || booking.userPhone || '';
        if (patientPhone) await notifyFollowUp(patientPhone, patientSnap.data()?.name || booking.patientName, doctorData?.name || 'Doctor', callbackDate.trim(), reasonLabel);
      } catch (e) {}

      onSaved(); onClose();
    } catch (error) { console.error('Callback error:', error); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-xl max-h-[92svh] bg-[#0E1419] rounded-t-[32px] sm:rounded-3xl border-t border-white/[0.08] sm:border border-white/[0.08] shadow-2xl flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/[0.05] bg-[#0E1419]/80 backdrop-blur-xl z-20">
          <div>
            <h2 className="text-[20px] font-black text-white">Schedule Follow-up</h2>
            <p className="text-[12px] text-white/30 uppercase tracking-widest font-bold">Patient: {booking.patientName}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-12">
          
          {/* Reason Selection */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-1">
               <Sparkles size={16} className="text-primary" />
               <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">Clinical Reason</h3>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                {CALLBACK_REASONS.map((reason) => (
                  <button
                    key={reason.key}
                    onClick={() => setSelectedReason(reason.key)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center gap-3 group ${
                      selectedReason === reason.key 
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,229,160,0.1)] scale-[1.02]' 
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${reason.bg}`}>
                       {reason.icon}
                    </div>
                    <span className={`text-[12px] font-black uppercase tracking-wider ${selectedReason === reason.key ? 'text-white' : 'text-white/30'}`}>
                      {reason.label}
                    </span>
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-6">
             <div className="space-y-2">
               <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Detailed Follow-up Note</label>
               <textarea 
                 value={customNote} 
                 onChange={(e) => setCustomNote(e.target.value)} 
                 className="input-dark min-h-[100px] pt-3" 
                 placeholder="Specific instructions or reason for return visit..."
               />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Next Visit Date</label>
                   <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      <input 
                        type="text" 
                        value={callbackDate} 
                        onChange={(e) => setCallbackDate(e.target.value)} 
                        className="input-dark pl-11" 
                        placeholder="e.g. Tomorrow 10AM"
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-1">Consulation Fee (₹)</label>
                   <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <input 
                        type="number" 
                        value={customFee} 
                        onChange={(e) => setCustomFee(e.target.value)} 
                        disabled={isFree}
                        className={`input-dark pl-11 ${isFree ? 'opacity-20 cursor-not-allowed' : ''}`} 
                        placeholder={doctorData?.fees || '699'}
                      />
                   </div>
                </div>
             </div>

             <button 
               onClick={() => { setIsFree(!isFree); if(!isFree) setCustomFee('0'); }}
               className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                 isFree ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(0,229,160,0.1)]' : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
               }`}
             >
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isFree ? 'bg-primary text-black' : 'bg-white/[0.05] text-white/30 group-hover:text-primary'}`}>
                      <Gift size={20} />
                   </div>
                   <div className="text-left">
                      <p className={`text-[14px] font-black ${isFree ? 'text-white' : 'text-white/40'}`}>Complimentary Visit</p>
                      <p className="text-[11px] text-white/20 font-bold uppercase tracking-widest">Mark as Free Follow-up</p>
                   </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isFree ? 'bg-primary border-primary scale-110' : 'border-white/10'}`}>
                   {isFree && <CheckCircle size={14} className="text-black" />}
                </div>
             </button>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-violet/5 border border-violet/10">
             <Info className="text-violet flex-shrink-0 mt-0.5" size={16} />
             <p className="text-[12px] text-violet/70 leading-relaxed font-medium">
               The patient will receive a WhatsApp notification with the new appointment date and reason for their follow-up visit.
             </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-white/[0.05] bg-white/[0.01]">
           <button 
             onClick={handleSave}
             disabled={saving}
             className="w-full btn-primary h-[54px] text-[15px] font-black uppercase tracking-[2px] flex items-center justify-center gap-2 group active:scale-[0.98]"
           >
             {saving ? (
               <div className="w-5 h-5 border-3 border-black border-t-transparent animate-spin rounded-full" />
             ) : (
               <>CONFIRM FOLLOW-UP <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
             )}
           </button>
        </div>
      </div>
    </div>
  );
}
