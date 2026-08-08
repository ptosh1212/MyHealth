'use client';

import { useEffect, useState } from 'react';
import { 
  collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, getDocs, Timestamp,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { 
  Users, Stethoscope, ShieldCheck, Trash2, 
  Eye, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Search, Filter, MoreVertical,
  ExternalLink, FileText, User
} from 'lucide-react';
import { ListSkeleton } from '@/components/SkeletonLoader';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface Doctor {
  uid: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  documents?: {
    medicalDegree: string;
    registrationCertificate: string;
    aadharCard: string;
    profilePhoto?: string;
  };
  createdAt: any;
}

interface Patient {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const { user, userRole } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'doctors' | 'patients'>('doctors');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (userRole !== 'admin') return;

    // Listen to Doctors
    const unsubscribeDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as Doctor[];
      setDoctors(data);
    });

    // Listen to Patients/Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as Patient[];
      setPatients(data);
      setLoading(false);
    });

    return () => {
      unsubscribeDoctors();
      unsubscribeUsers();
    };
  }, [userRole]);

  const handleVerifyDoctor = async (doctorUid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'doctors', doctorUid), {
        verificationStatus: status,
        verified: status === 'approved'
      });
      
      // Also update in users collection for consistency
      await updateDoc(doc(db, 'users', doctorUid), {
        verificationStatus: status
      });

      showToast(`Doctor ${status} successfully`, 'success');
      if (showKYCModal) setShowKYCModal(false);
    } catch (error) {
      showToast('Failed to update verification status', 'error');
    }
  };

  const handleDeleteUser = async (uid: string, type: 'doctor' | 'patient') => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;

    try {
      if (type === 'doctor') {
        await deleteDoc(doc(db, 'doctors', uid));
      }
      await deleteDoc(doc(db, 'users', uid));
      showToast(`${type} deleted successfully`, 'success');
    } catch (error) {
      showToast(`Failed to delete ${type}`, 'error');
    }
  };

  const filteredDoctors = doctors.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm)
  );

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const stats = {
    totalDoctors: doctors.length,
    pendingKYC: doctors.filter(d => d.verificationStatus === 'pending').length,
    totalPatients: patients.filter(p => p.role === 'patient').length,
    verifiedDoctors: doctors.filter(d => d.verificationStatus === 'approved').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C10] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (  
    <div className="min-h-screen bg-[#080C10] text-white p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ── HEADER ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              <ShieldCheck className="text-primary" size={32} />
              My Health <span className="text-primary">Control</span>
            </h1>
            <p className="text-white/30 text-sm font-medium mt-1 uppercase tracking-widest">
              Central Intelligence & Clinical Governance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text"
                placeholder="Search users, doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Doctors', value: stats.totalDoctors, icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Pending KYC', value: stats.pendingKYC, icon: AlertCircle, color: 'text-amber', bg: 'bg-amber/10' },
            { label: 'Total Patients', value: stats.totalPatients, icon: User, color: 'text-violet', bg: 'bg-violet/10' },
            { label: 'Verification Rate', value: `${stats.totalDoctors ? Math.round((stats.verifiedDoctors/stats.totalDoctors)*100) : 0}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          ].map((s, i) => (
            <div key={i} className="bg-[#0E1419] border border-white/5 p-6 rounded-[32px] relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} blur-[60px] opacity-50 group-hover:opacity-80 transition-opacity`} />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-4`}>
                  <s.icon className={s.color} size={24} />
                </div>
                <p className="text-3xl font-black tabular-nums">{s.value}</p>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-4 border-b border-white/5 pb-px">
          <button 
            onClick={() => setActiveTab('doctors')}
            className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'doctors' ? 'text-primary' : 'text-white/30 hover:text-white/50'}`}
          >
            Doctor Registry
            {activeTab === 'doctors' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_10px_#00E5A0]" />}
          </button>
          <button 
            onClick={() => setActiveTab('patients')}
            className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'patients' ? 'text-violet' : 'text-white/30 hover:text-white/50'}`}
          >
            Global Users
            {activeTab === 'patients' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet rounded-full shadow-[0_0_10px_#7C6FFF]" />}
          </button>
        </div>

        {/* ── CONTENT TABLE ── */}
        <div className="bg-[#0E1419] border border-white/5 rounded-[32px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Identity</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Status / Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {activeTab === 'doctors' ? (
                filteredDoctors.map((doc) => (
                  <tr key={doc.uid} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                          {doc.name?.[0] || 'D'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">Dr. {doc.name}</p>
                          <p className="text-[10px] text-white/30 font-bold uppercase">{doc.specialization || 'Clinical Expert'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-white/60">{doc.email}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{doc.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        doc.verificationStatus === 'approved' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' :
                        doc.verificationStatus === 'rejected' ? 'bg-rose-400/10 text-rose-400 border border-rose-400/20' :
                        'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                      }`}>
                        {doc.verificationStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setSelectedDoctor(doc); setShowKYCModal(true); }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all shadow-sm"
                          title="Verify KYC"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(doc.uid, 'doctor')}
                          className="p-2 rounded-lg bg-rose/5 hover:bg-rose/10 text-rose/60 hover:text-rose transition-all shadow-sm"
                          title="Delete Doctor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredPatients.map((pat) => (
                  <tr key={pat.uid} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center text-violet font-black uppercase">
                          {pat.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{pat.name}</p>
                          <p className="text-[10px] text-white/30 font-bold uppercase">UID: {pat.uid.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-white/60">{pat.email}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{pat.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        pat.role === 'doctor' ? 'bg-amber-400/10 text-amber-400' : 'bg-violet/10 text-violet'
                      }`}>
                        {pat.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDeleteUser(pat.uid, 'patient')}
                        className="p-2 rounded-lg bg-rose/5 hover:bg-rose/10 text-rose/60 hover:text-rose transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {(activeTab === 'doctors' ? filteredDoctors : filteredPatients).length === 0 && (
            <div className="py-20 text-center">
              <Users size={48} className="mx-auto text-white/5 mb-4" />
              <p className="text-white/20 font-black uppercase tracking-widest italic">No matching records found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── KYC VERIFICATION MODAL ── */}
      {showKYCModal && selectedDoctor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowKYCModal(false)} />
          <div className="relative w-full max-w-4xl bg-[#0E1419] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-full animate-scale-in">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <FileText className="text-primary" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic uppercase italic">KYC Verification</h2>
                  <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Reviewing Dr. {selectedDoctor.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowKYCModal(false)}
                className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <XCircle size={24} className="text-white/40" />
              </button>
            </div>

            {/* Modal Content - Documents Grid */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Degree */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <CheckCircle size={14} className="text-primary" /> Medical Degree Certificate
                  </h3>
                  <div className="aspect-[4/3] rounded-3xl bg-black border border-white/10 overflow-hidden group relative">
                    {selectedDoctor.documents?.medicalDegree ? (
                      <img src={selectedDoctor.documents.medicalDegree} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                        <AlertCircle size={40} className="mb-2" />
                        <span className="text-[10px] font-black uppercase">Not Provided</span>
                      </div>
                    )}
                    <a href={selectedDoctor.documents?.medicalDegree} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="px-4 py-2 bg-white text-black font-black uppercase text-xs rounded-full flex items-center gap-2">
                        View Full Size <ExternalLink size={14} />
                      </div>
                    </a>
                  </div>
                </div>

                {/* Registration */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <CheckCircle size={14} className="text-primary" /> Registration Certificate
                  </h3>
                  <div className="aspect-[4/3] rounded-3xl bg-black border border-white/10 overflow-hidden group relative">
                    {selectedDoctor.documents?.registrationCertificate ? (
                      <img src={selectedDoctor.documents.registrationCertificate} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                        <AlertCircle size={40} className="mb-2" />
                        <span className="text-[10px] font-black uppercase">Not Provided</span>
                      </div>
                    )}
                    <a href={selectedDoctor.documents?.registrationCertificate} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="px-4 py-2 bg-white text-black font-black uppercase text-xs rounded-full flex items-center gap-2">
                        View Full Size <ExternalLink size={14} />
                      </div>
                    </a>
                  </div>
                </div>

                {/* Aadhar */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <CheckCircle size={14} className="text-primary" /> Aadhar Identity Card
                  </h3>
                  <div className="aspect-[4/3] rounded-3xl bg-black border border-white/10 overflow-hidden group relative">
                    {selectedDoctor.documents?.aadharCard ? (
                      <img src={selectedDoctor.documents.aadharCard} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                        <AlertCircle size={40} className="mb-2" />
                        <span className="text-[10px] font-black uppercase">Not Provided</span>
                      </div>
                    )}
                    <a href={selectedDoctor.documents?.aadharCard} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="px-4 py-2 bg-white text-black font-black uppercase text-xs rounded-full flex items-center gap-2">
                        View Full Size <ExternalLink size={14} />
                      </div>
                    </a>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <CheckCircle size={14} className="text-primary" /> Profile Photo
                  </h3>
                  <div className="aspect-[4/3] rounded-3xl bg-black border border-white/10 overflow-hidden group relative">
                    {selectedDoctor.documents?.profilePhoto ? (
                      <img src={selectedDoctor.documents.profilePhoto} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                        <AlertCircle size={40} className="mb-2" />
                        <span className="text-[10px] font-black uppercase">Not Provided</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
              <div className="hidden lg:block">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Decision Protocol</p>
                 <p className="text-xs font-bold text-white/40 italic">Approve only after matching details with registry.</p>
              </div>
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <button 
                  onClick={() => handleVerifyDoctor(selectedDoctor.uid, 'rejected')}
                  className="flex-1 lg:flex-none px-8 py-4 rounded-full border border-rose/30 text-rose font-black uppercase tracking-widest text-xs hover:bg-rose/10 transition-all"
                >
                  Reject Verification
                </button>
                <button 
                  onClick={() => handleVerifyDoctor(selectedDoctor.uid, 'approved')}
                  className="flex-1 lg:flex-none px-12 py-4 rounded-full bg-primary text-[#080C10] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_30px_#00E5A0] transition-all"
                >
                  Approve Clinical ID
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TOAST CONTAINER ── */}
      <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((t: any) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        @keyframes scale-in { 
          from { opacity: 0; transform: scale(0.95); } 
          to { opacity: 1; transform: scale(1); } 
        }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}