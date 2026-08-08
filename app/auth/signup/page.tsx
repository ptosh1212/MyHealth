'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { auth, db } from '@/lib/firebase';
import { isValidIndianPhone, formatPhoneNumber } from '@/lib/otp-service';
import Link from 'next/link';
import { useAlertStore } from '@/lib/alert-store';
import { useAuthStore } from '@/lib/store';

const serif = Source_Serif_4({ subsets: ['latin'], weight: ['500', '600', '700'] });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'] });

// ---- palette --------------------------------------------------------------
const paper = '#FAF8F3';
const ink = '#14322E';
const inkMuted = '#5C6B63';
const sage = '#3F6F5E';
const line = '#E1DBCB';
const stamp = '#A5342C';

type Role = 'patient' | 'doctor';
type Step = 'role' | 'phone' | 'details' | 'documents' | 'review';
type DocumentKey = 'medicalDegree' | 'registrationCertificate' | 'aadharCard' | 'profilePhoto';

const STEPS_BY_ROLE: Record<Role, Step[]> = {
  patient: ['phone', 'details', 'review'],
  doctor: ['phone', 'details', 'documents', 'review'],
};

const DEFAULT_FEE = '699';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---- small building blocks --------------------------------------------------

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${mono.className} text-[11px] uppercase tracking-[0.18em]`} style={{ color: inkMuted }}>
      {children}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`${mono.className} block text-[11px] uppercase tracking-[0.14em] mb-2`} style={{ color: inkMuted }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs mt-1.5" style={{ color: inkMuted }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const underlineInput =
  'w-full bg-transparent border-0 border-b py-2 text-[15px] outline-none transition-colors placeholder:text-[#B8B2A0]';

function Stamp({ label, tone = 'sage' }: { label: string; tone?: 'sage' | 'red' | 'ink' }) {
  const color = tone === 'red' ? stamp : tone === 'ink' ? ink : sage;
  return (
    <div
      className={`${mono.className} inline-flex items-center justify-center rounded-full border-[1.5px] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] -rotate-6 select-none`}
      style={{ borderColor: color, color, backgroundColor: 'transparent' }}
    >
      {label}
    </div>
  );
}

function StepRail({ role, step }: { role: Role; step: Step }) {
  const steps = STEPS_BY_ROLE[role];
  const labels: Record<Step, string> = {
    role: 'Role',
    phone: 'Contact',
    details: 'Details',
    documents: 'Documents',
    review: 'Review',
  };
  const currentIdx = steps.indexOf(step);

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, idx) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={`${mono.className} text-[11px] w-6 h-6 rounded-full flex items-center justify-center border`}
              style={
                idx <= currentIdx
                  ? { borderColor: ink, color: paper, backgroundColor: ink }
                  : { borderColor: line, color: inkMuted }
              }
            >
              {idx + 1}
            </span>
            <span
              className={`${mono.className} text-[11px] uppercase tracking-[0.1em] hidden sm:inline`}
              style={{ color: idx <= currentIdx ? ink : inkMuted }}
            >
              {labels[s]}
            </span>
          </div>
          {idx < steps.length - 1 && <div className="flex-1 h-px mx-3" style={{ backgroundColor: line }} />}
        </div>
      ))}
    </div>
  );
}

// ---- main form ---------------------------------------------------------------

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setUserRole } = useAuthStore();
  const { showAlert } = useAlertStore();

  const initialRole = searchParams.get('role');
  const startingStep: Step = initialRole === 'patient' || initialRole === 'doctor' ? 'phone' : 'role';

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(startingStep);
  const [role, setRole] = useState<Role>(initialRole === 'doctor' ? 'doctor' : 'patient');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('other');

  const [specialization, setSpecialization] = useState('');
  const [degree, setDegree] = useState('');
  const [experience, setExperience] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [fees, setFees] = useState(DEFAULT_FEE);

  const [documentUrls, setDocumentUrls] = useState<Record<DocumentKey, string>>({
    medicalDegree: '',
    registrationCertificate: '',
    aadharCard: '',
    profilePhoto: '',
  });
  const [uploading, setUploading] = useState(false);

  const goToRole = (nextRole: Role) => router.push(`/auth/signup?role=${nextRole}`);

  // Phone existence check now runs server-side via /api/check-phone (Admin SDK),
  // since this fires before the user is authenticated and Firestore rules
  // require request.auth != null for every read.
  const handleCheckPhone = async () => {
    if (!isValidIndianPhone(phone)) {
      showAlert('Phone required', 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (data.exists) {
        showAlert('Account exists', 'This phone number already has an account. Please log in instead.', 'warning');
        router.push('/auth/login');
        return;
      }
      setStep('details');
    } catch (error) {
      console.error('Error checking phone:', error);
      showAlert('Service error', 'Failed to check account status. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: DocumentKey) => {
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDocumentUrls((prev) => ({ ...prev, [type]: dataUrl }));
    } catch (error) {
      console.error('File read error:', error);
      showAlert('Upload failed', "We couldn't read that file. Please check the format and try again.", 'error');
    } finally {
      setUploading(false);
    }
  };

  const validateSignup = () => {
    if (!email || !password || !name || !phone) {
      showAlert('Incomplete form', 'Please fill in all required fields.', 'warning');
      return false;
    }
    if (role === 'doctor') {
      if (!specialization || !degree || !registrationNumber) {
        showAlert('Missing details', 'Please fill in all professional details.', 'warning');
        return false;
      }
      if (!documentUrls.medicalDegree || !documentUrls.registrationCertificate || !documentUrls.aadharCard) {
        showAlert('Documents required', 'Please upload all required medical and identity documents.', 'warning');
        return false;
      }
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateSignup()) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Set the role before Firestore writes resolve so AuthProvider doesn't
      // briefly fall back to its default role.
      setUser(userCredential.user);
      setUserRole(role);

      if (role === 'doctor') {
        await setDoc(doc(db, 'doctors', userId), {
          uid: userId,
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          phoneVerified: true,
          specialization: specialization.trim(),
          degree: degree.trim(),
          experience: parseInt(experience, 10) || 5,
          registrationNumber: registrationNumber.trim(),
          clinicName: clinicName.trim(),
          clinicAddress: clinicAddress.trim(),
          fees: parseInt(fees, 10) || Number(DEFAULT_FEE),
          consultationFee: parseInt(fees, 10) || Number(DEFAULT_FEE),
          role: 'doctor',
          documents: {
            medicalDegree: documentUrls.medicalDegree,
            registrationCertificate: documentUrls.registrationCertificate,
            aadharCard: documentUrls.aadharCard,
            profilePhoto: documentUrls.profilePhoto,
          },
          verified: false,
          verificationStatus: 'pending',
          verificationMessage:
            'Thank you for registering! Our team will contact you on WhatsApp in 2-3 business days to continue the onboarding process.',
          profilePic: documentUrls.profilePhoto,
          online: false,
          autoApprove: false,
          rating: 0,
          totalPatients: 0,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '9:00 AM',
          endTime: '6:00 PM',
          createdAt: Timestamp.now(),
          submittedAt: Timestamp.now(),
        });

        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          phoneVerified: true,
          role: 'doctor',
          verificationStatus: 'pending',
          createdAt: Timestamp.now(),
        });

        router.replace('/doctor/dashboard');
      } else {
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          phoneVerified: true,
          role: 'patient',
          age: parseInt(age, 10) || 25,
          gender,
          createdAt: Timestamp.now(),
        });

        router.push('/patient/home');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        showAlert('Email in use', 'That email is already registered. Please sign in instead.', 'warning');
      } else if (error.code === 'auth/weak-password') {
        showAlert('Weak password', 'Password should be at least 6 characters.', 'warning');
      } else {
        showAlert('Signup failed', 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const eyebrowForStep: Record<Step, string> = {
    role: 'New Registration',
    phone: role === 'doctor' ? 'Practitioner Registration · Contact' : 'Patient Registration · Contact',
    details: role === 'doctor' ? 'Practitioner Registration · Details' : 'Patient Registration · Details',
    documents: 'Practitioner Registration · Attachments',
    review: role === 'doctor' ? 'Practitioner Registration · Review' : 'Patient Registration · Review',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: paper }}>
      <div className={`w-full max-w-xl ${sans.className}`} style={{ color: ink }}>
        {/* Letterhead */}
        <div className="flex items-end justify-between pb-4 mb-6 border-b-2" style={{ borderColor: ink }}>
          <div className="flex items-center gap-3">
            <svg width="26" height="26" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 50 L100 150 L150 50 L170 70 L100 180 L30 70 Z" stroke={ink} strokeWidth="14" fill="none" />
            </svg>
            <span className={`${serif.className} text-xl font-semibold tracking-tight`}>My Health</span>
          </div>
          <Eyebrow>{eyebrowForStep[step]}</Eyebrow>
        </div>

        <div className="bg-white border rounded-sm p-6 sm:p-9" style={{ borderColor: line, boxShadow: '0 1px 3px rgba(20,50,46,0.06)' }}>
          {step !== 'role' && <StepRail role={role} step={step} />}

          {/* Step: Role */}
          {step === 'role' && (
            <div className="space-y-6">
              <div>
                <h1 className={`${serif.className} text-2xl font-semibold mb-1`}>Who's registering today?</h1>
                <p className="text-sm" style={{ color: inkMuted }}>
                  Choose the account type that matches how you'll use My Health.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { r: 'patient' as Role, glyph: 'P', title: 'Patient', desc: 'Book and manage appointments' },
                    { r: 'doctor' as Role, glyph: 'D', title: 'Doctor', desc: 'Manage a practice and patients' },
                  ]
                ).map(({ r, glyph, title, desc }) => (
                  <button
                    key={r}
                    onClick={() => goToRole(r)}
                    className="group text-left p-5 border rounded-sm transition-colors"
                    style={{ borderColor: line }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = sage)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = line)}
                  >
                    <div
                      className={`${serif.className} w-10 h-10 rounded-full border flex items-center justify-center text-lg mb-4`}
                      style={{ borderColor: ink, color: ink }}
                    >
                      {glyph}
                    </div>
                    <p className="font-semibold text-[15px]">{title}</p>
                    <p className="text-xs mt-1" style={{ color: inkMuted }}>
                      {desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Phone */}
          {step === 'phone' && (
            <div className="space-y-6">
              <div>
                <h1 className={`${serif.className} text-2xl font-semibold mb-1`}>Your mobile number</h1>
                <p className="text-sm" style={{ color: inkMuted }}>
                  We'll use this to reach you about your account and appointments.
                </p>
              </div>

              <Field label="Mobile number" hint="Enter a 10-digit Indian mobile number">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${underlineInput} ${mono.className}`}
                  style={{ borderColor: phone && !isValidIndianPhone(phone) ? stamp : line }}
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                />
                {phone && !isValidIndianPhone(phone) && (
                  <p className="text-xs mt-1.5" style={{ color: stamp }}>
                    Please enter a valid 10-digit number
                  </p>
                )}
              </Field>

              <button
                onClick={handleCheckPhone}
                disabled={loading || !isValidIndianPhone(phone)}
                className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                style={{ backgroundColor: ink, color: paper }}
              >
                {loading ? 'Checking account…' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <h1 className={`${serif.className} text-2xl font-semibold`}>
                {role === 'doctor' ? 'Professional details' : 'Personal details'}
              </h1>

              <Field label="Full name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={underlineInput}
                  style={{ borderColor: line }}
                  placeholder="Aashish Gupta"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={underlineInput}
                  style={{ borderColor: line }}
                  placeholder="your@email.com"
                />
              </Field>

              <Field label="Password" hint="Minimum 6 characters">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={underlineInput}
                  style={{ borderColor: line }}
                  placeholder="••••••••"
                  minLength={6}
                />
              </Field>

              {role === 'patient' ? (
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Age">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className={underlineInput}
                      style={{ borderColor: line }}
                      placeholder="25"
                    />
                  </Field>
                  <Field label="Gender">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as typeof gender)}
                      className={`${underlineInput} bg-transparent`}
                      style={{ borderColor: line }}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>
              ) : (
                <>
                  <Field label="Specialization">
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className={underlineInput}
                      style={{ borderColor: line }}
                      placeholder="e.g., Cardiologist, Dermatologist"
                    />
                  </Field>

                  <Field label="Degree">
                    <input
                      type="text"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className={underlineInput}
                      style={{ borderColor: line }}
                      placeholder="e.g., MBBS, MD"
                    />
                  </Field>

                  <Field label="Medical registration number">
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className={`${underlineInput} ${mono.className}`}
                      style={{ borderColor: line }}
                      placeholder="MCI / State registration no."
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-6">
                    <Field label="Experience (years)">
                      <input
                        type="number"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className={underlineInput}
                        style={{ borderColor: line }}
                        placeholder="5"
                      />
                    </Field>
                    <Field label="Consultation fee (₹)">
                      <input
                        type="number"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                        className={underlineInput}
                        style={{ borderColor: line }}
                        placeholder={DEFAULT_FEE}
                      />
                    </Field>
                  </div>

                  <Field label="Clinic name">
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className={underlineInput}
                      style={{ borderColor: line }}
                      placeholder="Your clinic name"
                    />
                  </Field>

                  <Field label="Clinic address">
                    <textarea
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full bg-transparent border rounded-sm px-3 py-2.5 text-[15px] outline-none min-h-[80px] transition-colors"
                      style={{ borderColor: line }}
                      placeholder="Full clinic address"
                    />
                  </Field>
                </>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => setStep(role === 'doctor' ? 'documents' : 'review')}
                  disabled={!name || !email || !password}
                  className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                  style={{ backgroundColor: ink, color: paper }}
                >
                  Continue
                </button>
                <button onClick={() => setStep('phone')} className="text-sm self-center" style={{ color: inkMuted }}>
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step: Documents */}
          {step === 'documents' && role === 'doctor' && (
            <div className="space-y-6">
              <div>
                <h1 className={`${serif.className} text-2xl font-semibold mb-1`}>Attachments</h1>
                <p className="text-sm" style={{ color: inkMuted }}>
                  Required for KYC verification. Our team reviews these manually.
                </p>
              </div>

              {(
                [
                  { key: 'medicalDegree' as DocumentKey, label: 'Medical degree certificate', required: true },
                  { key: 'registrationCertificate' as DocumentKey, label: 'Medical registration certificate', required: true },
                  { key: 'aadharCard' as DocumentKey, label: 'Aadhar card', required: true },
                  { key: 'profilePhoto' as DocumentKey, label: 'Profile photo', required: false },
                ]
              ).map(({ key, label, required }, idx) => (
                <div
                  key={key}
                  className="border rounded-sm p-4 relative"
                  style={{ borderColor: line, borderStyle: documentUrls[key] ? 'solid' : 'dashed' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Eyebrow>Attachment {String(idx + 1).padStart(2, '0')}</Eyebrow>
                      <p className="text-sm font-medium mt-1">
                        {label}
                        {required && <span style={{ color: stamp }}> *</span>}
                      </p>
                    </div>
                    {documentUrls[key] && <Stamp label="Attached" tone="red" />}
                  </div>
                  <input
                    type="file"
                    accept={key === 'profilePhoto' ? 'image/*' : 'image/*,.pdf'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, key);
                    }}
                    className={`${mono.className} w-full text-xs mt-3`}
                    style={{ color: inkMuted }}
                  />
                </div>
              ))}

              {uploading && (
                <p className={`${mono.className} text-xs text-center uppercase tracking-[0.1em]`} style={{ color: inkMuted }}>
                  Uploading…
                </p>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => setStep('review')}
                  disabled={!documentUrls.medicalDegree || !documentUrls.registrationCertificate || !documentUrls.aadharCard || uploading}
                  className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                  style={{ backgroundColor: ink, color: paper }}
                >
                  Continue to review
                </button>
                <button onClick={() => setStep('details')} className="text-sm self-center" style={{ color: inkMuted }}>
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className={`${serif.className} text-2xl font-semibold mb-1`}>Review & submit</h1>
                  <p className="text-sm" style={{ color: inkMuted }}>
                    Please verify your information before submitting.
                  </p>
                </div>
                {role === 'doctor' && <Stamp label="Pending review" tone="ink" />}
              </div>

              <div className="border rounded-sm divide-y" style={{ borderColor: line }}>
                {[
                  ['Name', name],
                  ['Email', email],
                  ['Phone', formatPhoneNumber(phone)],
                  ...(role === 'doctor'
                    ? [
                        ['Specialization', specialization],
                        ['Degree', degree],
                        ['Registration number', registrationNumber],
                      ]
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className={`${mono.className} text-[11px] uppercase tracking-[0.1em]`} style={{ color: inkMuted }}>
                      {label}
                    </span>
                    <span className="text-sm font-medium text-right">{value}</span>
                  </div>
                ))}

                {role === 'doctor' && (
                  <div className="px-4 py-3">
                    <span className={`${mono.className} text-[11px] uppercase tracking-[0.1em]`} style={{ color: inkMuted }}>
                      Attachments
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Stamp label="Degree" tone="sage" />
                      <Stamp label="Registration" tone="sage" />
                      <Stamp label="Aadhar" tone="sage" />
                      {documentUrls.profilePhoto && <Stamp label="Photo" tone="sage" />}
                    </div>
                  </div>
                )}
              </div>

              {role === 'doctor' && (
                <div className="border-l-2 pl-4 py-1" style={{ borderColor: stamp }}>
                  <p className="text-sm" style={{ color: inkMuted }}>
                    Your account Is Made <strong style={{ color: ink }}>Yauyy</strong>. Letss Goo
                    
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                  style={{ backgroundColor: ink, color: paper }}
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
                <button
                  onClick={() => setStep(role === 'doctor' ? 'documents' : 'details')}
                  disabled={loading}
                  className="text-sm self-center"
                  style={{ color: inkMuted }}
                >
                  ← Back to edit
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: inkMuted }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold underline" style={{ color: sage }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: paper }}>
          <div className={`${mono.className} text-sm uppercase tracking-[0.14em]`} style={{ color: inkMuted }}>
            Loading…
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}