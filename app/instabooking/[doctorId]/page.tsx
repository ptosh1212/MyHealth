'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { 
  User, MapPin, Award, Clock, DollarSign, Calendar, 
  Phone, Mail, AlertCircle, CheckCircle, Stethoscope, Star,
  Zap, ArrowRight, ShieldCheck, Sparkles, Activity, ChevronRight,
  MessageSquare, Briefcase, GraduationCap
} from 'lucide-react';
import { useAlertStore } from '@/lib/alert-store';
import SuccessPulse from '@/components/SuccessPulse';

export default function InstaBooking() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.doctorId as string;
  const { showAlert } = useAlertStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Doctor data
  const [doctorData, setDoctorData] = useState<any>(null);
  const [isAvailableToday, setIsAvailableToday] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    symptoms: '',
    conditions: ''
  });
  
  // Enforced Cash Only for InstaSync
  const paymentMethod = 'cash_on_counter';

  useEffect(() => {
    if (!doctorId) return;
    
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'doctors', doctorId));
        if (docSnap.exists()) {
          const doctor = { uid: doctorId, ...docSnap.data() };
          setDoctorData(doctor);
          
          const today = new Date();
          const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
          setIsAvailableToday(isDoctorAvailable(doctor, dayName));
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [doctorId]);

  const isDoctorAvailable = (doctor: any, dayName: string) => {
    if (doctor.workingDays) return doctor.workingDays.includes(dayName);
    const dayMap: any = { 'Monday': doctor.monday, 'Tuesday': doctor.tuesday, 'Wednesday': doctor.wednesday, 'Thursday': doctor.thursday, 'Friday': doctor.friday, 'Saturday': doctor.saturday, 'Sunday': doctor.sunday };
    return dayMap[dayName] === true;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.symptoms) return;

    setSubmitting(true);
    try {
      let userId = auth.currentUser?.uid;
      
      // Auto-Create Patient Record
      if (!userId) {
        // Check if user with this phone exists
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', formData.phone));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          userId = querySnapshot.docs[0].id;
        } else {
          // Create new patient record
          const anonCred = await signInAnonymously(auth);
          userId = anonCred.user.uid;
          await setDoc(doc(db, 'users', userId), {
            uid: userId,
            name: formData.name,
            phone: formData.phone,
            role: 'patient',
            isGhostAccount: true,
            createdAt: Timestamp.now()
          });
        }
      }

      const fee = doctorData?.fees || doctorData?.consultationFee || 699;
      const total = fee + 25;
      const today = new Date();

      await addDoc(collection(db, 'bookings'), {
        doctorId: doctorData.uid,
        doctorName: doctorData.name,
        doctorSpecialty: doctorData.specialization || 'General',
        userId: userId,
        patientName: formData.name,
        patientAge: parseInt(formData.age),
        patientPhone: formData.phone,
        symptoms: formData.symptoms,
        existingConditions: formData.conditions,
        appointmentDate: Timestamp.fromDate(today),
        appointmentDateStr: today.toISOString().split('T')[0],
        queueNumber: 1, // Placeholder for instant sync
        paymentMethod,
        totalAmount: total,
        status: 'pending',
        isInstant: true,
        createdAt: Timestamp.now()
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Booking error:', error);
      showAlert('Sync Failed', 'We could not synchronize your booking at this moment. Please check your network and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080C10] flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080C10] text-white selection:bg-primary/30 pb-20 overflow-x-hidden">
      
      {/* ── BACKGROUND MESH ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[60%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-violet/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6 py-12">
        
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-12 animate-fade-in">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-[#080C10] shadow-[0_0_20px_rgba(0,229,160,0.3)]">
                 <Zap size={22} strokeWidth={3} />
              </div>
              <h1 className="text-[18px] font-black tracking-tighter uppercase italic">InstaSync</h1>
           </div>
           <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary/60">
              Clinical Directory Mode
           </div>
        </div>

        {/* ── DOCTOR PROFILE CARD ── */}
        <div className="relative group mb-10 animate-fade-in-up">
           <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet/20 blur opacity-30 transition duration-500 rounded-[32px]" />
           <div className="relative bg-[#0E1419] border border-white/[0.08] rounded-[32px] p-8">
              <div className="flex items-center gap-6 mb-8 border-b border-white/[0.05] pb-8">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-primary/20 bg-white/5">
                       {doctorData.profilePic ? (
                         <img src={doctorData.profilePic} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/10">{doctorData.name[0]}</div>
                       )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary text-[#080C10] flex items-center justify-center shadow-lg">
                       <ShieldCheck size={18} strokeWidth={3} />
                    </div>
                 </div>
                 <div>
                    <h2 className="text-[28px] font-black leading-tight">Dr. {doctorData.name}</h2>
                    <p className="text-[14px] font-bold text-primary uppercase tracking-widest mt-1 italic">{doctorData.specialization || 'Clinical Expert'}</p>
                    <div className="flex items-center gap-2 mt-3">
                       <div className="flex gap-1 text-amber">
                          {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                       </div>
                       <span className="text-[12px] font-bold text-white/30 truncate">Verified Specialist</span>
                    </div>
                 </div>
              </div>

              {/* PROFESSIONAL BIO (The "About" request) */}
              <div className="space-y-4 mb-8">
                 <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-violet" />
                    <span className="text-[11px] font-black uppercase text-white/30 tracking-widest">Executive Summary</span>
                 </div>
                 <p className="text-[14px] text-white/60 leading-relaxed italic">
                    &quot;{doctorData.about || `Dr. ${doctorData.name} is a dedicated health professional specializing in ${doctorData.specialization || 'General Medicine'} with over ${doctorData.experience || '10'} years of clinical excellence.`}&quot;
                 </p>
              </div>

              {/* PROFESSIONAL DETAILS (The "Details" request) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                 <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                    <GraduationCap size={18} className="text-primary mt-1" />
                    <div>
                       <p className="text-[10px] font-black text-white/20 uppercase">Degree</p>
                       <p className="text-[13px] font-bold text-white">{doctorData.degree || 'MBBS, MD'}</p>
                    </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                    <MapPin size={18} className="text-violet mt-1" />
                    <div>
                       <p className="text-[10px] font-black text-white/20 uppercase">Practice</p>
                       <p className="text-[13px] font-bold text-white truncate max-w-[120px]">{doctorData.clinicName || 'City Medical'}</p>
                    </div>
                 </div>
              </div>

              {!isAvailableToday && (
                <div className="p-4 bg-rose/10 border border-rose/20 rounded-2xl flex items-center gap-3 text-rose mb-6">
                   <AlertCircle size={20} />
                   <p className="text-[12px] font-bold italic">Schedule not active today. Booking for tomorrow.</p>
                </div>
              )}
           </div>
        </div>

        {/* ── BOOKING FORM ── */}
        <form onSubmit={handleBooking} className="space-y-6 animate-fade-in-up delay-150">
           <div className="space-y-4">
              <h3 className="text-[18px] font-black uppercase tracking-widest text-white/30 px-2 flex items-center gap-2">
                 <User size={16} /> Patient Dossier
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-white/40 ml-2">Full Identity</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Rahul Sharma"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-[14px] focus:outline-none focus:border-primary/40 transition-all font-medium"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-white/40 ml-2">Age</label>
                    <input 
                      required
                      type="number" 
                      placeholder="24"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-[14px] focus:outline-none focus:border-primary/40 transition-all font-medium"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black uppercase text-white/40 ml-2">Protected Phone Number</label>
                 <div className="relative">
                    <Phone size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                      required
                      type="tel" 
                      placeholder="+91 00000 00000"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 text-[14px] focus:outline-none focus:border-primary/40 transition-all font-medium"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black uppercase text-white/40 ml-2">Clinical Symptoms</label>
                 <textarea 
                   required
                   placeholder="Describe how you feel..."
                   className="w-full min-h-[100px] py-4 bg-white/5 border border-white/10 rounded-2xl px-5 text-[14px] focus:outline-none focus:border-primary/40 transition-all font-medium"
                   value={formData.symptoms}
                   onChange={e => setFormData({...formData, symptoms: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-4 pt-4">
              <h3 className="text-[18px] font-black uppercase tracking-widest text-white/30 px-2 flex items-center gap-2">
                 <Activity size={16} /> Transaction Protocol
              </h3>
              
              {/* Only Cash shown here - Static Badge */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3 text-primary">
                 <DollarSign size={20} />
                 <span className="text-[13px] font-black uppercase tracking-[2px]">CASH AT CLINIC COUNTER</span>
                 <CheckCircle size={16} className="ml-auto" />
              </div>

              <div className="p-6 rounded-[28px] bg-white/[0.03] border border-white/5">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] text-white/30 font-bold uppercase tracking-widest">Clinical Fee</span>
                    <span className="text-[14px] font-black">₹{doctorData.fees || 699}</span>
                 </div>
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[12px] text-white/30 font-bold uppercase tracking-widest">Platform Service</span>
                    <span className="text-[14px] font-black">₹25</span>
                 </div>
                 <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                    <span className="text-[14px] font-black uppercase text-primary tracking-widest">Final Pulse</span>
                    <span className="text-[24px] font-black tracking-tight">₹{(doctorData.fees || 699) + 25}</span>
                 </div>
              </div>
           </div>

           <button
             type="submit"
             disabled={submitting}
             className="w-full relative group h-16 rounded-[40px] bg-primary flex items-center justify-center text-[#080C10] shadow-[0_20px_50px_rgba(0,229,160,0.2)] overflow-hidden transition-all active:scale-95 disabled:opacity-50"
           >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <div className="relative flex items-center gap-3 text-[16px] font-black uppercase tracking-[3px]">
                 {submitting ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                 ) : (
                    <>Sync Appointment <ArrowRight size={20} strokeWidth={3} /></>
                 )}
              </div>
           </button>
        </form>

        <p className="text-center text-[10px] text-white/20 uppercase tracking-[4px] mt-12">
           Encrypted End-to-End • Health lol
        </p>
      </div>

      <SuccessPulse 
        isOpen={showSuccess} 
        onClose={() => router.push('/patient/home')} 
        message="Booking Synced!" 
        subMessage="Redirecting to Portal..."
      />

      <style>{`
        .shadow-glow { box-shadow: 0 0 80px rgba(0,229,160,0.1); }
      `}</style>
    </div>
  );
}