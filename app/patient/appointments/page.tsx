'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { notifyAppointmentCancelled } from '@/lib/whatsapp';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import RatingModal from '@/components/RatingModal';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { 
  Calendar, Clock, Stethoscope, Zap, FileText, Star, 
  XCircle, ChevronRight, X, AlertTriangle, CheckCircle, 
  Clock3, Users, ArrowRight, MessageCircle
} from 'lucide-react';
import ChatPortal from '@/components/ChatPortal';
import { getOrCreateChat } from '@/lib/chat';
import Link from 'next/link';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;
type FilterType = typeof FILTERS[number]['key'];

const STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary', label: 'Confirmed' },
  pending:   { bg: 'bg-amber/10', text: 'text-amber', dot: 'bg-amber', label: 'Pending' },
  completed: { bg: 'bg-violet/10', text: 'text-violet', dot: 'bg-violet', label: 'Completed' },
  cancelled: { bg: 'bg-rose/10', text: 'text-rose', dot: 'bg-rose', label: 'Cancelled' },
};

export default function Appointments() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [appointmentToRate, setAppointmentToRate] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user) fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'upcoming') return apt.status === 'confirmed' || apt.status === 'pending';
    if (filter === 'completed') return apt.status === 'completed';
    if (filter === 'cancelled') return apt.status === 'cancelled';
    return true;
  });

  const canCancelAppointment = (appointment: any) => {
    if (!appointment.createdAt) return false;
    const createdTime = appointment.createdAt.toDate ? appointment.createdAt.toDate() : new Date(appointment.createdAt);
    const diffMinutes = (Date.now() - createdTime.getTime()) / 60000;
    return diffMinutes <= 10 && (appointment.status === 'pending' || appointment.status === 'confirmed');
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'bookings', appointmentId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
      });
      
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', appointmentId));
        const bookingData = bookingSnap.data();
        const patientSnap = await getDoc(doc(db, 'users', user?.uid || ''));
        const patientPhone = patientSnap.data()?.phone || '';
        const patientName = patientSnap.data()?.name || bookingData?.patientName || 'Patient';
        if (patientPhone) {
          await notifyAppointmentCancelled(patientPhone, patientName, bookingData?.doctorName || 'Doctor', bookingData?.appointmentDateStr || '');
        }
      } catch (waErr) { console.error('WhatsApp cancel notify failed:', waErr); }

      await fetchAppointments();
      setShowDetails(false);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    } finally {
      setCancelling(false);
    }
  };

  // NEW: opens (or creates) the chat doc before showing the ChatPortal.
  // Previously the "Message Doctor" button opened ChatPortal directly with
  // a guessed chatId (`chat_${appointment.id}`) and never called
  // getOrCreateChat(). If the doctor hadn't opened that chat first, the
  // parent chats/{chatId} doc (and its `participants` array) never existed,
  // so the doctor's chat list could never find it — messages looked "lost".
  const handleOpenChat = async (appointment: any) => {
    // TEMP DEBUG — remove once chat creation is confirmed working
    console.log('[handleOpenChat] appointment:', appointment);

    if (!user?.uid) return;
    if (!appointment.doctorId) {
      console.error('Cannot open chat: appointment is missing doctorId', appointment);
      alert('Unable to start chat — doctor information missing on this booking.');
      return;
    }

    // TEMP DEBUG — remove once chat creation is confirmed working
    console.log('[handleOpenChat] calling getOrCreateChat with doctorId:', appointment.doctorId, 'userId:', user.uid);

    setChatLoading(true);
    try {
      const chatId = await getOrCreateChat(
        appointment.id,                          // bookingId
        appointment.doctorId,                    // doctorId
        user.uid,                                // userId (patient)
        appointment.doctorName || 'Doctor',
        appointment.patientName || user.displayName || 'Patient'
      );
      setSelectedChatId(chatId);
      setIsChatOpen(true);
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Failed to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const stats = {
    total: appointments.length,
    upcoming: appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  return (
    <>
      <div className="min-h-svh bg-[#080C10] pb-28 lg:pb-8">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Header */}
          <div className="animate-fade-in-up fill-both">
            <h1 className="text-[26px] font-bold tracking-tight text-white">Appointments</h1>
            <p className="text-white/30 text-sm mt-1">Your complete visit history</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 animate-fade-in-up delay-50 fill-both">
            {[
              { label: 'Total', value: stats.total, color: 'text-white/70' },
              { label: 'Upcoming', value: stats.upcoming, color: 'text-primary' },
              { label: 'Completed', value: stats.completed, color: 'text-violet' },
            ].map((s) => (
              <div key={s.label} className="card p-3 text-center">
                <p className={`text-[22px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 animate-fade-in-up delay-100 fill-both">
            {FILTERS.map((f) => {
              const count = f.key === 'all' ? appointments.length
                : f.key === 'upcoming' ? stats.upcoming
                : f.key === 'completed' ? stats.completed
                : appointments.filter(a => a.status === 'cancelled').length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    filter === f.key
                      ? 'bg-primary text-[#080C10]'
                      : 'bg-white/[0.05] text-white/40 hover:text-white/70 hover:bg-white/[0.08]'
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      filter === f.key ? 'bg-black/20' : 'bg-white/10'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="animate-fade-in-up delay-150 fill-both">
            {loading ? (
              <ListSkeleton count={3} />
            ) : filteredAppointments.length === 0 ? (
              <div className="card p-10 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <Calendar size={24} className="text-white/20" />
                </div>
                <p className="text-[15px] font-semibold text-white/40">No {filter === 'all' ? '' : filter} appointments</p>
                <Link href="/patient/home" className="btn-primary text-[13px] py-2 px-5 mt-1">
                  Book Now <ArrowRight size={13} />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAppointments.map((apt, i) => {
                  const st = STATUS[apt.status] || STATUS.pending;
                  const canRate = apt.status === 'completed' && !apt.rating;
                  return (
                    <button
                      key={apt.id}
                      onClick={() => { setSelectedAppointment(apt); setShowDetails(true); }}
                      className="w-full card p-4 text-left hover:border-white/[0.12] transition-all duration-200 animate-fade-in-up fill-both"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          apt.isCallback ? 'bg-amber/10' : 'bg-primary/10'
                        }`}>
                          <Stethoscope size={18} className={apt.isCallback ? 'text-amber' : 'text-primary'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-white truncate flex items-center gap-1.5">
                                Dr. {apt.doctorName}
                                {apt.isInstantBooking && <Zap size={11} className="text-primary flex-shrink-0" />}
                                {apt.isCallback && (
                                  <span className="text-[10px] text-amber/70 font-normal">(callback)</span>
                                )}
                              </p>
                              <p className="text-[12px] text-white/35 mt-0.5">{apt.doctorSpecialty}</p>
                            </div>
                            <span className={`badge ${st.bg} ${st.text} flex-shrink-0 flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                            <span className="text-[11px] text-white/30 flex items-center gap-1">
                              <Calendar size={11} /> {apt.appointmentDateStr || 'TBD'}
                            </span>
                            {apt.queueNumber && (
                              <span className="text-[11px] text-white/30 flex items-center gap-1">
                                <Clock3 size={11} /> Token #{apt.queueNumber}
                              </span>
                            )}
                            {apt.totalAmount && (
                              <span className="text-[11px] text-primary/70 font-semibold">
                                ₹{apt.totalAmount}
                              </span>
                            )}
                          </div>

                          {canRate && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAppointmentToRate(apt); setIsRatingModalOpen(true); }}
                              className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber/10 text-amber text-[12px] font-semibold hover:bg-amber/20 transition-colors"
                            >
                              <Star size={12} className="fill-amber" />
                              Rate this visit
                            </button>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-white/15 mt-1 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PatientBottomNav />

      {/* ── DETAILS SHEET ── */}
      {showDetails && selectedAppointment && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetails(false)} />
          <div className="relative w-full max-h-[92svh] overflow-y-auto bg-[#0E1419] rounded-t-[28px] border-t border-white/[0.08] shadow-modal animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
              <h2 className="text-[16px] font-bold text-white">Appointment Details</h2>
              <button onClick={() => setShowDetails(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4 pb-10">
              {/* Doctor card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-[16px] font-bold text-white">Dr. {selectedAppointment.doctorName}</p>
                  <p className="text-[13px] text-white/40">{selectedAppointment.doctorSpecialty}</p>
                  <div className="mt-1">
                    {(() => {
                      const st = STATUS[selectedAppointment.status] || STATUS.pending;
                      return (
                        <span className={`badge ${st.bg} ${st.text} flex items-center gap-1.5 inline-flex`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Date', value: selectedAppointment.appointmentDateStr || 'TBD', icon: Calendar },
                  { label: 'Queue Token', value: `#${selectedAppointment.queueNumber || 'N/A'}`, icon: Clock3 },
                  { label: 'Patient', value: selectedAppointment.patientName, icon: Users },
                  { label: 'Amount', value: selectedAppointment.totalAmount ? `₹${selectedAppointment.totalAmount}` : 'Free', icon: FileText },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={13} className="text-white/25" />
                        <p className="text-[11px] text-white/30">{item.label}</p>
                      </div>
                      <p className="text-[14px] font-semibold text-white">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Symptoms */}
              {selectedAppointment.symptoms && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[11px] text-white/30 mb-1.5">Chief Complaint</p>
                  <p className="text-[14px] text-white/70">{selectedAppointment.symptoms}</p>
                </div>
              )}

              {/* Payment */}
              {selectedAppointment.paymentMethod && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
                  <p className="text-[13px] text-white/50">Payment</p>
                  <span className={`badge ${
                    selectedAppointment.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'
                  }`}>
                    {selectedAppointment.paymentStatus || 'Pending'} · {selectedAppointment.paymentMethod}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2.5 pt-1">
                {selectedAppointment.status === 'completed' && !selectedAppointment.rating && (
                  <button
                    onClick={() => { setShowDetails(false); setAppointmentToRate(selectedAppointment); setIsRatingModalOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber/10 text-amber font-semibold text-[14px] hover:bg-amber/20 transition border border-amber/20"
                  >
                    <Star size={16} className="fill-amber" />
                    Rate This Visit
                  </button>
                )}

                {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'pending' || selectedAppointment.status === 'completed') && (
                  <button
                    onClick={() => handleOpenChat(selectedAppointment)}
                    disabled={chatLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 text-primary font-bold text-[14px] hover:bg-primary/20 transition border border-primary/20 disabled:opacity-50"
                  >
                    <MessageCircle size={16} />
                    {chatLoading ? 'Opening chat...' : 'Message Doctor'}
                  </button>
                )}

                {canCancelAppointment(selectedAppointment) && (
                  <button
                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                    disabled={cancelling}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose/10 text-rose font-semibold text-[14px] hover:bg-rose/20 transition border border-rose/20 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
                  </button>
                )}

                {/* Cancel window hint */}
                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && !canCancelAppointment(selectedAppointment) && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <AlertTriangle size={14} className="text-amber flex-shrink-0" />
                    <p className="text-[12px] text-white/30">Cancellations only allowed within 10 minutes of booking</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isRatingModalOpen && appointmentToRate && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          appointment={appointmentToRate}
          onSuccess={fetchAppointments}
        />
      )}

      {selectedAppointment && selectedChatId && (
        <ChatPortal 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          chatId={selectedChatId}
          recipientName={selectedAppointment.doctorName}
          recipientRole="doctor"
        />
      )}
    </>
  );
}