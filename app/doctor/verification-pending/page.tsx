'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Clock, CheckCircle, AlertCircle, FileText, Phone, Mail, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function VerificationPending() {
  const router = useRouter();
  const { user, signOut: storeSignOut } = useAuthStore();
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorData = async () => {
      if (!user?.uid) {
        router.push('/auth/login');
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'doctors', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDoctorData(data);
          
          // If verified, redirect to dashboard
          if (data.verified === true || data.verificationStatus === 'approved') {
            router.push('/doctor/dashboard');
          }
        } else {
          router.push('/auth/signup');
        }
      } catch (error) {
        console.error('Error fetching doctor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      storeSignOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e0a] via-[#0F110B] to-[#1a1410]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const status = doctorData?.verificationStatus || 'pending';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e0a] via-[#0F110B] to-[#1a1410] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white shadow-lg rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden border border-white/10">
            <img src="/icon.png" alt="Health Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">My Health</h1>
          <p className="text-gray-400">Doctor Verification Portal</p>
        </div>

        {/* Status Card */}
        <div className="glass rounded-3xl p-8 glow mb-6">
          {/* Status Icon */}
          <div className="text-center mb-6">
            {status === 'pending' && (
              <>
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-yellow-400" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Verification Pending</h2>
                <p className="text-gray-400">Your documents are under review</p>
              </>
            )}
            
            {status === 'rejected' && (
              <>
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-red-400" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Verification Rejected</h2>
                <p className="text-gray-400">Please review the feedback below</p>
              </>
            )}
          </div>

          {/* Message */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 mb-6">
            <p className="text-white leading-relaxed">
              {doctorData?.verificationMessage || 
                'Thank you for registering with My Health! Our team is currently reviewing your documents and credentials. Our team will contact you on WhatsApp in 2-3 business days to continue the onboarding process.'}
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-green-400" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Application Submitted</p>
                <p className="text-sm text-gray-400">
                  {doctorData?.submittedAt?.toDate().toLocaleString() || 'Just now'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                status === 'pending' ? 'bg-yellow-500/20' : 'bg-green-500/20'
              }`}>
                <Clock className={status === 'pending' ? 'text-yellow-400' : 'text-green-400'} size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Document Verification</p>
                <p className="text-sm text-gray-400">
                  {status === 'pending' ? 'In progress...' : 'Completed'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-gray-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-400">Account Activation</p>
                <p className="text-sm text-gray-500">Pending verification</p>
              </div>
            </div>
          </div>

          {/* Documents Submitted */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 mb-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <FileText size={20} />
              Documents Submitted
            </h3>
            <div className="space-y-2">
              {doctorData?.documents?.medicalDegree && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Medical Degree</span>
                  <CheckCircle className="text-green-400" size={16} />
                </div>
              )}
              {doctorData?.documents?.registrationCertificate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Registration Certificate</span>
                  <CheckCircle className="text-green-400" size={16} />
                </div>
              )}
              {doctorData?.documents?.aadharCard && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Aadhar Card</span>
                  <CheckCircle className="text-green-400" size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="text-primary" size={20} />
                <span className="text-sm text-gray-400">Phone</span>
              </div>
              <p className="text-white font-medium">{doctorData?.phone || 'Not provided'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="text-primary" size={20} />
                <span className="text-sm text-gray-400">Email</span>
              </div>
              <p className="text-white font-medium break-all">{doctorData?.email || 'Not provided'}</p>
            </div>
          </div>

          {/* Support Message */}
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-6">
            <p className="text-sm text-blue-400">
              <strong>Need help?</strong> Contact our support team at{' '}
              <a href="mailto:anantprakash1029@gmail.com" className="underline">
                anantprakash1029@gmail.com
              </a>{' '}
              or call{' '}
              <a href="tel:7903191345" className="underline">
                7903191345
              </a>
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition text-white font-semibold"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2026 My Health Technologies Private Limited. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}