'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import DoctorSidebar from '@/components/DoctorSidebar';
import { Clock, Calendar, Save, CheckCircle, Info, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider';
const INPUT = 'border border-slate-300 px-3 py-2.5 text-[14px] text-slate-800 bg-white focus:outline-none focus:border-teal-700';

export default function DoctorSettings() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endPeriod, setEndPeriod] = useState('PM');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchDoctorData();
  }, [user]);

  const fetchDoctorData = async () => {
    try {
      const docRef = doc(db, 'doctors', user?.uid || '');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.workingDays && Array.isArray(data.workingDays)) {
          setWorkingDays(data.workingDays);
        } else {
          const days = [];
          for (const day of DAYS) {
            if (data[day.toLowerCase()] === true) days.push(day);
          }
          setWorkingDays(days);
        }
        if (data.timings) {
          const timingMatch = data.timings.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*-\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
          if (timingMatch) {
            const [, startH, startM, startAP, endH, endM, endAP] = timingMatch;
            setStartTime(`${startH.padStart(2, '0')}:${(startM || '00').padStart(2, '0')}`);
            setEndTime(`${endH.padStart(2, '0')}:${(endM || '00').padStart(2, '0')}`);
            setStartPeriod(startAP?.toUpperCase() || 'AM');
            setEndPeriod(endAP?.toUpperCase() || 'PM');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSave = async () => {
    if (workingDays.length === 0) {
      alert('Please select at least one working day');
      return;
    }
    setSaving(true);
    try {
      const docRef = doc(db, 'doctors', user?.uid || '');
      const timingsString = `${startTime} ${startPeriod} - ${endTime} ${endPeriod}`;
      const updateData: any = {
        workingDays: workingDays,
        timings: timingsString,
        updatedAt: Timestamp.now(),
      };
      for (const day of DAYS) {
        updateData[day.toLowerCase()] = workingDays.includes(day);
      }
      await updateDoc(docRef, updateData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="doctor-page min-h-svh bg-white">
        <DoctorSidebar />
        <div className="flex-1 flex items-center justify-center min-h-svh">
          <Loader2 size={24} className="text-slate-300 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-page min-h-svh bg-white">
      <DoctorSidebar />

      <div className="px-4 py-8 max-w-4xl mx-auto lg:px-8 space-y-6 pb-24">

        {/* Header */}
        <div className="pb-5 border-b border-slate-200">
           <h1 className="text-[22px] font-semibold text-slate-900">Clinic availability</h1>
           <p className="text-[13px] text-slate-400 mt-1">Configure your working schedule and consultation hours</p>
        </div>

        {/* Success Alert */}
        {saved && (
           <div className="p-4 border border-teal-700 bg-teal-50 flex items-center gap-3">
              <CheckCircle className="text-teal-700" size={18} />
              <p className="text-[13px] font-semibold text-teal-800">Availability settings updated</p>
           </div>
        )}

        <div className="grid grid-cols-1 gap-6">

           {/* Working Days Card */}
           <div className={`${CARD} p-6 md:p-8 space-y-6`}>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                 <Calendar className="text-slate-500" size={17} />
                 <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Work days</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                 {DAYS.map((day) => {
                    const isSelected = workingDays.includes(day);
                    return (
                       <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`flex flex-col items-center py-3.5 border transition-colors ${
                            isSelected
                               ? 'bg-teal-700 border-teal-700 text-white'
                               : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'
                          }`}
                       >
                          <span className="text-[13px] font-semibold">{day.slice(0, 3)}</span>
                          <span className="text-[10px] mt-1 uppercase font-semibold opacity-70">
                             {isSelected ? 'On' : 'Off'}
                          </span>
                       </button>
                    );
                 })}
              </div>
              <p className="text-[12px] text-slate-400">
                Patients will only see these days as available for booking.
              </p>
           </div>

           {/* Timings Card */}
           <div className={`${CARD} p-6 md:p-8 space-y-7`}>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                 <Clock className="text-slate-500" size={17} />
                 <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wider">Office hours</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Start */}
                 <div className="space-y-3">
                    <label className={`${LABEL} block`}>Start time</label>
                    <div className="flex gap-2">
                       <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className={`${INPUT} flex-1`}
                       />
                       <select
                          value={startPeriod}
                          onChange={(e) => setStartPeriod(e.target.value)}
                          className={`${INPUT} w-24 font-semibold`}
                       >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                       </select>
                    </div>
                 </div>

                 {/* End */}
                 <div className="space-y-3">
                    <label className={`${LABEL} block`}>End time</label>
                    <div className="flex gap-2">
                       <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className={`${INPUT} flex-1`}
                       />
                       <select
                          value={endPeriod}
                          onChange={(e) => setEndPeriod(e.target.value)}
                          className={`${INPUT} w-24 font-semibold`}
                       >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                       </select>
                    </div>
                 </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-5 border-t border-slate-200 space-y-3">
                 <label className={`${LABEL} block`}>Quick presets</label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                       { label: 'Morning', time: '9:00 AM - 5:00 PM', s: '09:00', sp: 'AM', e: '05:00', ep: 'PM' },
                       { label: 'Evening', time: '2:00 PM - 10:00 PM', s: '02:00', sp: 'PM', e: '10:00', ep: 'PM' },
                       { label: 'Full day', time: '10:00 AM - 9:00 PM', s: '10:00', sp: 'AM', e: '09:00', ep: 'PM' },
                    ].map((pre) => (
                       <button
                          key={pre.label}
                          onClick={() => {
                             setStartTime(pre.s); setStartPeriod(pre.sp);
                             setEndTime(pre.e); setEndPeriod(pre.ep);
                          }}
                          className="p-4 border border-slate-200 text-left hover:border-slate-400 transition-colors"
                       >
                          <p className="text-[14px] font-semibold text-slate-800 mb-1">{pre.label}</p>
                          <p className="text-[11px] text-slate-400">{pre.time}</p>
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Save Action */}
           <div className="sticky bottom-6">
              <div className={`max-w-4xl bg-white border border-slate-200 p-4 shadow-sm`}>
                 <button
                    onClick={handleSave}
                    disabled={saving || workingDays.length === 0}
                    className="w-full py-3.5 text-[14px] font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {saving ? (
                       <Loader2 size={16} className="animate-spin" />
                    ) : (
                       <Save size={16} />
                    )}
                    {saving ? 'Saving…' : 'Save availability'}
                 </button>
              </div>
           </div>

           {/* Info Box */}
           <div className="flex items-start gap-3 p-4 border border-slate-200 bg-slate-50">
              <Info className="text-slate-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-[13px] text-slate-500 leading-relaxed">
                These timings are used to automatically generate 30-minute booking slots for patients.
                Give yourself enough break time during these hours.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}