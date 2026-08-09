'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import {
  User, MapPin, Phone, AlertCircle, CheckCircle, Star,
  ArrowRight, Activity, MessageSquare, GraduationCap
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

  const [doctorData, setDoctorData] = useState<any>(null);
  const [isAvailableToday, setIsAvailableToday] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    symptoms: '',
    conditions: ''
  });

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

      if (!userId) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', formData.phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          userId = querySnapshot.docs[0].id;
        } else {
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
        queueNumber: 1,
        paymentMethod,
        totalAmount: total,
        status: 'pending',
        isInstant: true,
        createdAt: Timestamp.now()
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Booking error:', error);
      showAlert('Booking failed', 'We could not save your booking right now. Please check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black pb-20">
      <div className="max-w-xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10 border-b-2 border-black pb-4">
          <h1 className="text-lg font-bold tracking-tight">Book an appointment</h1>
          <span className="text-xs font-medium text-gray-500 border border-gray-300 px-2 py-1">
            Instant booking
          </span>
        </div>

        {/* DOCTOR PROFILE */}
        <div className="border-2 border-black mb-8">
          <div className="flex items-center gap-5 p-6 border-b-2 border-black">
            <div className="w-20 h-20 border-2 border-black bg-gray-100 flex-shrink-0 overflow-hidden">
              {doctorData.profilePic ? (
                <img src={doctorData.profilePic} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {doctorData.name[0]}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Dr. {doctorData.name}</h2>
              <p className="text-sm font-medium text-gray-600 mt-1">
                {doctorData.specialization || 'General Medicine'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-0.5 text-black">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <span className="text-xs text-gray-500">Verified</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-b-2 border-black">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">About</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {doctorData.about || `Dr. ${doctorData.name} specializes in ${doctorData.specialization || 'General Medicine'} with over ${doctorData.experience || '10'} years of clinical experience.`}
            </p>
          </div>

          <div className="grid grid-cols-2">
            <div className="p-5 border-r-2 border-black flex items-start gap-3">
              <GraduationCap size={16} className="mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Degree</p>
                <p className="text-sm font-medium">{doctorData.degree || 'MBBS, MD'}</p>
              </div>
            </div>
            <div className="p-5 flex items-start gap-3">
              <MapPin size={16} className="mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Clinic</p>
                <p className="text-sm font-medium truncate">{doctorData.clinicName || 'City Medical'}</p>
              </div>
            </div>
          </div>

          {!isAvailableToday && (
            <div className="p-4 bg-gray-100 border-t-2 border-black flex items-center gap-3">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">Doctor is not scheduled today. This will book for tomorrow.</p>
            </div>
          )}
        </div>

        {/* BOOKING FORM */}
        <form onSubmit={handleBooking} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 flex items-center gap-2">
              <User size={14} /> Your details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Full name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-12 bg-white border-2 border-black px-4 text-sm focus:outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Age</label>
                <input
                  required
                  type="number"
                  placeholder="24"
                  className="w-full h-12 bg-white border-2 border-black px-4 text-sm focus:outline-none"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Phone number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="tel"
                  placeholder="+91 00000 00000"
                  className="w-full h-12 bg-white border-2 border-black pl-11 pr-4 text-sm focus:outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Symptoms</label>
              <textarea
                required
                placeholder="Describe how you feel..."
                className="w-full min-h-[100px] py-3 bg-white border-2 border-black px-4 text-sm focus:outline-none"
                value={formData.symptoms}
                onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 flex items-center gap-2">
              <Activity size={14} /> Payment
            </h3>

            <div className="p-4 border-2 border-black flex items-center gap-3">
              <span className="text-sm font-bold">Cash at clinic counter</span>
              <CheckCircle size={16} className="ml-auto" />
            </div>

            <div className="border-2 border-black p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-medium uppercase">Consultation fee</span>
                <span className="text-sm font-bold">₹{doctorData.fees || 699}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-500 font-medium uppercase">Platform fee</span>
                <span className="text-sm font-bold">₹25</span>
              </div>
              <div className="border-t-2 border-black pt-3 flex justify-between items-center">
                <span className="text-sm font-bold uppercase">Total</span>
                <span className="text-xl font-bold">₹{(doctorData.fees || 699) + 25}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 bg-black text-white flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>Confirm booking <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-10">
          Your information is kept private.
        </p>
      </div>

      <SuccessPulse
        isOpen={showSuccess}
        onClose={() => router.push('/patient/home')}
        message="Booking confirmed"
        subMessage="Redirecting..."
      />
    </div>
  );
}