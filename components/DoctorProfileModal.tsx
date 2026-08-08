'use client';

import { useState, useEffect } from 'react';
import { X, Star, Users, Calendar, MapPin, Clock, Share2, ShieldCheck, CheckCircle, ChevronRight, MessageSquare, Briefcase, GraduationCap } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DoctorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: any;
  onBook: (doctor: any) => void;
}

export default function DoctorProfileModal({ isOpen, onClose, doctor, onBook }: DoctorProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');
  const [fullDoctor, setFullDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && doctor) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'doctors', doctor.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setFullDoctor({ id: docSnap.id, ...docSnap.data() });
          else setFullDoctor(doctor);

          const q = query(collection(db, 'ratings'), where('doctorId', '==', doctor.id), orderBy('createdAt', 'desc'), limit(20));
          const snapshot = await getDocs(q);
          setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error('Error fetching doctor details:', error); }
        finally { setLoading(false); }
      };
      fetchData();
    }
  }, [isOpen, doctor]);

  if (!isOpen || !doctor) return null;

  const d = fullDoctor || doctor;
  const fee = d.fees || d.consultationFee || 699;
  const spec = d.specialization || d.specialty || d.category || 'General';
  const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length : d.rating || 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-3xl max-h-[92svh] bg-white rounded-t-2xl sm:rounded-2xl border-t border-gray-200 sm:border sm:border-gray-200 shadow-sm flex flex-col animate-slide-up">

        {/* Header Button Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 z-20 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold">
               <ShieldCheck size={12} className="mr-1" /> Verified
             </div>
             <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium text-gray-400">
               <Users size={12} /> {d.totalPatients || '500'}+ patients
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all"><Share2 size={16} /></button>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all"><X size={18} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* 1. Hero Summary */}
          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-3xl bg-gray-100 border-4 border-white overflow-hidden">
                {d.profilePic || d.photoURL ? (
                  <img src={d.profilePic || d.photoURL} alt={d.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-gray-300">
                    {d.name ? d.name[0] : 'D'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-white border-4 border-white shadow-sm">
                 <CheckCircle size={18} />
              </div>
            </div>

            <h2 className="text-[24px] font-semibold text-gray-900 leading-tight">Dr. {d.name}</h2>
            <p className="text-[14px] font-medium text-teal-700 mt-1">{spec}</p>

            <div className="flex items-center gap-3 mt-4">
               <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                 <Star size={14} className="fill-amber-400 text-amber-400" />
                 <span className="text-[14px] font-semibold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '4.8'}</span>
                 <span className="text-[11px] font-medium text-gray-400">Rating</span>
               </div>
               <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                 <Briefcase size={14} className="text-gray-500" />
                 <span className="text-[14px] font-semibold text-gray-900">{d.experience || '10'}+</span>
                 <span className="text-[11px] font-medium text-gray-400">Years</span>
               </div>
            </div>
          </div>

          {/* 2. Tabs Navigation */}
          <div className="px-6 flex items-center gap-8 border-b border-gray-200 sticky top-[65px] bg-white z-10">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-3 text-[13px] font-semibold transition-all relative ${
                activeTab === 'info' ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Professional bio
              {activeTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-[13px] font-semibold transition-all relative ${
                activeTab === 'reviews' ? 'text-teal-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Patient reviews {reviews.length > 0 && `(${reviews.length})`}
              {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-full" />}
            </button>
          </div>

          {/* 3. Tab Content */}
          <div className="p-6 md:p-8 space-y-8 pb-32">
            {activeTab === 'info' ? (
              <div className="space-y-8">
                {/* About Section */}
                <div className="space-y-3">
                   <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={16} className="text-gray-400" />
                      <h4 className="text-[12px] font-semibold text-gray-500">About</h4>
                   </div>
                   <p className="text-[14px] text-gray-600 leading-relaxed">
                     {d.about || d.bio || `Dr. ${d.name} is a highly committed ${spec} specializing in providing personalized patient care with advanced medical methodology.`}
                   </p>
                </div>

                {/* Location & Practice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                     <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-teal-600 border border-gray-200">
                        <MapPin size={20} />
                     </div>
                     <div>
                        <p className="text-[11px] font-medium text-gray-400 mb-1">Primary practice</p>
                        <p className="text-[14px] font-semibold text-gray-900">{d.clinicName || 'City Multispeciality Hospital'}</p>
                        <p className="text-[12px] text-gray-500 mt-1">{d.clinicAddress || d.address || 'MyHealth Health Center, Sector 4'}</p>
                     </div>
                   </div>

                   <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                     <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-200">
                        <GraduationCap size={20} />
                     </div>
                     <div>
                        <p className="text-[11px] font-medium text-gray-400 mb-1">Qualifications</p>
                        <p className="text-[14px] font-semibold text-gray-900">{d.degree || 'MBBS, MD - General Medicine'}</p>
                        <p className="text-[12px] text-gray-500 mt-1">{d.university || d.college || 'AIIMS'}</p>
                     </div>
                   </div>
                </div>

                {/* Availability Grid */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-teal-600" />
                        <h4 className="text-[12px] font-semibold text-gray-700">Consultation hours</h4>
                      </div>
                      <p className="text-[12px] font-medium text-teal-700">{d.timings || '9:00 AM - 6:00 PM'}</p>
                   </div>
                   <div className="grid grid-cols-7 gap-1.5">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                        const isOff = (d.availableDays || d.workingDays || []).length > 0 &&
                                      !(d.availableDays || d.workingDays || []).some((ad: string) => ad.toLowerCase().startsWith(day.toLowerCase()));
                        return (
                          <div key={day} className={`flex flex-col items-center py-2.5 rounded-lg border ${
                            isOff ? 'bg-gray-50 border-gray-100 text-gray-300' : 'bg-teal-50 border-teal-200 text-teal-700'
                          }`}>
                            <span className="text-[10px] font-semibold mb-0.5">{day}</span>
                            <div className={`w-1 h-1 rounded-full ${isOff ? 'bg-gray-300' : 'bg-teal-500'}`} />
                          </div>
                        );
                      })}
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center text-center gap-4 text-gray-300">
                     <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                        <Star size={32} />
                     </div>
                     <p className="text-[14px] font-medium text-gray-500">No verified reviews found for this professional yet.</p>
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-gray-500 uppercase">
                               {r.userName?.[0] || 'P'}
                             </div>
                             <div>
                               <p className="text-[14px] font-semibold text-gray-900">{r.userName || 'Verified Patient'}</p>
                               <p className="text-[11px] text-gray-400">{new Date(r.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
                             <Star size={12} className="fill-amber-400 text-amber-400" />
                             <span className="text-[12px] font-semibold text-amber-700">{r.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                       </div>
                       <p className="text-[13px] text-gray-600 leading-relaxed">{r.review || r.comment || 'Excellent treatment and professional approach.'}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Pricing & CTA */}
        <div className="p-6 border-t border-gray-100 bg-white z-30 sticky bottom-0">
           <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <p className="text-[11px] font-medium text-gray-400">Professional fee</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                   <span className="text-[24px] font-semibold text-gray-900">₹{fee}</span>
                   <span className="text-[12px] text-gray-400">/ consultation</span>
                </div>
              </div>
              <div className="text-right">
                 <p className="text-[11px] font-medium text-gray-400">Next open slot</p>
                 <p className="text-[13px] font-semibold text-teal-700 mt-1">Check now</p>
              </div>
           </div>

           <button
             onClick={() => { onClose(); setTimeout(() => onBook(d), 150); }}
             disabled={d.online === false || d.isOnline === false}
             className="w-full h-[50px] rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[15px] font-semibold flex items-center justify-center gap-2 group transition-colors active:scale-[0.98]"
           >
             {d.online === false || d.isOnline === false ? (
               'Professional offline'
             ) : (
               <>Book instantly <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
             )}
           </button>
        </div>
      </div>
    </div>
  );
}