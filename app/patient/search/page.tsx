'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import { Search, MapPin, Star, Award, DollarSign, Filter, Stethoscope } from 'lucide-react';
import Link from 'next/link';

const SPECIALIZATIONS = [
  'All', 'General Physician', 'Cardiologist', 'Dermatologist', 
  'Pediatrician', 'Orthopedic', 'Gynecologist', 'Neurologist',
  'Dentist', 'ENT Specialist', 'Psychiatrist'
];

function SearchDoctorsContent() {
  const searchParams = useSearchParams();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'fee'>('rating');

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    // Check for specialty parameter in URL
    const specialtyParam = searchParams.get('specialty');
    if (specialtyParam) {
      setSelectedSpecialty(specialtyParam);
    }
  }, [searchParams]);

  useEffect(() => {
    filterDoctors();
  }, [searchTerm, selectedSpecialty, sortBy, doctors]);

  const fetchDoctors = async () => {
    try {
      // Fetch all doctors (don't filter by online status initially)
      const snapshot = await getDocs(collection(db, 'doctors'));
      const doctorsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        rating: 4.5 + Math.random() * 0.5 // Mock rating
      }));
      setDoctors(doctorsData);
      setFilteredDoctors(doctorsData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Specialty filter
    if (selectedSpecialty !== 'All') {
      filtered = filtered.filter(doc => 
        doc.specialization === selectedSpecialty || 
        doc.specialty === selectedSpecialty
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'experience') return (b.experience || 0) - (a.experience || 0);
      if (sortBy === 'fee') return (a.fees || a.consultationFee || 999) - (b.fees || b.consultationFee || 999);
      return 0;
    });

    setFilteredDoctors(filtered);
  };

  return (
    <>
      <div className="min-h-screen pb-20 lg:pb-0">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Find Doctors</h1>

          {/* Search Bar */}
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or specialty..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Specialty Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Specialization</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
              >
                {SPECIALIZATIONS.map(spec => (
                  <option key={spec} value={spec} className="bg-[#1A1A1E]">{spec}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
              >
                <option value="rating" className="bg-[#1A1A1E]">Highest Rated</option>
                <option value="experience" className="bg-[#1A1A1E]">Most Experienced</option>
                <option value="fee" className="bg-[#1A1A1E]">Lowest Fee</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-slate-500">
              Found {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}
            </p>
          </div>

          {/* Doctors Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Stethoscope className="mx-auto mb-4 text-gray-600" size={64} />
              <p className="text-slate-500 text-lg">No doctors found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor) => (
                <Link key={doctor.id} href={`/patient/doctor/${doctor.id}`}>
                  <div className="glass rounded-2xl p-6 hover:glow transition cursor-pointer h-full">
                    {/* Doctor Image */}
                    <div className="flex items-center gap-4 mb-4">
                      {doctor.profilePic ? (
                        <img 
                          src={doctor.profilePic} 
                          alt={doctor.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary">
                          <span className="text-2xl font-bold text-primary">
                            {doctor.name?.charAt(0) || 'D'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">Dr. {doctor.name}</h3>
                        <p className="text-sm text-slate-500">{doctor.specialization || doctor.specialty}</p>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            size={14} 
                            className={star <= Math.floor(doctor.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-500">({doctor.rating?.toFixed(1)})</span>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="text-primary" size={16} />
                        <span>{doctor.experience || 5}+ years experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="text-primary" size={16} />
                        <span>₹{doctor.fees || doctor.consultationFee || 699} consultation</span>
                      </div>
                      {doctor.clinicAddress && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="text-primary flex-shrink-0 mt-0.5" size={16} />
                          <span className="text-slate-500 line-clamp-2">{doctor.clinicAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Book Button */}
                    <button className="w-full bg-primary text-slate-900 py-2 rounded-xl font-semibold hover:opacity-90 transition">
                      Book Appointment
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <PatientBottomNav />
    </>
  );
}

export default function SearchDoctorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchDoctorsContent />
    </Suspense>
  );
}