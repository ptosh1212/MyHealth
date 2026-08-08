'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Calendar, Clock, ChevronRight, Search, FilterX } from 'lucide-react';
import PatientDetailsModal from '@/components/PatientDetailsModal';
import DoctorSidebar from '@/components/DoctorSidebar';
import { ListSkeleton } from '@/components/SkeletonLoader';

interface Appointment {
  id: string;
  patientName: string;
  patientAge: number;
  symptoms: string;
  appointmentDate: any;
  appointmentDateStr?: string;
  queueNumber: number;
  status: string;
  totalAmount: number;
  isCallback?: boolean;
}

const FILTERS = [
  { key: 'all', label: 'All visits' },
  { key: 'today', label: "Today's" },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past history' },
] as const;

// Flat, muted status colors — text + dot only, no tinted backgrounds
const STATUS: Record<string, { text: string; dot: string }> = {
  confirmed: { text: 'text-teal-700', dot: 'bg-teal-700' },
  pending:   { text: 'text-amber-600', dot: 'bg-amber-600' },
  completed: { text: 'text-indigo-600', dot: 'bg-indigo-600' },
  cancelled: { text: 'text-red-700', dot: 'bg-red-700' },
};

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const INPUT = 'border border-slate-300 px-3 py-2.5 text-[14px] text-slate-800 bg-white focus:outline-none focus:border-teal-700 w-full';

export default function Appointments() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchAppointments = async () => {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('doctorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setAppointments(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[]);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user?.uid]);

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = appointments.filter(apt => {
    // Search filter
    const matchesSearch = apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.symptoms?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Tab filter
    const aptDate = apt.appointmentDate?.toDate?.() || new Date(apt.appointmentDate?.seconds * 1000);
    const aptDateStr = apt.appointmentDateStr || aptDate.toISOString().split('T')[0];

    if (filter === 'today') return aptDateStr === todayStr;
    if (filter === 'upcoming') return aptDateStr > todayStr;
    if (filter === 'past') return aptDateStr < todayStr;
    return true;
  });

  return (
    <div className="doctor-page min-h-svh bg-white">
      <DoctorSidebar />

      <div className="px-4 py-8 max-w-4xl mx-auto lg:px-8 space-y-6">

        {/* Header */}
        <div className="pb-5 border-b border-slate-200">
          <h1 className="text-[22px] font-semibold text-slate-900">All appointments</h1>
          <p className="text-[13px] text-slate-400 mt-1">Manage and view patient visit history</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Search by name or symptoms"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${INPUT} pl-10`}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scroll-hide pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-shrink-0 px-4 py-2 text-[13px] font-semibold transition-colors border ${
                  filter === f.key
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2.5">
          {loading ? (
            <ListSkeleton count={4} />
          ) : filtered.length === 0 ? (
            <div className={`${CARD} p-12 flex flex-col items-center text-center gap-3`}>
              {searchTerm ? <FilterX size={26} className="text-slate-200" /> : <Calendar size={26} className="text-slate-200" />}
              <div>
                <p className="text-[15px] font-semibold text-slate-500">No appointments found</p>
                <p className="text-[13px] text-slate-400 mt-1">
                  {searchTerm ? 'Try adjusting your search terms' : "When patients book, they'll appear here."}
                </p>
              </div>
            </div>
          ) : (
            filtered.map((apt) => {
              const st = STATUS[apt.status] || STATUS.pending;
              return (
                <button
                  key={apt.id}
                  onClick={() => { setSelectedAppointment(apt); setShowDetails(true); }}
                  className={`w-full ${CARD} p-4 text-left hover:border-slate-400 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[14px] font-semibold text-slate-700">
                          #{apt.queueNumber || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-semibold text-slate-900 truncate">{apt.patientName}</p>
                          <span className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {apt.status}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-400 mt-1 line-clamp-1">
                          {apt.symptoms}
                        </p>
                        <div className="flex items-center gap-4 mt-2.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar size={12} />
                            {apt.appointmentDateStr || 'TBD'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock size={12} />
                            Token #{apt.queueNumber}
                          </div>
                          {apt.totalAmount > 0 && (
                            <div className="text-[11px] font-semibold text-slate-500">
                              ₹{apt.totalAmount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200 flex-shrink-0 mt-1" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      {showDetails && selectedAppointment && (
        <PatientDetailsModal
          booking={selectedAppointment}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}