'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { FileText, Calendar, Pill, X, TestTube, Stethoscope, ChevronRight, Download, AlertCircle } from 'lucide-react';

export default function Prescriptions() {
  const { user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchPrescriptions();
  }, [user?.uid]);

  const fetchPrescriptions = async () => {
    try {
      const q = query(
        collection(db, 'summaries'),
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-svh bg-[#080C10] pb-28 lg:pb-8">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Header */}
          <div className="animate-fade-in-up fill-both">
            <h1 className="text-[26px] font-bold tracking-tight text-white">Prescriptions</h1>
            <p className="text-white/30 text-sm mt-1">Your digital prescriptions from all visits</p>
          </div>

          {/* Content */}
          {loading ? (
            <ListSkeleton count={3} />
          ) : prescriptions.length === 0 ? (
            <div className="card p-10 flex flex-col items-center text-center gap-3 animate-fade-in-up fill-both">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <FileText size={24} className="text-white/20" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white/40">No prescriptions yet</p>
                <p className="text-[13px] text-white/20 mt-1">They'll appear here after doctor visits</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 animate-fade-in-up delay-100 fill-both">
              {prescriptions.map((rx, i) => (
                <button
                  key={rx.id}
                  onClick={() => { setSelectedPrescription(rx); setShowModal(true); }}
                  className="card p-4 text-left hover:border-white/[0.12] transition-all duration-200 animate-fade-in-up fill-both"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white">Dr. {rx.doctorName}</p>
                      <p className="text-[12px] text-white/35 mt-0.5">{rx.doctorSpecialty}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <Calendar size={11} />
                          {rx.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'N/A'}
                        </span>
                        {rx.medicines?.length > 0 && (
                          <span className="text-[11px] text-primary/60 flex items-center gap-1">
                            <Pill size={11} />
                            {rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {rx.diagnosis && (
                        <p className="text-[12px] text-white/25 mt-2 line-clamp-1">{rx.diagnosis}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-white/15 mt-0.5 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <PatientBottomNav />

      {/* ── PRESCRIPTION DETAIL SHEET ── */}
      {showModal && selectedPrescription && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-h-[94svh] overflow-y-auto bg-[#0E1419] rounded-t-[28px] border-t border-white/[0.08] shadow-modal animate-slide-up pb-10">
            
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
              <h2 className="text-[16px] font-bold text-white">Prescription</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Doctor info */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-white">Dr. {selectedPrescription.doctorName}</p>
                  <p className="text-[12px] text-white/40">{selectedPrescription.doctorSpecialty}</p>
                  <p className="text-[11px] text-white/25 mt-0.5">
                    {selectedPrescription.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Patient */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[11px] text-white/30 mb-1">Patient</p>
                  <p className="text-[14px] font-semibold text-white">{selectedPrescription.patientName}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[11px] text-white/30 mb-1">Age</p>
                  <p className="text-[14px] font-semibold text-white">{selectedPrescription.patientAge} yrs</p>
                </div>
              </div>

              {/* Diagnosis */}
              {selectedPrescription.diagnosis && (
                <div className="p-4 rounded-2xl border border-violet/15 bg-violet/5">
                  <p className="text-[11px] text-violet/60 uppercase tracking-wider font-semibold mb-2">Diagnosis</p>
                  <p className="text-[14px] text-white/80 leading-relaxed">{selectedPrescription.diagnosis}</p>
                </div>
              )}

              {/* Medicines */}
              {selectedPrescription.medicines?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pill size={15} className="text-primary" />
                    <p className="text-[13px] font-bold text-white/80">
                      Medicines ({selectedPrescription.medicines.length})
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {selectedPrescription.medicines.map((med: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-[14px] font-bold text-white mb-2">{med.name}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Dosage', value: med.dosage },
                            { label: 'Frequency', value: med.frequency },
                            { label: 'Duration', value: med.duration },
                            { label: 'Instructions', value: med.instructions },
                          ].filter(f => f.value).map((field) => (
                            <div key={field.label}>
                              <p className="text-[10px] text-white/25">{field.label}</p>
                              <p className="text-[12px] text-white/60">{field.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab Tests */}
              {selectedPrescription.labTests?.length > 0 && (
                <div className="p-4 rounded-2xl border border-amber/15 bg-amber/5">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube size={15} className="text-amber" />
                    <p className="text-[13px] font-bold text-amber/80">Lab Tests</p>
                  </div>
                  <ul className="space-y-1.5">
                    {selectedPrescription.labTests.map((test: string, idx: number) => (
                      <li key={idx} className="text-[13px] text-white/60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber/40 flex-shrink-0" />
                        {test}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Doctor's Advice */}
              {selectedPrescription.advice && (
                <div className="p-4 rounded-2xl border border-primary/15 bg-primary/5">
                  <p className="text-[11px] text-primary/60 uppercase tracking-wider font-semibold mb-2">Doctor's Advice</p>
                  <p className="text-[14px] text-white/70 leading-relaxed">{selectedPrescription.advice}</p>
                </div>
              )}

              {/* Prescription Image */}
              {selectedPrescription.prescriptionImage && (
                <div>
                  <p className="text-[13px] font-bold text-white/50 mb-2">Handwritten Prescription</p>
                  <img
                    src={selectedPrescription.prescriptionImage}
                    alt="Prescription"
                    className="w-full rounded-2xl border border-white/[0.06] cursor-pointer hover:opacity-80 transition"
                    onClick={() => window.open(selectedPrescription.prescriptionImage, '_blank')}
                  />
                </div>
              )}

              {/* PDF Download */}
              {selectedPrescription.prescriptionPdf && (
                <a
                  href={selectedPrescription.prescriptionPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold text-[14px] hover:bg-primary/15 transition"
                >
                  <Download size={18} />
                  Download PDF Prescription
                </a>
              )}

              {/* Follow-up */}
              {selectedPrescription.followUpDate && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet/5 border border-violet/15">
                  <AlertCircle size={16} className="text-violet flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-violet/80">Follow-up Required</p>
                    <p className="text-[12px] text-white/40 mt-0.5">
                      {selectedPrescription.followUpDate}
                      {selectedPrescription.followUpNotes && ` — ${selectedPrescription.followUpNotes}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}