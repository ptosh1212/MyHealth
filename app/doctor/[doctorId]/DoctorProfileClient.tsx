'use client';

import { useState } from 'react';
import { Star, MapPin, Phone, Clock, Share2, ArrowLeft } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import Link from 'next/link';

interface DoctorProfileClientProps {
  doctor: any;
  reviews: any[];
  similarDoctors: any[];
}

export default function DoctorProfileClient({ doctor, reviews, similarDoctors }: DoctorProfileClientProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
    : 0;

  const name = doctor.name || 'Doctor';
  const spec = doctor.specialization || doctor.specialty || doctor.category || 'General';
  const degrees = doctor.degrees?.length ? doctor.degrees : doctor.degree ? [doctor.degree] : [];
  const certifications = doctor.certifications || [];
  const clinicAddress = doctor.clinicAddress || doctor.address || 'Not available';
  const phone = doctor.phone || doctor.phoneNumber || 'Not available';
  const languages = doctor.languages || [];
  const availableDays = doctor.workingDays || doctor.availableDays || [];
  const fee = doctor.fees || 699;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Dr. ${name} - ${spec}`,
        text: `Book appointment with Dr. ${name} on Anant Health`,
        url: window.location.href,
      });
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Physician',
              name: `Dr. ${name}`,
              image: doctor.photoURL || doctor.profilePic,
              medicalSpecialty: spec,
              address: { '@type': 'PostalAddress', streetAddress: clinicAddress },
              telephone: phone,
              aggregateRating: avgRating > 0 ? {
                '@type': 'AggregateRating',
                ratingValue: avgRating.toFixed(1),
                reviewCount: reviews.length,
                bestRating: 5,
                worstRating: 1,
              } : undefined,
              priceRange: `₹${fee}`,
              availableService: { '@type': 'MedicalProcedure', name: 'Medical Consultation' },
            }),
          }}
        />

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/patient/search"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft size={16} />
              Search
            </Link>
            <button
              onClick={handleShare}
              className="p-2 -mr-2 hover:bg-slate-100 rounded-md transition"
              aria-label="Share doctor profile"
            >
              <Share2 size={17} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
              {/* Photo — ID badge, not avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
                {doctor.photoURL || doctor.profilePic ? (
                  <img
                    src={doctor.photoURL || doctor.profilePic}
                    alt={`Dr. ${name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-slate-400">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono tracking-wide uppercase text-primary mb-1">{spec}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">Dr. {name}</h1>
                {degrees.length > 0 && (
                  <p className="text-sm text-slate-500 mt-1">{degrees.join(' · ')}</p>
                )}

                {avgRating > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          className={star <= Math.round(avgRating) ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-slate-500">({reviews.length} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vitals strip — chart-style data row, not gradient tiles */}
            <div className="border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200">
              {[
                { label: 'Experience', value: `${doctor.experience || 0} yrs` },
                { label: 'Patients seen', value: doctor.totalPatients || 0 },
                { label: 'Credentials', value: certifications.length || degrees.length || 0 },
                { label: 'Consultation fee', value: `₹${fee}` },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-3 sm:px-5 sm:py-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">{stat.label}</p>
                  <p className="font-mono text-lg font-semibold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="p-6 sm:p-8 pt-5">
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full sm:w-auto px-7 py-3 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition"
              >
                Book appointment
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {(doctor.bio || doctor.about) && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">About</h2>
                  <p className="text-slate-700 leading-relaxed">{doctor.bio || doctor.about}</p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Patient reviews</h2>
                  {reviews.length > 0 && (
                    <span className="text-xs font-mono text-slate-400">{reviews.length} total</span>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">No reviews yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {reviews.map((review) => (
                      <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-slate-600">
                            {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-slate-900 text-sm">{review.userName || 'Anonymous'}</p>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={12}
                                    className={star <= (review.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-slate-600 text-sm mt-1">{review.comment}</p>
                            )}
                            {review.createdAt?.seconds && (
                              <p className="text-xs font-mono text-slate-400 mt-1.5">
                                {new Date(review.createdAt.seconds * 1000).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">Contact</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={17} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">{clinicAddress}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={17} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">{phone}</p>
                  </div>
                </div>
              </div>

              {availableDays.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">Availability</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((day) => {
                      const isAvailable = availableDays.some((d: string) =>
                        d.toLowerCase().startsWith(day.toLowerCase())
                      );
                      return (
                        <span
                          key={day}
                          className={`w-9 h-9 flex items-center justify-center rounded-md text-xs font-mono font-medium ${
                            isAvailable
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-slate-300 border border-slate-100'
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                  {doctor.timings && (
                    <div className="mt-4 flex items-center gap-2 text-slate-600 text-sm">
                      <Clock size={15} className="text-slate-400" />
                      {doctor.timings}
                    </div>
                  )}
                </div>
              )}

              {languages.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 border border-slate-200 text-slate-600 rounded-md text-xs">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar doctors */}
          {similarDoctors.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-4">Similar doctors</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarDoctors.map((doc) => (
                  <Link key={doc.id} href={`/doctor/${doc.id}`}>
                    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-primary/40 transition h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {doc.photoURL || doc.profilePic ? (
                            <img src={doc.photoURL || doc.profilePic} alt={doc.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-slate-400">
                              {(doc.name || 'D').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">Dr. {doc.name}</h3>
                          <p className="text-xs text-primary">{doc.specialization || doc.specialty}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-3 border-t border-slate-100">
                        <span>{doc.experience || 0} yrs exp</span>
                        <span className="text-slate-900 font-semibold">₹{doc.fees || 699}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        doctor={doctor}
        onSuccess={() => {}}
      />
    </>
  );
}