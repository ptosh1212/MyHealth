'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp, orderBy, getDoc } from 'firebase/firestore';
import { notifyAppointmentConfirmed, notifyAppointmentCancelled, notifyVisitComplete } from '@/lib/whatsapp';
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  CheckCircle, XCircle, FileText, Zap, ZapOff, Phone, Clock,
  ChevronRight, Calendar, Activity, Stethoscope, MessageSquare, IndianRupee,
} from 'lucide-react';
import { StatCardSkeleton, ListSkeleton } from '@/components/SkeletonLoader';
import ChatPortal from '@/components/ChatPortal';
import { getOrCreateChat } from '@/lib/chat';
import PrescriptionModal from '@/components/PrescriptionModal';
import CallbackModal from '@/components/CallbackModal';
import PatientDetailsModal from '@/components/PatientDetailsModal';
import DoctorSidebar from '@/components/DoctorSidebar';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const serif = Source_Serif_4({ subsets: ['latin'], weight: ['500', '600', '700'] });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'] });

// ---- palette (matches signup / login) --------------------------------------
const paper = '#FAF8F3';
const ink = '#14322E';
const inkMuted = '#5C6B63';
const sage = '#3F6F5E';
const sageTint = '#EDF2EE';
const line = '#E1DBCB';
const stamp = '#A5342C';
const stampTint = '#FBEDEB';

interface Booking {
  id: string;
  patientName: string;
  patientAge: number;
  symptoms: string;
  appointmentDate: any;
  appointmentDateStr?: string;
  queueNumber: number;
  status: string;
  totalAmount: number;
  consultationFee: number;
  isInstantBooking?: boolean;
  isCallback?: boolean;
  doctorName?: string;
  userId?: string;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
] as const;
type TabType = (typeof TABS)[number]['key'];

const STATUS_LABEL: Record<string, { color: string; tint: string }> = {
  pending: { color: '#8A6D1D', tint: '#F7F0DC' },
  confirmed: { color: sage, tint: sageTint },
  completed: { color: ink, tint: '#EDECE6' },
  cancelled: { color: stamp, tint: stampTint },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_LABEL[status] || STATUS_LABEL.pending;
  return (
    <span
      className={`${mono.className} inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-medium`}
      style={{ color: s.color, backgroundColor: s.tint }}
    >
      {status}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'outline',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'danger' | 'ghost';
  className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    solid: { backgroundColor: ink, color: paper, borderColor: ink },
    outline: { backgroundColor: 'transparent', color: sage, borderColor: sage },
    danger: { backgroundColor: 'transparent', color: stamp, borderColor: stamp },
    ghost: { backgroundColor: 'transparent', color: inkMuted, borderColor: line },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${mono.className} flex items-center justify-center gap-1.5 border rounded-sm px-3.5 py-2 text-[12px] uppercase tracking-[0.08em] font-medium transition-opacity disabled:opacity-40 ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoLimit, setAutoLimit] = useState(50);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [doctorData, setDoctorData] = useState<any>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (!user?.uid) return;

    const fetchDoctorData = async () => {
      const docSnap = await getDoc(doc(db, 'doctors', user.uid));
      if (docSnap.exists()) {
        setDoctorData({ uid: user.uid, ...docSnap.data() });
        setAutoApprove(docSnap.data()?.autoApprove || false);
        setAutoLimit(docSnap.data()?.autoLimit || 50);
      }
    };
    fetchDoctorData();

    const q = query(collection(db, 'bookings'), where('doctorId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Booking[];
      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Auto-approve
  useEffect(() => {
    if (!autoApprove || !user?.uid) return;
    const autoApproveBookings = async () => {
      const today = new Date().toISOString().split('T')[0];
      const confirmedToday = bookings.filter(
        (b) => b.status === 'confirmed' && b.appointmentDate?.toDate?.()?.toISOString().split('T')[0] === today
      ).length;
      const pendingBookings = bookings.filter((b) => b.status === 'pending');
      for (const booking of pendingBookings) {
        const bookingDate = booking.appointmentDate?.toDate?.()?.toISOString().split('T')[0];
        if (bookingDate === today && confirmedToday < autoLimit) {
          await updateDoc(doc(db, 'bookings', booking.id), {
            status: 'confirmed',
            confirmedByDoctor: true,
            autoApproved: true,
            confirmedAt: Timestamp.now(),
          });
        }
      }
    };
    autoApproveBookings();
  }, [autoApprove, autoLimit, bookings, user?.uid]);

  const handleAccept = async (bookingId: string) => {
    setAccepting(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'confirmed',
        confirmedByDoctor: true,
        confirmedAt: Timestamp.now(),
      });
      showToast('Appointment confirmed!', 'success');
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        const bookingData = bookingSnap.data();
        if (bookingData?.userId) {
          const patientSnap = await getDoc(doc(db, 'users', bookingData.userId));
          const patientPhone = patientSnap.data()?.phone || '';
          const patientName = patientSnap.data()?.name || bookingData.patientName || 'Patient';
          if (patientPhone) {
            await notifyAppointmentConfirmed(
              patientPhone,
              patientName,
              doctorData?.name || 'Doctor',
              bookingData.appointmentDateStr || '',
              bookingData.appointmentTimeSlot || ''
            );
          }
        }
      } catch (waErr) {
        console.error('WhatsApp confirm notify failed:', waErr);
      }
    } catch (error) {
      showToast('Failed to confirm appointment', 'error');
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    setRejecting(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        cancelledBy: 'doctor',
        cancelledAt: Timestamp.now(),
      });
      showToast('Appointment rejected', 'warning');
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        const bookingData = bookingSnap.data();
        if (bookingData?.userId) {
          const patientSnap = await getDoc(doc(db, 'users', bookingData.userId));
          const patientPhone = patientSnap.data()?.phone || '';
          const patientName = patientSnap.data()?.name || bookingData.patientName || 'Patient';
          if (patientPhone) {
            await notifyAppointmentCancelled(patientPhone, patientName, doctorData?.name || 'Doctor', bookingData.appointmentDateStr || '');
          }
        }
      } catch (waErr) {
        console.error('WhatsApp cancel notify failed:', waErr);
      }
    } catch (error) {
      showToast('Failed to reject appointment', 'error');
    } finally {
      setRejecting(null);
    }
  };

  const handleComplete = async (bookingId: string) => {
    setCompleting(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: 'completed', completedAt: Timestamp.now() });
      showToast('Visit marked complete!', 'success');
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        const bookingData = bookingSnap.data();
        if (bookingData?.userId) {
          const patientSnap = await getDoc(doc(db, 'users', bookingData.userId));
          const patientPhone = patientSnap.data()?.phone || '';
          const patientName = patientSnap.data()?.name || bookingData.patientName || 'Patient';
          if (patientPhone) {
            await notifyVisitComplete(patientPhone, patientName, doctorData?.name || 'Doctor');
          }
        }
      } catch (waErr) {
        console.error('WhatsApp complete notify failed:', waErr);
      }
    } catch (error) {
      showToast('Failed to complete appointment', 'error');
    } finally {
      setCompleting(null);
    }
  };
  
  const handleOpenChat = async (booking: Booking) => {
    if (!user?.uid) return;

    let patientPhone = '';
    try {
      const patientSnap = await getDoc(doc(db, 'users', booking.userId || ''));
      patientPhone = patientSnap.data()?.phone || '';
    } catch (e) {
      console.error('Error fetching patient phone:', e);
    }

    const chatId = await getOrCreateChat(booking.id, user.uid, booking.userId || '', doctorData?.name || 'Doctor', booking.patientName || 'Patient');

    setSelectedBooking({ ...booking, patientPhone } as any);
    setSelectedChatId(chatId);
    setShowChat(true);
  };

  const toggleAutoApprove = async () => {
    const newVal = !autoApprove;
    setAutoApprove(newVal);
    if (user?.uid) {
      await updateDoc(doc(db, 'doctors', user.uid), { autoApprove: newVal });
    }
    showToast(newVal ? 'Auto-confirm enabled' : 'Auto-confirm disabled', newVal ? 'success' : 'info');
  };

  const pending = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const completed = bookings.filter((b) => b.status === 'completed');
  const todayEarnings = completed.reduce((sum, b) => sum + (b.consultationFee || 0), 0);
  const filtered = bookings.filter((b) => activeTab === 'all' || b.status === activeTab);
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(
    (b) => b.appointmentDateStr === today || b.appointmentDate?.toDate?.()?.toISOString().split('T')[0] === today
  );

  if (loading) {
    return (
      <div className="min-h-svh" style={{ backgroundColor: paper }}>
        <DoctorSidebar />
        <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <ListSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`min-h-svh ${sans.className}`} style={{ backgroundColor: paper, color: ink }}>
        <DoctorSidebar />

        <div className="px-4 py-6 max-w-4xl mx-auto lg:px-8 space-y-6">
          {/* ── HEADER ── */}
          <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b" style={{ borderColor: line }}>
            <div>
              <h1 className={`${serif.className} text-[24px] font-semibold tracking-tight`}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr.{' '}
                {doctorData?.name?.split(' ')[0] || 'Kumar'}
              </h1>
              <p className={`${mono.className} text-[12px] uppercase tracking-[0.08em] mt-1`} style={{ color: inkMuted }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })} · {todayBookings.length} patient
                {todayBookings.length !== 1 ? 's' : ''} today
              </p>
            </div>

            <button
              onClick={toggleAutoApprove}
              className={`${mono.className} flex items-center gap-2 px-4 py-2.5 rounded-sm border text-[12px] uppercase tracking-[0.08em] font-medium transition-colors`}
              style={
                autoApprove
                  ? { backgroundColor: sageTint, borderColor: sage, color: sage }
                  : { backgroundColor: 'transparent', borderColor: line, color: inkMuted }
              }
            >
              {autoApprove ? <Zap size={14} /> : <ZapOff size={14} />}
              Auto-confirm {autoApprove ? 'on' : 'off'}
            </button>
          </div>

          {/* ── STATS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Today's patients", value: todayBookings.length, icon: Calendar },
              { label: 'Pending', value: pending.length, icon: Clock },
              { label: 'Confirmed', value: confirmed.length, icon: CheckCircle },
              { label: 'Earnings today', value: `₹${todayEarnings.toLocaleString('en-IN')}`, icon: IndianRupee },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white border rounded-sm p-4" style={{ borderColor: line }}>
                  <Icon size={16} style={{ color: inkMuted }} className="mb-3" />
                  <p className="text-[22px] font-semibold tabular-nums">{stat.value}</p>
                  <p className={`${mono.className} text-[10px] uppercase tracking-[0.08em] mt-1`} style={{ color: inkMuted }}>
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── LIVE QUEUE INDICATOR ── */}
          {pending.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 border rounded-sm" style={{ backgroundColor: sageTint, borderColor: sage }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sage }} />
              <span className="text-[13px] font-medium" style={{ color: sage }}>
                {pending.length} patient{pending.length !== 1 ? 's' : ''} waiting
              </span>
              <span className="text-[12px]" style={{ color: inkMuted }}>
                Review and confirm their appointments
              </span>
            </div>
          )}

          {/* ── TAB FILTER ── */}
          <div className="flex gap-6 border-b" style={{ borderColor: line }}>
            {TABS.map((tab) => {
              const count =
                tab.key === 'all' ? bookings.length : tab.key === 'pending' ? pending.length : tab.key === 'confirmed' ? confirmed.length : completed.length;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`${mono.className} pb-3 text-[12px] uppercase tracking-[0.08em] font-medium border-b-2 -mb-px transition-colors`}
                  style={{
                    borderColor: isActive ? ink : 'transparent',
                    color: isActive ? ink : inkMuted,
                  }}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          {/* ── BOOKING LIST ── */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white border rounded-sm p-10 flex flex-col items-center text-center gap-3" style={{ borderColor: line }}>
                <Activity size={22} style={{ color: inkMuted }} />
                <p className="text-[14px]" style={{ color: inkMuted }}>
                  No {activeTab === 'all' ? '' : activeTab} appointments
                </p>
              </div>
            ) : (
              filtered.map((booking: any) => {
                const isAccepting = accepting === booking.id;
                const isRejecting = rejecting === booking.id;
                const isCompleting = completing === booking.id;

                return (
                  <div key={booking.id} className="bg-white border rounded-sm p-4" style={{ borderColor: line }}>
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className={`${mono.className} w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 text-[12px] font-medium`}
                          style={{ borderColor: line, color: inkMuted }}
                        >
                          #{booking.queueNumber || '?'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[14px] font-semibold">{booking.patientName}</p>
                            <span className="text-[12px]" style={{ color: inkMuted }}>
                              · {booking.patientAge} yrs
                            </span>
                            {booking.isInstantBooking && (
                              <span
                                className={`${mono.className} text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-full flex items-center gap-0.5`}
                                style={{ backgroundColor: sageTint, color: sage }}
                              >
                                <Zap size={9} /> Instant
                              </span>
                            )}
                            {booking.isCallback && (
                              <span
                                className={`${mono.className} text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-full flex items-center gap-0.5`}
                                style={{ backgroundColor: '#F7F0DC', color: '#8A6D1D' }}
                              >
                                <Phone size={9} /> Callback
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: inkMuted }}>
                            {booking.symptoms}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] flex items-center gap-1" style={{ color: inkMuted }}>
                              <Calendar size={11} /> {booking.appointmentDateStr || 'Today'}
                            </span>
                            {booking.totalAmount > 0 && (
                              <span className={`${mono.className} text-[11px] font-medium`} style={{ color: sage }}>
                                ₹{booking.totalAmount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusPill status={booking.status} />
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowPatientDetails(true);
                          }}
                          className="text-[11px] flex items-center gap-0.5 transition-colors"
                          style={{ color: inkMuted }}
                        >
                          Details <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {booking.status === 'pending' && (
                        <>
                          <ActionButton onClick={() => handleAccept(booking.id)} disabled={!!accepting || !!rejecting} variant="outline" className="flex-1">
                            <CheckCircle size={13} />
                            {isAccepting ? 'Confirming…' : 'Confirm'}
                          </ActionButton>
                          <ActionButton onClick={() => handleReject(booking.id)} disabled={!!accepting || !!rejecting} variant="danger" className="flex-1">
                            <XCircle size={13} />
                            {isRejecting ? 'Rejecting…' : 'Reject'}
                          </ActionButton>
                        </>
                      )}

                      {booking.status === 'confirmed' && (
                        <>
                          <ActionButton onClick={() => handleComplete(booking.id)} disabled={!!completing} variant="outline">
                            <CheckCircle size={13} />
                            {isCompleting ? 'Completing…' : 'Complete'}
                          </ActionButton>
                          <ActionButton
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowPrescriptionModal(true);
                            }}
                            variant="ghost"
                          >
                            <FileText size={13} />
                            Prescription
                          </ActionButton>
                          <ActionButton onClick={() => handleOpenChat(booking)} variant="ghost">
                            <MessageSquare size={13} />
                          </ActionButton>
                          <ActionButton
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowCallbackModal(true);
                            }}
                            variant="ghost"
                          >
                            <Phone size={13} />
                          </ActionButton>
                        </>
                      )}

                      {booking.status === 'completed' && (
                        <>
                          <ActionButton
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowPrescriptionModal(true);
                            }}
                            variant="ghost"
                          >
                            <FileText size={13} />
                            View / edit Rx
                          </ActionButton>
                          <ActionButton onClick={() => handleOpenChat(booking)} variant="ghost">
                            <MessageSquare size={13} />
                          </ActionButton>
                        </>
                      )}

                      <ActionButton
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowPatientDetails(true);
                        }}
                        variant="ghost"
                      >
                        <Stethoscope size={13} />
                        <span className="hidden sm:inline">Patient</span>
                      </ActionButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── TOAST CONTAINER ── */}
      <div className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 lg:bottom-6">
        {toasts.map((t: any) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* ── MODALS ── */}
      {showPrescriptionModal && selectedBooking && (
        <PrescriptionModal booking={selectedBooking} doctorData={doctorData} onClose={() => setShowPrescriptionModal(false)} onSaved={() => setShowPrescriptionModal(false)} />
      )}

      {showCallbackModal && selectedBooking && (
        <CallbackModal booking={selectedBooking} doctorData={doctorData} onClose={() => setShowCallbackModal(false)} onSaved={() => setShowCallbackModal(false)} />
      )}

      {showPatientDetails && selectedBooking && <PatientDetailsModal booking={selectedBooking} onClose={() => setShowPatientDetails(false)} />}

      {showChat && selectedBooking && (
        <ChatPortal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          chatId={selectedChatId}
          recipientName={selectedBooking.patientName}
          recipientRole="patient"
          recipientPhone={(selectedBooking as any).patientPhone}
          doctorName={doctorData?.name}
        />
      )}
    </>
  );
}