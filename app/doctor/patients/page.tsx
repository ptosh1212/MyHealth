'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Search, User, Phone, ChevronRight, Activity, FilterX, Users } from 'lucide-react';
import PatientDetailsModal from '@/components/PatientDetailsModal';
import DoctorSidebar from '@/components/DoctorSidebar';

interface Patient {
  id: string;
  patientName: string;
  patientAge: number;
  userPhone?: string;
  symptoms: string;
  appointmentDate: any;
  status: string;
  userId?: string;
}

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const INPUT = 'border border-slate-300 px-3 py-2.5 text-[14px] text-slate-800 bg-white focus:outline-none focus:border-teal-700 w-full';

export default function Patients() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchPatients = async () => {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('doctorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Patient[];

        // Group by patient name or userId to get unique patient entries
        const uniquePatients = data.reduce((acc, curr) => {
          const identifier = curr.userId || curr.patientName;
          const existing = acc.find(p => (p.userId === curr.userId && curr.userId) || p.patientName === curr.patientName);
          if (!existing) acc.push(curr);
          return acc;
        }, [] as Patient[]);

        setPatients(uniquePatients);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user?.uid]);

  const filteredPatients = patients.filter(p =>
    p.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.userPhone?.includes(searchTerm)
  );

  return (
    <div className="doctor-page min-h-svh bg-white">
      <DoctorSidebar />

      <div className="px-4 py-8 max-w-5xl mx-auto lg:px-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-[22px] font-semibold text-slate-900">Patient database</h1>
            <p className="text-[13px] text-slate-400 mt-1">Manage unique patient records and history</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 border border-slate-200">
            <Users size={15} className="text-slate-500" />
            <span className="text-[14px] font-semibold text-slate-900">{patients.length}</span>
            <span className="text-[12px] text-slate-400">Patients</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name or phone number"
            className={`${INPUT} pl-10`}
          />
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[...Array(6)].map((_, i) => (
                  <div key={i} className={`${CARD} h-48 animate-pulse bg-slate-50`} />
               ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className={`${CARD} p-16 flex flex-col items-center text-center gap-3`}>
              {searchTerm ? <FilterX size={28} className="text-slate-200" /> : <User size={28} className="text-slate-200" />}
              <div>
                <p className="text-[16px] font-semibold text-slate-500">No patients found</p>
                <p className="text-[13px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {searchTerm ? `No results for "${searchTerm}". Try a different name or number.` : "Once you have consultations, patient records will appear here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => { setSelectedPatient(patient); setShowDetails(true); }}
                  className={`${CARD} p-5 group hover:border-slate-400 transition-colors text-left`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 border border-slate-200 flex items-center justify-center">
                      <span className="text-[18px] font-semibold text-slate-700">
                        {patient.patientName?.charAt(0) || 'P'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-500 transition-colors mt-1" />
                  </div>

                  <h3 className="text-[16px] font-semibold text-slate-900 mb-1 truncate">{patient.patientName}</h3>
                  <div className="flex items-center gap-2 mb-4">
                     <span className="text-[12px] text-slate-400">Age {patient.patientAge} yrs</span>
                     <span className="w-1 h-1 rounded-full bg-slate-300" />
                     <span className="text-[11px] text-teal-700 font-semibold uppercase tracking-wider">Regular patient</span>
                  </div>

                  <div className="space-y-2 p-3 border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2.5 text-[12px] text-slate-500">
                      <Phone size={13} className="text-slate-300" />
                      <span>{patient.userPhone || 'Not provided'}</span>
                    </div>

                    <div className="flex items-start gap-2.5 text-[12px] text-slate-500">
                      <Activity size={13} className="text-slate-300 mt-0.5" />
                      <span className="line-clamp-1">{patient.symptoms}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-[11px] font-semibold text-teal-700">
                    View complete history <ChevronRight size={11} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      {showDetails && selectedPatient && (
        <PatientDetailsModal
          booking={selectedPatient}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}