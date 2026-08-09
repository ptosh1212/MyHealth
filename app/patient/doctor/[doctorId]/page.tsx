'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import { 
  MapPin, Star, Award, DollarSign, Clock, Calendar, 
  Stethoscope, Phone, Mail, CheckCircle, Users, AlertCircle
} from 'lucide-react';

export default function DoctorProfile() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const doctorId = params.doctorId as string;

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [liveQueue, setLiveQueue] = useState(0);
  const [isAvailableToday, setIsAvailableToday] = useState(false);
  const [todayDay, setTodayDay] = useState('');

  // Booking form
  const [symptoms, setSymptoms] = useState('');
  const [existingConditions, setExistingConditions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_counter');

  useEffect(() => {
    fetchDoctorData();
    checkAvailability();
  }, [doctorId]);

  const checkAvailability = () => {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    setTodayDay(dayName);
  };

  const isDoctorAvailable = (doctor: any) => {
    if (!doctor) return false;
    
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if doctor has workingDays array
    if (doctor.workingDays && Array.isArray(doctor.workingDays)) {
      return doctor.workingDays.includes(dayName);
    }
    
    // Check individual day flags
    const dayMap: any = {
      'Monday': doctor.monday,
      'Tuesday': doctor.tuesday,
      'Wednesday': doctor.wednesday,
      'Thursday': doctor.thursday,
      'Friday': doctor.friday,
      'Saturday': doctor.saturday,
      'Sunday': doctor.sunday,
    };
    
    return dayMap[dayName] === true;
  };

  useEffect(() => {
    fetchDoctorData();
  }, [doctorId]);

  const fetchDoctorData = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'doctors', doctorId));
      if (docSnap.exists()) {
        const doctorData = { id: doctorId, ...docSnap.data() };
        setDoctor(doctorData);
        
        // Check if doctor is available today
        const available = isDoctorAvailable(doctorData);
        setIsAvailableToday(available);
        
        // Fetch today's queue
        const today = new Date().toISOString().split('T')[0];
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('doctorId', '==', doctorId),
          where('appointmentDateStr', '==', today)
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const queueCount = bookingsSnap.docs.filter(
          doc => doc.data().status === 'confirmed' || doc.data().status === 'pending'
        ).length;
        setLiveQueue(queueCount);
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if doctor is available today
    if (!isAvailableToday) {
      alert(`Dr. ${doctor.name} is not available on ${todayDay}. Please check working days and try another day.`);
      return;
    }

    if (!symptoms.trim()) {
      alert('Please describe your symptoms');
      return;
    }

    setBooking(true);
    try {
      const today = new Date();
      const consultationFee = doctor.fees || doctor.consultationFee || 699;
      const extraCharge = 25;
      const totalAmount = consultationFee + extraCharge;

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      await addDoc(collection(db, 'bookings'), {
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialization || doctor.specialty || 'General',
        userId: user.uid,
        userName: userData?.name || user.email,
        userPhone: userData?.phone || '',
        patientName: userData?.name || user.email?.split('@')[0],
        patientAge: userData?.age || 25,
        symptoms: symptoms.trim(),
        existingConditions: existingConditions.trim(),
        appointmentDate: Timestamp.fromDate(today),
        appointmentDateStr: today.toISOString().split('T')[0],
        appointmentDay: today.toLocaleDateString('en-US', { weekday: 'long' }),
        queueNumber: liveQueue + 1,
        paymentMethod: paymentMethod,
        consultationFee: consultationFee,
        extraCharge: extraCharge,
        totalAmount: totalAmount,
        paymentStatus: 'pending',
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      alert('Appointment booked successfully!');
      router.push('/patient/appointments');
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={64} />
          <h2 className="text-2xl font-bold mb-2">Doctor Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-20 lg:pb-0">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Doctor Profile Card */}
          <div className="glass rounded-2xl p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              {doctor.profilePic ? (
                <img 
                  src={doctor.profilePic} 
                  alt={doctor.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                />
              ) : (
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center border-4 border-primary">
                  <span className="text-4xl font-bold text-primary">
                    {doctor.name?.charAt(0) || 'D'}
                  </span>
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold mb-2">Dr. {doctor.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm font-medium flex items-center gap-1">
                    <Stethoscope size={14} />
                    {doctor.specialization || doctor.specialty || 'General Physician'}
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium flex items-center gap-1">
                    <CheckCircle size={14} />
                    Verified
                  </span>
                </div>
                  {doctor.about && (
                    <div className="mt-2 text-center md:text-left">
                      <p className="text-slate-600 text-sm line-clamp-3">{doctor.about}</p>
                    </div>
                  )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="text-primary" size={20} />
                  <span className="text-sm text-slate-500">Experience</span>
                </div>
                <p className="text-xl font-bold">{doctor.experience || 5}+ Years</p>
              </div>

              <div className="p-4 bg-white rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-primary" size={20} />
                  <span className="text-sm text-slate-500">Consultation Fee</span>
                </div>
                <p className="text-xl font-bold text-primary">₹{doctor.fees || doctor.consultationFee || 699}</p>
              </div>

              <div className="p-4 bg-white rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-primary" size={20} />
                  <span className="text-sm text-slate-500">Live Queue</span>
                </div>
                <p className="text-xl font-bold text-yellow-400">{liveQueue} Patients</p>
              </div>
            </div>

            {/* Availability Status */}
            <div className={`p-4 rounded-xl border-2 mb-6 ${
              isAvailableToday 
                ? 'bg-green-500/10 border-green-500/50' 
                : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center gap-3">
                <Clock className={isAvailableToday ? 'text-green-400' : 'text-red-400'} size={24} />
                <div className="flex-1">
                  <p className={`font-bold ${isAvailableToday ? 'text-green-400' : 'text-red-400'}`}>
                    {isAvailableToday ? `✓ Available Today (${todayDay})` : `✗ Not Available Today (${todayDay})`}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {isAvailableToday 
                      ? 'You can book an appointment for today' 
                      : 'Doctor is not available on this day. Check working days below.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Working Days */}
            {(doctor.workingDays || doctor.monday !== undefined) && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Working Days</h3>
                <div className="grid grid-cols-7 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const isWorking = doctor.workingDays 
                      ? doctor.workingDays.includes(day)
                      : doctor[day.toLowerCase()] === true;
                    const isToday = day === todayDay;
                    
                    return (
                      <div 
                        key={day}
                        className={`p-3 rounded-xl text-center text-sm ${
                          isWorking 
                            ? isToday 
                              ? 'bg-primary text-white font-bold' 
                              : 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        <p className="font-medium">{day.slice(0, 3)}</p>
                        <p className="text-xs mt-1">{isWorking ? '✓' : '✗'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timings */}
            {(doctor.startTime || doctor.endTime) && (
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl mb-6">
                <Clock className="text-primary" size={20} />
                <div>
                  <p className="font-semibold">Consultation Hours</p>
                  <p className="text-sm text-slate-500">
                    {doctor.startTime || '9:00 AM'} - {doctor.endTime || '5:00 PM'}
                  </p>
                </div>
              </div>
            )}



            {doctor.degree && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Qualifications</h3>
                <p className="text-slate-600 text-sm">{doctor.degree}</p>
                {doctor.university && (
                  <p className="text-slate-500 text-xs mt-1">{doctor.university}</p>
                )}
              </div>
            )}

            {doctor.clinicAddress && (
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
                <MapPin className="text-primary flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="font-semibold mb-1">{doctor.clinicName || 'Clinic'}</p>
                  <p className="text-sm text-slate-500">{doctor.clinicAddress}</p>
                </div>
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6">Book Appointment</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symptoms / Reason for Visit *</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition min-h-[100px]"
                  placeholder="Describe your symptoms..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Existing Conditions (Optional)</label>
                <textarea
                  value={existingConditions}
                  onChange={(e) => setExistingConditions(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition min-h-[80px]"
                  placeholder="Any allergies, chronic conditions, current medications..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Payment Method</label>
                <div className="space-y-3">
                  {[
                    { key: 'cash_on_counter', label: 'Pay at Counter', icon: '💵' },
                    { key: 'upi', label: 'UPI Payment', icon: '📱' },
                    { key: 'card', label: 'Card Payment', icon: '💳' },
                  ].map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setPaymentMethod(method.key)}
                      className={`w-full p-4 rounded-xl border-2 transition text-left ${
                        paymentMethod === method.key
                          ? 'border-primary bg-primary/20'
                          : 'border-slate-200 bg-white hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{method.icon}</span>
                        <span className="font-medium">{method.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="p-4 bg-white rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Consultation Fee</span>
                  <span className="font-semibold">₹{doctor.fees || doctor.consultationFee || 699}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Platform Fee</span>
                  <span className="font-semibold">₹25</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold">Total Amount</span>
                    <span className="font-bold text-primary text-xl">
                      ₹{(doctor.fees || doctor.consultationFee || 699) + 25}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={booking || !isAvailableToday}
                className="w-full bg-primary text-white px-6 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {booking ? 'Booking...' : !isAvailableToday ? `Not Available on ${todayDay}` : 'Confirm Booking'}
              </button>
              
              {!isAvailableToday && (
                <p className="text-center text-sm text-red-400 mt-2">
                  Doctor is not available today. Please check working days above.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <PatientBottomNav />
    </>
  );
}