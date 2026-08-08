import { Metadata } from 'next';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DoctorProfileClient from './DoctorProfileClient';

// Force dynamic rendering - skip static generation at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    doctorId: string;
  };
}

interface DoctorData {
  id: string;
  name?: string;
  specialization?: string;
  specialty?: string;
  category?: string;
  clinicAddress?: string;
  address?: string;
  experience?: number;
  rating?: number;
  fees?: number;
  consultationFee?: number;
  photoURL?: string;
  profilePic?: string;
  [key: string]: any;
}

// Generate metadata for SEO - simplified to avoid build-time Firebase calls
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Return basic metadata - will be enhanced at runtime
  return {
    title: 'Doctor Profile | My Health',
    description: 'Book appointment with experienced doctors online. View doctor profile, ratings, and availability.',
    openGraph: {
      title: 'Doctor Profile | My Health',
      description: 'Book appointment with experienced doctors online.',
      type: 'profile',
      siteName: 'My Health',
    },
  };
}

export default async function DoctorProfilePage({ params }: PageProps) {
  try {
    // Fetch doctor data
    const doctorDoc = await getDoc(doc(db, 'doctors', params.doctorId));
    
    if (!doctorDoc.exists()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Doctor Not Found</h1>
            <p className="text-slate-500 mb-6">The requested doctor profile could not be found.</p>
            <a href="/patient/search" className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition">
              Search Doctors
            </a>
          </div>
        </div>
      );
    }

    const doctor: DoctorData = { id: doctorDoc.id, ...doctorDoc.data() };

    // Fetch real ratings only (no mock data)
    const reviewsQuery = query(
      collection(db, 'ratings'),
      where('doctorId', '==', params.doctorId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Fetch similar doctors (same specialty)
    const specialty = doctor.specialization || doctor.specialty || doctor.category || 'General';
    const similarQuery = query(
      collection(db, 'doctors'),
      where('specialization', '==', specialty),
      limit(6)
    );
    const similarSnapshot = await getDocs(similarQuery);
    const similarDoctors = similarSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(d => d.id !== params.doctorId);

    return <DoctorProfileClient doctor={doctor} reviews={reviews} similarDoctors={similarDoctors} />;
  } catch (error) {
    console.error('Error loading doctor profile:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Error Loading Profile</h1>
          <p className="text-slate-500 mb-6">Something went wrong. Please try again later.</p>
          <a href="/patient/search" className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition">
            Search Doctors
          </a>
        </div>
      </div>
    );
  }
}