'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot, limit, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import BookingModal from '@/components/BookingModal';
import DoctorProfileModal from '@/components/DoctorProfileModal';
import SearchModal from '@/components/SearchModal';
import ChatPortal from '@/components/ChatPortal';
import SuccessPulse from '@/components/SuccessPulse';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { calculateHealthScore, calculateWaitTime } from '@/lib/medical-logic';
import {
  Calendar, Clock, Search, Stethoscope, FileText,
  Zap, Users, User, Activity, ArrowRight, Heart, Bone,
  Brain, Eye, Baby, Syringe, ChevronRight, AlertCircle,
  TrendingUp, ShieldCheck, Sparkles, MessageCircle, Star, History
} from 'lucide-react';
import Link from 'next/link';

const SPECIALTIES = [
  { name: 'Cardiology', icon: Heart, color: '#E11D48', bg: '#FFF1F2' },
  { name: 'Orthopedic', icon: Bone, color: '#D97706', bg: '#FFFBEB' },
  { name: 'Neurology', icon: Brain, color: '#7C3AED', bg: '#F5F3FF' },
  { name: 'Pediatrics', icon: Baby, color: '#0D9488', bg: '#F0FDFA' },
  { name: 'Dental', icon: Syringe, color: '#0891B2', bg: '#ECFEFF' },
  { name: 'Dermatology', icon: Activity, color: '#EA580C', bg: '#FFF7ED' },
];

export default function PatientHome() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Bookings state
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [recentDoctors, setRecentDoctors] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ online: 12, bookings: 86 });

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedChatId, setSelectedChatId] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const healthScore = useMemo(() => calculateHealthScore(profile), [profile]);

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Fetch Profile for Health Score
    onSnapshot(doc(db, 'users', user.uid), (snap) => setProfile(snap.data()));

    // 2. Fetch Today's Specific Bookings (Live Queue)
    const todayStr = new Date().toISOString().split('T')[0];
    const qToday = query(collection(db, 'bookings'), where('userId', '==', user.uid), where('appointmentDateStr', '==', todayStr));
    const unsubToday = onSnapshot(qToday, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTodayBookings(data.sort((a: any, b: any) => a.queueNumber - b.queueNumber));
    });

    // 3. Fetch Upcoming Bookings
    const qUpcoming = query(collection(db, 'bookings'), where('userId', '==', user.uid), where('status', 'in', ['confirmed', 'pending']), limit(10));
    const unsubUpcoming = onSnapshot(qUpcoming, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUpcomingBookings(data.filter((b: any) => b.appointmentDateStr !== todayStr));
    });

    // 4. Fetch Recent Doctors for Quick-Rebook
    const qRecent = query(collection(db, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'completed'), limit(15));
    getDocs(qRecent).then(snap => {
      const docs = snap.docs.map(d => d.data());
      const uniqueDocs = Array.from(new Set(docs.map(d => d.doctorId))).map(id => docs.find(d => d.doctorId === id)).slice(0, 5);
      setRecentDoctors(uniqueDocs);
    });

    // 5. Fetch Global Social Pulse (Mocked logic using real doctor activity)
    onSnapshot(collection(db, 'doctors'), (snap) => {
      const online = snap.docs.filter(d => d.data().online !== false).length;
      setGlobalStats(prev => ({ ...prev, online: online > 0 ? online : 12 }));
    });

    setLoading(false);
    return () => { unsubToday(); unsubUpcoming(); };
  }, [user?.uid]);

  const handleBookSuccess = () => {
    setIsBookingModalOpen(false);
    setShowSuccess(true);
  };

  const openChat = (booking: any) => {
    setSelectedDoctor({ id: booking.doctorId, name: booking.doctorName, phone: booking.doctorPhone });
    setSelectedChatId(`chat_${booking.id}`);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-svh bg-slate-50 pb-28 lg:pb-8 text-slate-900">
      <Navbar />

      {/* ── STATUS BAR ── */}
      <div className="bg-white border-b border-slate-200 py-2 overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 lg:px-6 flex items-center gap-6 text-[12px] text-slate-500 overflow-x-auto scroll-hide whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {globalStats.online} doctors online now
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0 text-slate-400">
            <TrendingUp size={12} />
            86 consultations completed today
          </span>
          <span className="inline-flex items-center gap-1.5 shrink-0 text-slate-400">
            <ShieldCheck size={12} />
            High availability for emergency callbacks
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6 space-y-8">

        {/* ── GREETING & PROFILE ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[13px]">{greeting} 👋</p>
            <h1 className="text-[24px] font-semibold text-slate-900 capitalize leading-tight">
              {user?.email?.split('@')[0] || 'there'}
            </h1>
          </div>

          <Link href="/patient/profile" className="relative shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
              {profile?.profilePic || profile?.photoURL ? (
                <img
                  src={profile.profilePic || profile.photoURL}
                  alt="Your profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={24} className="text-slate-300" />
              )}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-white border border-slate-200 rounded-full px-1.5 py-[1px] text-[10px] font-semibold text-teal-700 shadow-sm">
              {healthScore}%
            </div>
          </Link>
        </div>

        {/* ── SEARCH BAR ── */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <Search size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-slate-700 text-[14px] font-medium">Describe your symptoms</p>
            <p className="text-[12px] text-slate-400 mt-0.5">Try "fever" or "headache"</p>
          </div>
          <ArrowRight size={16} className="text-slate-300" />
        </button>

        {/* ── LIVE QUEUE ALERT ── */}
        {todayBookings.filter(b => b.status === 'confirmed').slice(0, 1).map((booking) => {
          return (
            <div key={booking.id} className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0">
                  <Zap size={22} />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Live queue</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-medium">Confirmed</span>
                    </div>
                    <h3 className="text-[17px] font-semibold text-slate-900">Dr. {booking.doctorName}</h3>
                    <p className="text-[13px] text-slate-500">{booking.doctorSpecialty}</p>
                  </div>

                  <div className="rounded-lg bg-white border border-teal-100 p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400">Current status</p>
                      <p className="text-[15px] font-semibold text-teal-700">
                        {booking.queueNumber > 1 ? `${booking.queueNumber - 1} patient${booking.queueNumber - 1 > 1 ? 's' : ''} ahead` : "You're up next"}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full border border-teal-200 flex items-center justify-center text-teal-600">
                      <User size={16} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openChat(booking)}
                      className="flex-1 h-10 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle size={15} /> Message doctor
                    </button>
                    <Link
                      href="/patient/appointments"
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── QUICK REBOOK ── */}
        {recentDoctors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-0.5">
              <History size={15} className="text-slate-400" />
              <h2 className="text-[13px] font-semibold text-slate-500">Quick rebook</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scroll-hide pb-1">
              {recentDoctors.map((doc) => (
                <button
                  key={doc.doctorId}
                  onClick={() => handleBookAppointment({ id: doc.doctorId, name: doc.doctorName, specialization: doc.doctorSpecialty, fees: doc.consultationFee })}
                  className="shrink-0 w-32 rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col items-center text-center gap-2.5 hover:border-teal-300 hover:shadow-sm transition-all"
                >
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                  <p className="text-[12.5px] font-medium text-slate-800 truncate w-full">Dr. {doc.doctorName}</p>
                  <span className="text-[11px] font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">Rebook</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SPECIALTIES ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[13px] font-semibold text-slate-500">Browse by specialty</h2>
            <button onClick={() => setIsSearchModalOpen(true)} className="text-[12.5px] text-teal-600 font-medium hover:text-teal-700">
              See all
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SPECIALTIES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.name}
                  onClick={() => setIsSearchModalOpen(true)}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center gap-2.5 hover:border-teal-300 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <span className="text-[11.5px] font-medium text-slate-600">{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TODAY'S APPOINTMENTS ── */}
        {todayBookings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[13px] font-semibold text-slate-500 flex items-center gap-2">
                Today's appointments
                <span className="w-4.5 h-4.5 rounded-full bg-teal-50 text-teal-700 text-[10px] flex items-center justify-center font-semibold px-1.5 py-0.5">
                  {todayBookings.length}
                </span>
              </h2>
            </div>
            <div className="space-y-2.5">
              {todayBookings.map((booking) => (
                <div key={booking.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3.5 hover:border-slate-300 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Stethoscope size={18} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-medium text-slate-900 truncate">Dr. {booking.doctorName}</p>
                      <span className={`w-1.5 h-1.5 rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    </div>
                    <p className="text-[12px] text-slate-400">{booking.doctorSpecialty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-medium text-slate-900">{booking.appointmentTimeSlot?.split(' - ')[0] || 'Live'}</p>
                    <p className="text-[11px] text-teal-600">Confirmed</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <PatientBottomNav />

      {/* Modals & Overlays */}
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSelectDoctor={handleDoctorSelect} />
      {selectedDoctor && (
        <DoctorProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} doctor={selectedDoctor} onBook={handleBookAppointment} />
      )}
      {selectedDoctor && (
        <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} doctor={selectedDoctor} onSuccess={handleBookSuccess} />
      )}
      {isChatOpen && selectedDoctor && (
        <ChatPortal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          chatId={selectedChatId}
          recipientName={selectedDoctor.name}
          recipientRole="doctor"
          doctorName={selectedDoctor.name}
        />
      )}
      <SuccessPulse isOpen={showSuccess} onClose={() => setShowSuccess(false)} message="Booking confirmed" subMessage="Booked My Health" />

      <style>{`
        .scroll-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );

  function handleDoctorSelect(doctor: any) {
    setSelectedDoctor(doctor);
    setIsProfileModalOpen(true);
  }

  function handleBookAppointment(doctor: any) {
    setSelectedDoctor(doctor);
    setIsBookingModalOpen(true);
  }
}