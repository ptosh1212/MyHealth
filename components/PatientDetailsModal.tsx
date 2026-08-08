'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, User, Phone, Mail, MapPin, FileText, AlertCircle, ChevronRight, History, ClipboardList } from 'lucide-react';

interface PatientDetailsModalProps {
  booking: any;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  confirmed: { color: 'text-teal-700', bg: 'bg-teal-50', dot: 'bg-teal-500' },
  pending: { color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  cancelled: { color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  completed: { color: 'text-violet-700', bg: 'bg-violet-50', dot: 'bg-violet-500' },
  default: { color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-300' },
};

export default function PatientDetailsModal({ booking, onClose }: PatientDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        if (booking.userId) {
          const userDoc = await getDoc(doc(db, 'users', booking.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.address && typeof userData.address === 'object') {
              userData.addressFormatted = `${userData.address.street || ''}, ${userData.address.city || ''}, ${userData.address.state || ''} ${userData.address.pincode || ''}`.trim();
            }
            setPatientData(userData);
          }
        }

        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('userId', '==', booking.userId),
          orderBy('createdAt', 'desc')
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        setAllBookings(bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const prescriptionsQuery = query(
          collection(db, 'summaries'),
          where('userId', '==', booking.userId),
          orderBy('createdAt', 'desc')
        );
        const prescriptionsSnap = await getDocs(prescriptionsQuery);
        setPrescriptions(prescriptionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching patient details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientDetails();
  }, [booking.userId]);

  const getStatus = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.default;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative w-10 h-10 border-4 border-teal-500 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full sm:max-w-4xl max-h-[92svh] bg-white rounded-t-md sm:rounded-md border-t border-gray-200 sm:border sm:border-gray-200 shadow-sm flex flex-col animate-slide-up">

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900">Clinical profile</h2>
            <p className="text-[12px] text-gray-400 font-medium">Patient case study</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-12">

          {/* 1. Identity Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-md p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center mb-4 overflow-hidden">
                  {patientData?.profilePic ? (
                    <img src={patientData.profilePic} alt="Patient" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-gray-300" />
                  )}
                </div>
                <h3 className="text-[20px] font-semibold text-gray-900">{booking.patientName}</h3>
                <p className="text-[13px] text-gray-500 mb-5">{booking.patientAge} Years · {patientData?.gender || 'N/A'}</p>

                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 p-2.5 rounded-sm bg-gray-50 border border-gray-200">
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Blood group</p>
                    <p className="text-[14px] font-semibold text-teal-700">{patientData?.bloodGroup || 'O+'}</p>
                  </div>
                  <div className="flex-1 p-2.5 rounded-sm bg-gray-50 border border-gray-200">
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Visits</p>
                    <p className="text-[14px] font-semibold text-violet-700">{allBookings.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
               {[
                 { icon: Phone, label: 'Emergency contact', value: patientData?.phone || booking.userPhone || 'N/A', active: true },
                 { icon: Mail, label: 'Email address', value: patientData?.email || 'N/A', active: false },
                 { icon: MapPin, label: 'Residential location', value: patientData?.addressFormatted || patientData?.address || 'N/A', full: true },
               ].map((item, i) => (
                 <div key={i} className={`bg-white border border-gray-200 rounded-md p-4 flex items-start gap-3 ${item.full ? 'sm:col-span-2' : ''}`}>
                   <div className="w-9 h-9 rounded-sm bg-gray-50 flex items-center justify-center text-teal-600 border border-gray-200">
                     <item.icon size={16} />
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="text-[11px] font-medium text-gray-400 mb-1">{item.label}</p>
                     <p className="text-[13px] font-medium text-gray-700 line-clamp-2 leading-tight">{item.value}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* 2. Current Visit Reason */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-1">
               <AlertCircle size={17} className="text-amber-600" />
               <h3 className="text-[14px] font-semibold text-gray-700">Clinical observations</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-md p-5 border-l-4 border-l-red-300">
                  <h4 className="text-[11px] font-semibold text-red-400 mb-2">Chief complaints</h4>
                  <p className="text-[14px] text-gray-700 leading-relaxed">{booking.symptoms}</p>
                </div>
                {booking.existingConditions && (
                  <div className="bg-white border border-gray-200 rounded-md p-5 border-l-4 border-l-amber-300">
                    <h4 className="text-[11px] font-semibold text-amber-500 mb-2">Relevant medical history</h4>
                    <p className="text-[14px] text-gray-700 leading-relaxed">{booking.existingConditions}</p>
                  </div>
                )}
             </div>
          </div>

          {/* 3. Stats & Timeline Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">

            {/* Visit Timeline */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                    <History size={17} className="text-violet-600" />
                    <h3 className="text-[14px] font-semibold text-gray-700">Visit timeline</h3>
                 </div>
                 <span className="text-[11px] font-medium text-gray-400">{allBookings.length} total</span>
               </div>

               <div className="space-y-3">
                 {allBookings.slice(0, 5).map((visit) => {
                   const st = getStatus(visit.status);
                   return (
                     <div key={visit.id} className="bg-white border border-gray-200 rounded-md p-4 flex items-center justify-between hover:border-gray-300 transition-all">
                       <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                         <div>
                            <p className="text-[13px] font-semibold text-gray-900">{visit.appointmentDateStr || 'Recent Visit'}</p>
                            <p className="text-[11px] text-gray-400 truncate max-w-[150px]">{visit.symptoms?.slice(0, 40)}...</p>
                         </div>
                       </div>
                       <span className={`px-2 py-1 rounded-sm ${st.bg} ${st.color} text-[10px] font-medium`}>{visit.status}</span>
                     </div>
                   );
                 })}
                 {allBookings.length > 5 && (
                   <button className="w-full py-2 text-[12px] font-medium text-gray-400 hover:text-teal-700 transition-colors">
                     View all visits
                   </button>
                 )}
               </div>
            </div>

            {/* Prescription History */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                    <ClipboardList size={17} className="text-teal-600" />
                    <h3 className="text-[14px] font-semibold text-gray-700">Medical records</h3>
                 </div>
                 <span className="text-[11px] font-medium text-gray-400">{prescriptions.length} docs</span>
               </div>

               <div className="space-y-3">
                  {prescriptions.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-200 rounded-md p-8 flex flex-col items-center justify-center text-center text-gray-300">
                       <FileText size={22} className="mb-2" />
                       <p className="text-[12px] font-medium text-gray-400">No records found</p>
                    </div>
                  ) : (
                    prescriptions.slice(0, 3).map((pres) => (
                      <div key={pres.id} className="bg-white border border-gray-200 rounded-md p-4 flex flex-col gap-3 hover:border-teal-300 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[12px] font-semibold text-gray-600 mb-0.5">Dr. {pres.doctorName}</p>
                            <p className="text-[11px] text-gray-400">{pres.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                          </div>
                          <div className="w-8 h-8 rounded-sm bg-gray-50 flex items-center justify-center text-gray-300">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                        {pres.diagnosis && (
                          <div className="p-2 rounded-sm bg-gray-50 border border-gray-100">
                             <p className="text-[12px] text-gray-600">{pres.diagnosis}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-white">
           <button
             onClick={onClose}
             className="w-full h-[50px] rounded-sm bg-teal-600 hover:bg-teal-700 text-white text-[14px] font-semibold transition-colors"
           >
             Close records
           </button>
        </div>
      </div>
    </div>
  );
}