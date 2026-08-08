'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

const serif = Source_Serif_4({ subsets: ['latin'], weight: ['500', '600', '700'] });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'] });

// ---- palette (matches signup) ----------------------------------------------
const paper = '#FAF8F3';
const ink = '#14322E';
const inkMuted = '#5C6B63';
const sage = '#3F6F5E';
const line = '#E1DBCB';
const stamp = '#A5342C';

const underlineInput =
  'w-full bg-transparent border-0 border-b py-2 text-[15px] outline-none transition-colors placeholder:text-[#B8B2A0]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`${mono.className} block text-[11px] uppercase tracking-[0.14em] mb-2`} style={{ color: inkMuted }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Doctors collection is checked first since a doctor's verification
      // status determines where they land.
      const doctorDoc = await getDoc(doc(db, 'doctors', userId));
      if (doctorDoc.exists()) {
        const doctorData = doctorDoc.data();
        const verificationStatus = doctorData?.verificationStatus || (doctorData?.verified ? 'approved' : 'pending');
        router.push(verificationStatus === 'pending' ? '/doctor/verification-pending' : '/doctor/dashboard');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      const role = userDoc.exists() ? userDoc.data()?.role : null;

      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'doctor') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/patient/home');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code)) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: paper }}>
      <div className={`w-full max-w-md ${sans.className}`} style={{ color: ink }}>
        {/* Letterhead */}
        <div className="flex items-end justify-between pb-4 mb-6 border-b-2" style={{ borderColor: ink }}>
          <div className="flex items-center gap-3">
            <svg width="26" height="26" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 50 L100 150 L150 50 L170 70 L100 180 L30 70 Z" stroke={ink} strokeWidth="14" fill="none" />
            </svg>
            <span className={`${serif.className} text-xl font-semibold tracking-tight`}>My Health</span>
          </div>
          <p className={`${mono.className} text-[11px] uppercase tracking-[0.18em]`} style={{ color: inkMuted }}>
            Sign In
          </p>
        </div>

        <div className="bg-white border rounded-sm p-6 sm:p-9" style={{ borderColor: line, boxShadow: '0 1px 3px rgba(20,50,46,0.06)' }}>
          <div className="mb-6">
            <h1 className={`${serif.className} text-2xl font-semibold mb-1`}>Welcome back</h1>
            <p className="text-sm" style={{ color: inkMuted }}>
              Sign in to your healthcare account.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className={underlineInput}
                style={{ borderColor: line }}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className={`${underlineInput} pr-8`}
                  style={{ borderColor: line }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-0 top-1/2 -translate-y-1/2"
                  style={{ color: inkMuted }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="border-l-2 pl-3 py-1" style={{ borderColor: stamp }}>
                <p className="text-sm" style={{ color: stamp }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
              style={{ backgroundColor: ink, color: paper }}
            >
              {loading ? 'Signing in…' : 'Continue'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: line }} />
            <span className={`${mono.className} text-[10px] uppercase tracking-[0.14em]`} style={{ color: inkMuted }}>
              New here
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: line }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/auth/signup?role=patient"
              className="p-3 border rounded-sm transition-colors"
              style={{ borderColor: line }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = sage)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = line)}
            >
              <p className="text-[13px] font-semibold">Patient</p>
              <p className="text-[11px]" style={{ color: inkMuted }}>
                Book appointments
              </p>
            </Link>
            <Link
              href="/auth/signup?role=doctor"
              className="p-3 border rounded-sm transition-colors"
              style={{ borderColor: line }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = sage)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = line)}
            >
              <p className="text-[13px] font-semibold">Doctor</p>
              <p className="text-[11px]" style={{ color: inkMuted }}>
                Manage patients
              </p>
            </Link>
          </div>
        </div>

        
        
      </div>
    </div>
  );
}