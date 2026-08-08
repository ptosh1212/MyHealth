'use client';

import { useState, useEffect } from 'react';
import { X, Search, Star, ArrowRight, SearchIcon, Sparkles } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SYMPTOM_SPECIALTY_MAP } from '@/lib/medical-logic';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoctor: (doctor: any) => void;
  initialQuery?: string;
}

export default function SearchModal({ isOpen, onClose, onSelectDoctor, initialQuery = '' }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      setLoading(true);
      const unsubscribe = onSnapshot(collection(db, 'doctors'), (snapshot) => {
        const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setAllDoctors(doctors);
        setFilteredDoctors(doctors);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setSearchQuery('');
      setAllDoctors([]);
      setFilteredDoctors([]);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setFilteredDoctors(allDoctors); return; }

    // Smart mapping logic
    const mappedSpecialty = SYMPTOM_SPECIALTY_MAP[q] || SYMPTOM_SPECIALTY_MAP[q.split(' ')[0]];

    const results = allDoctors.filter((doc) => {
      const searchStr = [doc.name, doc.specialization, doc.specialty, doc.category, doc.degree].join(' ').toLowerCase();
      const nameMatch = searchStr.includes(q);
      const symptomMatch = mappedSpecialty && (doc.specialization?.toLowerCase() === mappedSpecialty.toLowerCase() || doc.specialty?.toLowerCase() === mappedSpecialty.toLowerCase());

      // Inject weight for symptom match
      if (symptomMatch) (doc as any).isSymptomMatch = true;
      else (doc as any).isSymptomMatch = false;

      return nameMatch || symptomMatch;
    });

    // Sort by symptom match first
    results.sort((a, b) => (b.isSymptomMatch ? 1 : 0) - (a.isSymptomMatch ? 1 : 0));
    setFilteredDoctors(results);
  }, [searchQuery, allDoctors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-b-2xl sm:rounded-2xl border-b border-gray-200 sm:border sm:border-gray-200 shadow-sm flex flex-col animate-slide-down max-h-[90vh]">

        {/* Search Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find doctors, specialties..."
                className="w-full h-[50px] bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700">
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={onClose} className="hidden sm:flex text-[14px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
          </div>
        </div>

        {/* Results Info */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
           <p className="text-[12px] font-medium text-gray-400">
             {filteredDoctors.length} results
           </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span className="text-[11px] text-teal-700 font-medium">Verified network</span>
           </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 min-h-[300px]">
           {loading ? (
             <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent animate-spin rounded-full" />
             </div>
           ) : filteredDoctors.length === 0 ? (
             <div className="py-20 flex flex-col items-center text-center px-8 text-gray-300">
                <SearchIcon size={56} className="mb-4" />
                <h3 className="text-[16px] font-semibold text-gray-500">No professionals found</h3>
                <p className="text-[14px] mt-1 text-gray-400">Try searching for &apos;Dentist&apos; or &apos;Cardio&apos;</p>
             </div>
           ) : (
             filteredDoctors.map((doc, i) => (
               <button
                 key={doc.id}
                 onClick={() => { onClose(); setTimeout(() => onSelectDoctor(doc), 150); }}
                 className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 text-left hover:border-teal-300 hover:bg-teal-50/30 group transition-all"
               >
                 <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                    {doc.profilePic || doc.photoURL ? (
                      <img src={doc.profilePic || doc.photoURL} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-gray-400">{doc.name?.[0]}</div>
                    )}
                 </div>

                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[15px] font-semibold text-gray-900 truncate">Dr. {doc.name}</h4>
                      {doc.online !== false && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                    </div>
                    <p className="text-[12px] text-teal-700 font-medium">{doc.specialization || 'Professional'}</p>

                    <div className="flex items-center gap-3 mt-2">
                       <div className="flex items-center gap-1">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-[12px] font-medium text-gray-700">4.8</span>
                       </div>
                       <span className="text-[12px] text-gray-300">|</span>
                       <span className="text-[12px] font-medium text-gray-500">₹{doc.fees || doc.consultationFee || 699}</span>
                    </div>
                 </div>

                 <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-teal-100 group-hover:text-teal-600 transition-all flex-shrink-0">
                    <ArrowRight size={16} />
                 </div>
               </button>
             ))
           )}
        </div>

        {/* Footer Presets */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50">
           <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-teal-600" />
              <p className="text-[12px] font-medium text-gray-500">Trending categories</p>
           </div>
           <div className="flex flex-wrap gap-2">
              {['Dermatology', 'Neurology', 'Pediatric', 'Cardiology', 'Dental'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-[12px] font-medium text-gray-600 hover:text-teal-700 hover:border-teal-300 transition-all"
                >
                  {tag}
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}