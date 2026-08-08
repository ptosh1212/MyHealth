'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  Phone, Plus, Calendar, User, Clock, FileText, Search, Loader2,
  RefreshCw, ClipboardList, Pill, Stethoscope, AlertTriangle, MessageSquare
} from 'lucide-react';
import CallbackModal from '@/components/CallbackModal';
import CreateCallbackModal from '@/components/CreateCallbackModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface Callback {
  id: string;
  patientName: string;
  patientAge: number;
  userId: string;
  userPhone?: string;
  callbackReason: string;
  callbackReasonType: string;
  callbackNote?: string;
  appointmentDate: any;
  appointmentDateStr: string;
  status: string;
  consultationFee: number;
  totalAmount: number;
  isCallback: boolean;
  callbackFromBookingId?: string;
  createdAt: any;
}

interface CompletedBooking {
  id: string;
  patientName: string;
  patientAge: number;
  userId: string;
  userPhone?: string;
  symptoms: string;
  status: string;
}

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider';
const INPUT = 'border border-slate-300 px-3 py-2.5 text-[14px] text-slate-800 bg-white focus:outline-none focus:border-teal-700 w-full';
const BTN_PRIMARY = 'bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors disabled:opacity-50';

// Flat, muted status colors — text + dot only, no tinted backgrounds
const STATUS: Record<string, { text: string; dot: string }> = {
  confirmed: { text: 'text-teal-700', dot: 'bg-teal-700' },
  pending:   { text: 'text-amber-600', dot: 'bg-amber-600' },
  completed: { text: 'text-indigo-600', dot: 'bg-indigo-600' },
  cancelled: { text: 'text-red-700', dot: 'bg-red-700' },
};

const REASON_ICONS: Record<string, any> = {
  follow_up_previous: RefreshCw,
  report_review: ClipboardList,
  medicine_adjustment: Pill,
  post_procedure: Stethoscope,
  urgent_concern: AlertTriangle,
  other: MessageSquare,
};

export default function Callbacks() {
  const { user } = useAuthStore();
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      try {
        // Fetch doctor data
        const { getDoc, doc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'doctors', user.uid));
        if (docSnap.exists()) {
          setDoctorData({ uid: user.uid, ...docSnap.data() });
        }

        // Fetch all callbacks
        const callbacksQuery = query(
          collection(db, 'bookings'),
          where('doctorId', '==', user.uid),
          where('isCallback', '==', true),
          orderBy('createdAt', 'desc')
        );
        const callbacksSnap = await getDocs(callbacksQuery);
        const callbacksData = callbacksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Callback[];
        setCallbacks(callbacksData);

        // Fetch completed bookings (for creating new callbacks)
        const completedQuery = query(
          collection(db, 'bookings'),
          where('doctorId', '==', user.uid),
          where('status', '==', 'completed')
        );
        const completedSnap = await getDocs(completedQuery);
        const completedData = completedSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CompletedBooking[];
        setCompletedBookings(completedData);
      } catch (error) {
        console.error('Error fetching callbacks:', error);
        showToast('Failed to load callbacks', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const filteredCallbacks = callbacks.filter(callback => {
    const matchesFilter = filter === 'all' || callback.status === filter;
    const matchesSearch = callback.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusStyle = (status: string) => STATUS[status] || { text: 'text-slate-400', dot: 'bg-slate-400' };

  const getReasonIcon = (reasonType: string) => REASON_ICONS[reasonType] || Phone;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 size={24} className="text-slate-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 mb-8 border-b border-slate-200">
        <div>
          <h1 className="text-[24px] font-semibold text-slate-900 flex items-center gap-3">
            <Phone className="text-slate-500" size={24} />
            Callback management
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">{callbacks.length} total callbacks scheduled</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`${BTN_PRIMARY} px-5 py-2.5 text-[14px] flex items-center gap-2`}
        >
          <Plus size={16} />
          Schedule callback
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className={`${CARD} p-4 md:p-5`}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-slate-400" size={16} />
            <span className="text-[20px] font-semibold text-slate-900">{callbacks.filter(c => c.status === 'pending').length}</span>
          </div>
          <p className={LABEL}>Pending</p>
        </div>

        <div className={`${CARD} p-4 md:p-5`}>
          <div className="flex items-center justify-between mb-2">
            <Calendar className="text-slate-400" size={16} />
            <span className="text-[20px] font-semibold text-slate-900">{callbacks.filter(c => c.status === 'confirmed').length}</span>
          </div>
          <p className={LABEL}>Confirmed</p>
        </div>

        <div className={`${CARD} p-4 md:p-5`}>
          <div className="flex items-center justify-between mb-2">
            <FileText className="text-slate-400" size={16} />
            <span className="text-[20px] font-semibold text-slate-900">{callbacks.filter(c => c.status === 'completed').length}</span>
          </div>
          <p className={LABEL}>Completed</p>
        </div>

        <div className={`${CARD} p-4 md:p-5`}>
          <div className="flex items-center justify-between mb-2">
            <User className="text-slate-400" size={16} />
            <span className="text-[20px] font-semibold text-slate-900">{completedBookings.length}</span>
          </div>
          <p className={LABEL}>Available patients</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className={`${CARD} p-4 md:p-5 mb-6`}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name"
              className={`${INPUT} pl-10`}
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 text-[13px] font-semibold border transition-colors whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Callbacks List */}
      {filteredCallbacks.length === 0 ? (
        <div className={`${CARD} p-12 text-center`}>
          <Phone className="mx-auto mb-4 text-slate-200" size={40} />
          <p className="text-slate-400 text-[15px]">
            {searchTerm ? 'No callbacks found matching your search' : 'No callbacks scheduled yet'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`${BTN_PRIMARY} mt-5 px-5 py-2.5 text-[14px]`}
          >
            Schedule your first callback
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCallbacks.map((callback) => {
            const st = getStatusStyle(callback.status);
            const ReasonIcon = getReasonIcon(callback.callbackReasonType);
            return (
              <div key={callback.id} className={`${CARD} p-4 md:p-5`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Patient Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 md:w-12 md:h-12 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-[16px] font-semibold text-slate-700">
                        {callback.patientName?.charAt(0) || 'P'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-slate-900">{callback.patientName}</h3>
                        <ReasonIcon size={14} className="text-slate-400" />
                      </div>
                      <p className="text-[12px] text-slate-400 mb-2">
                        {callback.patientAge} years · {callback.userPhone || 'No phone'}
                      </p>

                      {/* Callback Reason */}
                      <div className="flex items-start gap-2 mb-2">
                        <Phone size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[13px] font-medium text-slate-700">{callback.callbackReason}</p>
                          {callback.callbackNote && (
                            <p className="text-[12px] text-slate-400 mt-0.5">{callback.callbackNote}</p>
                          )}
                        </div>
                      </div>

                      {/* Appointment Date */}
                      <div className="flex items-center gap-2 text-[12px] text-slate-400">
                        <Calendar size={13} />
                        <span>{callback.appointmentDateStr || 'Date not set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Amount */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {callback.status}
                    </span>

                    <div className="text-right">
                      <p className={LABEL}>Consultation fee</p>
                      <p className="text-[17px] font-semibold text-slate-900">
                        {callback.consultationFee === 0 ? 'Free' : `₹${callback.consultationFee}`}
                      </p>
                    </div>

                    {callback.callbackFromBookingId && (
                      <p className="text-[11px] text-slate-400">
                        Follow-up from previous visit
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Callback Modal */}
      {showCreateModal && (
        <CreateCallbackModal
          completedBookings={completedBookings}
          doctorData={doctorData}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            showToast('Callback scheduled', 'success');
            // Refresh callbacks list
            window.location.reload();
          }}
        />
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}