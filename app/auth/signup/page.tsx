
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import {
  Source_Serif_4,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from 'next/font/google';
import Link from 'next/link';

import { auth, db } from '@/lib/firebase';
import {
  isValidIndianPhone,
  formatPhoneNumber,
} from '@/lib/otp-service';

import { useAlertStore } from '@/lib/alert-store';
import { useAuthStore } from '@/lib/store';

// -----------------------------------------------------------------------------
// FONTS
// -----------------------------------------------------------------------------

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
});

// -----------------------------------------------------------------------------
// COLORS
// -----------------------------------------------------------------------------

const paper = '#FAF8F3';
const ink = '#14322E';
const inkMuted = '#5C6B63';
const sage = '#3F6F5E';
const line = '#E1DBCB';
const stamp = '#A5342C';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type Role = 'patient' | 'doctor';

type Step =
  | 'role'
  | 'phone'
  | 'details'
  | 'documents'
  | 'review';

type DocumentKey =
  | 'medicalDegree'
  | 'registrationCertificate'
  | 'aadharCard'
  | 'profilePhoto';

// -----------------------------------------------------------------------------
// STEPS
// -----------------------------------------------------------------------------

const STEPS_BY_ROLE: Record<Role, Step[]> = {
  patient: ['phone', 'details', 'review'],
  doctor: ['phone', 'details', 'documents', 'review'],
};

const DEFAULT_FEE = '699';

// -----------------------------------------------------------------------------
// FILE UPLOAD
// -----------------------------------------------------------------------------

async function uploadToCloudinary(
  file: File,
  type: DocumentKey
): Promise<string> {
  if (!file) {
    throw new Error('No file selected.');
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      'File is too large. Maximum size is 10 MB.'
    );
  }

  const formData = new FormData();

  formData.append('file', file);
  formData.append('type', type);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      'Upload server returned an invalid response.'
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error || 'Cloudinary upload failed.'
    );
  }

  if (!data?.url) {
    throw new Error(
      'Cloudinary did not return an image URL.'
    );
  }

  return data.url;
}

// -----------------------------------------------------------------------------
// SMALL COMPONENTS
// -----------------------------------------------------------------------------

function Eyebrow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      className={`${mono.className} text-[11px] uppercase tracking-[0.18em]`}
      style={{ color: inkMuted }}
    >
      {children}
    </p>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className={`${mono.className} block text-[11px] uppercase tracking-[0.14em] mb-2`}
        style={{ color: inkMuted }}
      >
        {label}
      </label>

      {children}

      {hint && (
        <p
          className="text-xs mt-1.5"
          style={{ color: inkMuted }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

const underlineInput =
  'w-full bg-transparent border-0 border-b py-2 text-[15px] outline-none transition-colors placeholder:text-[#B8B2A0]';

function Stamp({
  label,
  tone = 'sage',
}: {
  label: string;
  tone?: 'sage' | 'red' | 'ink';
}) {
  const color =
    tone === 'red'
      ? stamp
      : tone === 'ink'
        ? ink
        : sage;

  return (
    <div
      className={`${mono.className} inline-flex items-center justify-center rounded-full border-[1.5px] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] -rotate-6 select-none`}
      style={{
        borderColor: color,
        color,
        backgroundColor: 'transparent',
      }}
    >
      {label}
    </div>
  );
}

// -----------------------------------------------------------------------------
// STEP RAIL
// -----------------------------------------------------------------------------

function StepRail({
  role,
  step,
}: {
  role: Role;
  step: Step;
}) {
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
        <div
          key={s}
          className="flex items-center flex-1 last:flex-none"
        >
          <div className="flex items-center gap-2">
            <span
              className={`${mono.className} text-[11px] w-6 h-6 rounded-full flex items-center justify-center border`}
              style={
                idx <= currentIdx
                  ? {
                      borderColor: ink,
                      color: paper,
                      backgroundColor: ink,
                    }
                  : {
                      borderColor: line,
                      color: inkMuted,
                    }
              }
            >
              {idx + 1}
            </span>

            <span
              className={`${mono.className} text-[11px] uppercase tracking-[0.1em] hidden sm:inline`}
              style={{
                color:
                  idx <= currentIdx
                    ? ink
                    : inkMuted,
              }}
            >
              {labels[s]}
            </span>
          </div>

          {idx < steps.length - 1 && (
            <div
              className="flex-1 h-px mx-3"
              style={{ backgroundColor: line }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN FORM
// -----------------------------------------------------------------------------

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { setUser, setUserRole } =
    useAuthStore();

  const { showAlert } = useAlertStore();

  // ---------------------------------------------------------------------------
  // INITIAL ROLE
  // ---------------------------------------------------------------------------

  const initialRole =
    searchParams.get('role');

  const startingStep: Step =
    initialRole === 'patient' ||
    initialRole === 'doctor'
      ? 'phone'
      : 'role';

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [loading, setLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [step, setStep] =
    useState<Step>(startingStep);

  const [role, setRole] =
    useState<Role>(
      initialRole === 'doctor'
        ? 'doctor'
        : 'patient'
    );

  // Contact
  const [phone, setPhone] =
    useState('');

  // Account
  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [name, setName] =
    useState('');

  // Patient
  const [age, setAge] =
    useState('');

  const [gender, setGender] =
    useState<'male' | 'female' | 'other'>(
      'other'
    );

  // Doctor
  const [specialization, setSpecialization] =
    useState('');

  const [degree, setDegree] =
    useState('');

  const [experience, setExperience] =
    useState('');

  const [registrationNumber, setRegistrationNumber] =
    useState('');

  const [clinicName, setClinicName] =
    useState('');

  const [clinicAddress, setClinicAddress] =
    useState('');

  const [fees, setFees] =
    useState(DEFAULT_FEE);

  // Cloudinary URLs
  const [documentUrls, setDocumentUrls] =
    useState<
      Record<DocumentKey, string>
    >({
      medicalDegree: '',
      registrationCertificate: '',
      aadharCard: '',
      profilePhoto: '',
    });

  // ---------------------------------------------------------------------------
  // CHANGE ROLE
  // ---------------------------------------------------------------------------

  const goToRole = (nextRole: Role) => {
    setRole(nextRole);

    router.push(
      `/auth/signup?role=${nextRole}`
    );
  };

  // ---------------------------------------------------------------------------
  // CHECK PHONE
  // ---------------------------------------------------------------------------

  const handleCheckPhone = async () => {
    const cleanPhone =
      phone.replace(/\D/g, '');

    if (!isValidIndianPhone(cleanPhone)) {
      showAlert(
        'Phone required',
        'Please enter a valid 10-digit mobile number.',
        'warning'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        '/api/check-phone',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            phone: cleanPhone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          'Phone check failed.'
        );
      }

      const data =
        await response.json();

      if (data.exists) {
        showAlert(
          'Account exists',
          'This phone number already has an account. Please log in instead.',
          'warning'
        );

        router.push('/auth/login');
        return;
      }

      setPhone(cleanPhone);
      setStep('details');
    } catch (error) {
      console.error(
        'Phone check error:',
        error
      );

      showAlert(
        'Service error',
        'Failed to check account status. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // UPLOAD DOCUMENT
  // ---------------------------------------------------------------------------

  const handleFileUpload = async (
    file: File,
    type: DocumentKey
  ) => {
    setUploading(true);

    try {
      const url =
        await uploadToCloudinary(
          file,
          type
        );

      setDocumentUrls(
        (previous) => ({
          ...previous,
          [type]: url,
        })
      );

      showAlert(
        'Uploaded',
        'File uploaded successfully.',
        'success'
      );
    } catch (error) {
      console.error(
        'File upload error:',
        error
      );

      showAlert(
        'Upload failed',
        error instanceof Error
          ? error.message
          : 'Could not upload file.',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // VALIDATE
  // ---------------------------------------------------------------------------

  const validateSignup = () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !phone.trim()
    ) {
      showAlert(
        'Incomplete form',
        'Please fill in all required fields.',
        'warning'
      );

      return false;
    }

    if (password.length < 6) {
      showAlert(
        'Weak password',
        'Password must contain at least 6 characters.',
        'warning'
      );

      return false;
    }

    if (role === 'patient') {
      const numericAge =
        Number(age);

      if (
        age &&
        (!Number.isInteger(
          numericAge
        ) ||
          numericAge < 1 ||
          numericAge > 120)
      ) {
        showAlert(
          'Invalid age',
          'Please enter a valid age.',
          'warning'
        );

        return false;
      }
    }

    if (role === 'doctor') {
      if (
        !specialization.trim() ||
        !degree.trim() ||
        !registrationNumber.trim()
      ) {
        showAlert(
          'Missing details',
          'Please fill in all required professional details.',
          'warning'
        );

        return false;
      }

      if (
        !documentUrls.medicalDegree ||
        !documentUrls.registrationCertificate ||
        !documentUrls.aadharCard
      ) {
        showAlert(
          'Documents required',
          'Please upload your medical degree, registration certificate and Aadhaar card.',
          'warning'
        );

        return false;
      }
    }

    return true;
  };

  // ---------------------------------------------------------------------------
  // CREATE ACCOUNT
  // ---------------------------------------------------------------------------

  const handleSignup = async () => {
    if (!validateSignup()) {
      return;
    }

    setLoading(true);

    try {
      // -----------------------------------------------------------------------
      // FIREBASE AUTH
      // -----------------------------------------------------------------------

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const userId =
        userCredential.user.uid;

      // Update auth store immediately
      setUser(
        userCredential.user
      );

      setUserRole(role);

      const now =
        Timestamp.now();

      // -----------------------------------------------------------------------
      // DOCTOR
      // -----------------------------------------------------------------------

      if (role === 'doctor') {
        const safeExperience =
          Number.parseInt(
            experience,
            10
          );

        const safeFee =
          Number.parseFloat(fees);

        const doctorData = {
          uid: userId,

          email: email.trim(),

          name: name.trim(),

          phone: phone.trim(),

          phoneVerified: true,

          role: 'doctor',

          specialization:
            specialization.trim(),

          specialty:
            specialization.trim(),

          degree:
            degree.trim(),

          qualifications:
            degree.trim(),

          experience:
            Number.isNaN(
              safeExperience
            )
              ? 0
              : safeExperience,

          registrationNumber:
            registrationNumber.trim(),

          clinicName:
            clinicName.trim(),

          clinicAddress:
            clinicAddress.trim(),

          address:
            clinicAddress.trim(),

          fees:
            Number.isNaN(safeFee)
              ? Number(DEFAULT_FEE)
              : safeFee,

          consultationFee:
            Number.isNaN(safeFee)
              ? Number(DEFAULT_FEE)
              : safeFee,

          // -------------------------------------------------------------------
          // CLOUDINARY URLS ONLY
          // -------------------------------------------------------------------

          documents: {
            medicalDegree:
              documentUrls.medicalDegree,

            registrationCertificate:
              documentUrls.registrationCertificate,

            aadharCard:
              documentUrls.aadharCard,

            profilePhoto:
              documentUrls.profilePhoto,
          },

          profilePic:
            documentUrls.profilePhoto,

          photoURL:
            documentUrls.profilePhoto,

          // Verification
          verified: false,

          verificationStatus:
            'pending',

          verificationMessage:
            'Thank you for registering! Our team will contact you on WhatsApp in 2-3 business days to continue the onboarding process.',

          // Status
          online: false,

          isOnline: false,

          autoApprove: false,

          // Stats
          rating: 0,

          totalPatients: 0,

          // Working schedule
          workingDays: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ],

          startTime:
            '9:00 AM',

          endTime:
            '6:00 PM',

          createdAt: now,

          submittedAt: now,

          updatedAt: now,
        };

        // ---------------------------------------------------------------------
        // DOCTOR DOCUMENT
        // ---------------------------------------------------------------------

        await setDoc(
          doc(
            db,
            'doctors',
            userId
          ),
          doctorData
        );

        // ---------------------------------------------------------------------
        // USERS DOCUMENT
        // ---------------------------------------------------------------------

        await setDoc(
          doc(
            db,
            'users',
            userId
          ),
          {
            uid: userId,

            email:
              email.trim(),

            name:
              name.trim(),

            phone:
              phone.trim(),

            phoneVerified: true,

            role: 'doctor',

            profilePic:
              documentUrls.profilePhoto,

            photoURL:
              documentUrls.profilePhoto,

            verificationStatus:
              'pending',

            createdAt: now,

            updatedAt: now,
          }
        );

        // ---------------------------------------------------------------------
        // REDIRECT
        // ---------------------------------------------------------------------

        router.replace(
          '/doctor/verification-pending'
        );

        return;
      }

      // -----------------------------------------------------------------------
      // PATIENT
      // -----------------------------------------------------------------------

      const numericAge =
        Number.parseInt(
          age,
          10
        );

      await setDoc(
        doc(
          db,
          'users',
          userId
        ),
        {
          uid: userId,

          email:
            email.trim(),

          name:
            name.trim(),

          phone:
            phone.trim(),

          phoneVerified: true,

          role: 'patient',

          age:
            Number.isNaN(
              numericAge
            )
              ? null
              : numericAge,

          gender,

          createdAt: now,

          updatedAt: now,
        }
      );

      // -----------------------------------------------------------------------
      // REDIRECT
      // -----------------------------------------------------------------------

      router.replace(
        '/patient/home'
      );
    } catch (error: any) {
      console.error(
        'Signup error:',
        error
      );

      if (
        error?.code ===
        'auth/email-already-in-use'
      ) {
        showAlert(
          'Email in use',
          'That email is already registered. Please sign in instead.',
          'warning'
        );
      } else if (
        error?.code ===
        'auth/invalid-email'
      ) {
        showAlert(
          'Invalid email',
          'Please enter a valid email address.',
          'warning'
        );
      } else if (
        error?.code ===
        'auth/weak-password'
      ) {
        showAlert(
          'Weak password',
          'Password should be at least 6 characters.',
          'warning'
        );
      } else if (
        error?.code ===
        'auth/network-request-failed'
      ) {
        showAlert(
          'Network error',
          'Please check your internet connection and try again.',
          'error'
        );
      } else {
        showAlert(
          'Signup failed',
          error?.message ||
            'Something went wrong while creating your account.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EYEBROW
  // ---------------------------------------------------------------------------

  const eyebrowForStep: Record<
    Step,
    string
  > = {
    role: 'New Registration',

    phone:
      role === 'doctor'
        ? 'Practitioner Registration · Contact'
        : 'Patient Registration · Contact',

    details:
      role === 'doctor'
        ? 'Practitioner Registration · Details'
        : 'Patient Registration · Details',

    documents:
      'Practitioner Registration · Attachments',

    review:
      role === 'doctor'
        ? 'Practitioner Registration · Review'
        : 'Patient Registration · Review',
  };

  // ---------------------------------------------------------------------------
  // FILE ACCEPT
  // ---------------------------------------------------------------------------

  const getAcceptType = (
    key: DocumentKey
  ) => {
    if (key === 'profilePhoto') {
      return 'image/jpeg,image/png,image/webp';
    }

    return 'image/jpeg,image/png,image/webp,application/pdf';
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{
        backgroundColor: paper,
      }}
    >
      <div
        className={`w-full max-w-xl ${sans.className}`}
        style={{ color: ink }}
      >
        {/* ------------------------------------------------------------------ */}
        {/* LETTERHEAD                                                         */}
        {/* ------------------------------------------------------------------ */}

        <div
          className="flex items-end justify-between pb-4 mb-6 border-b-2"
          style={{
            borderColor: ink,
          }}
        >
          <div className="flex items-center gap-3">
            <svg
              width="26"
              height="26"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M50 50 L100 150 L150 50 L170 70 L100 180 L30 70 Z"
                stroke={ink}
                strokeWidth="14"
                fill="none"
              />
            </svg>

            <span
              className={`${serif.className} text-xl font-semibold tracking-tight`}
            >
              My Health
            </span>
          </div>

          <Eyebrow>
            {eyebrowForStep[step]}
          </Eyebrow>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CARD                                                               */}
        {/* ------------------------------------------------------------------ */}

        <div
          className="bg-white border rounded-sm p-6 sm:p-9"
          style={{
            borderColor: line,
            boxShadow:
              '0 1px 3px rgba(20,50,46,0.06)',
          }}
        >
          {step !== 'role' && (
            <StepRail
              role={role}
              step={step}
            />
          )}

          {/* ================================================================ */}
          {/* ROLE                                                              */}
          {/* ================================================================ */}

          {step === 'role' && (
            <div className="space-y-6">
              <div>
                <h1
                  className={`${serif.className} text-2xl font-semibold mb-1`}
                >
                  Who&apos;s registering today?
                </h1>

                <p
                  className="text-sm"
                  style={{
                    color: inkMuted,
                  }}
                >
                  Choose the account type
                  that matches how you&apos;ll
                  use My Health.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    r: 'patient' as Role,
                    glyph: 'P',
                    title: 'Patient',
                    desc: 'Book and manage appointments',
                  },
                  {
                    r: 'doctor' as Role,
                    glyph: 'D',
                    title: 'Doctor',
                    desc: 'Manage a practice and patients',
                  },
                ].map(
                  ({
                    r,
                    glyph,
                    title,
                    desc,
                  }) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        goToRole(r)
                      }
                      className="group text-left p-5 border rounded-sm transition-colors"
                      style={{
                        borderColor: line,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          sage;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          line;
                      }}
                    >
                      <div
                        className={`${serif.className} w-10 h-10 rounded-full border flex items-center justify-center text-lg mb-4`}
                        style={{
                          borderColor: ink,
                          color: ink,
                        }}
                      >
                        {glyph}
                      </div>

                      <p className="font-semibold text-[15px]">
                        {title}
                      </p>

                      <p
                        className="text-xs mt-1"
                        style={{
                          color: inkMuted,
                        }}
                      >
                        {desc}
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* PHONE                                                             */}
          {/* ================================================================ */}

          {step === 'phone' && (
            <div className="space-y-6">
              <div>
                <h1
                  className={`${serif.className} text-2xl font-semibold mb-1`}
                >
                  Your mobile number
                </h1>

                <p
                  className="text-sm"
                  style={{
                    color: inkMuted,
                  }}
                >
                  We&apos;ll use this to reach
                  you about your account and
                  appointments.
                </p>
              </div>

              <Field
                label="Mobile number"
                hint="Enter a 10-digit Indian mobile number"
              >
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 10)
                    )
                  }
                  className={`${underlineInput} ${mono.className}`}
                  style={{
                    borderColor:
                      phone &&
                      !isValidIndianPhone(
                        phone
                      )
                        ? stamp
                        : line,
                  }}
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                />

                {phone &&
                  !isValidIndianPhone(
                    phone
                  ) && (
                    <p
                      className="text-xs mt-1.5"
                      style={{
                        color: stamp,
                      }}
                    >
                      Please enter a valid
                      10-digit number
                    </p>
                  )}
              </Field>

              <button
                type="button"
                onClick={
                  handleCheckPhone
                }
                disabled={
                  loading ||
                  !isValidIndianPhone(
                    phone
                  )
                }
                className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                style={{
                  backgroundColor: ink,
                  color: paper,
                }}
              >
                {loading
                  ? 'Checking account…'
                  : 'Continue'}
              </button>
            </div>
          )}

          {/* ================================================================ */}
          {/* DETAILS                                                           */}
          {/* ================================================================ */}

          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <h1
                  className={`${serif.className} text-2xl font-semibold`}
                >
                  {role === 'doctor'
                    ? 'Professional details'
                    : 'Personal details'}
                </h1>
              </div>

              {/* NAME */}

              <Field label="Full name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  className={underlineInput}
                  style={{
                    borderColor: line,
                  }}
                  placeholder="Aashish Gupta"
                />
              </Field>

              {/* EMAIL */}

              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  className={underlineInput}
                  style={{
                    borderColor: line,
                  }}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </Field>

              {/* PASSWORD */}

              <Field
                label="Password"
                hint="Minimum 6 characters"
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  className={underlineInput}
                  style={{
                    borderColor: line,
                  }}
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                />
              </Field>

              {/* PATIENT */}

              {role === 'patient' ? (
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Age">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) =>
                        setAge(
                          e.target.value
                        )
                      }
                      className={
                        underlineInput
                      }
                      style={{
                        borderColor: line,
                      }}
                      placeholder="25"
                    />
                  </Field>

                  <Field label="Gender">
                    <select
                      value={gender}
                      onChange={(e) =>
                        setGender(
                          e.target
                            .value as
                            | 'male'
                            | 'female'
                            | 'other'
                        )
                      }
                      className={`${underlineInput} bg-transparent`}
                      style={{
                        borderColor: line,
                      }}
                    >
                      <option value="male">
                        Male
                      </option>

                      <option value="female">
                        Female
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>
                  </Field>
                </div>
              ) : (
                <>
                  {/* SPECIALIZATION */}

                  <Field label="Specialization">
                    <input
                      type="text"
                      value={
                        specialization
                      }
                      onChange={(e) =>
                        setSpecialization(
                          e.target.value
                        )
                      }
                      className={
                        underlineInput
                      }
                      style={{
                        borderColor: line,
                      }}
                      placeholder="e.g. Cardiologist, Dermatologist"
                    />
                  </Field>

                  {/* DEGREE */}

                  <Field label="Degree">
                    <input
                      type="text"
                      value={degree}
                      onChange={(e) =>
                        setDegree(
                          e.target.value
                        )
                      }
                      className={
                        underlineInput
                      }
                      style={{
                        borderColor: line,
                      }}
                      placeholder="e.g. MBBS, MD"
                    />
                  </Field>

                  {/* REGISTRATION */}

                  <Field label="Medical registration number">
                    <input
                      type="text"
                      value={
                        registrationNumber
                      }
                      onChange={(e) =>
                        setRegistrationNumber(
                          e.target.value
                        )
                      }
                      className={`${underlineInput} ${mono.className}`}
                      style={{
                        borderColor: line,
                      }}
                      placeholder="MCI / State registration no."
                    />
                  </Field>

                  {/* EXPERIENCE + FEE */}

                  <div className="grid grid-cols-2 gap-6">
                    <Field label="Experience (years)">
                      <input
                        type="number"
                        min="0"
                        value={
                          experience
                        }
                        onChange={(e) =>
                          setExperience(
                            e.target.value
                          )
                        }
                        className={
                          underlineInput
                        }
                        style={{
                          borderColor:
                            line,
                        }}
                        placeholder="5"
                      />
                    </Field>

                    <Field label="Consultation fee (₹)">
                      <input
                        type="number"
                        min="0"
                        value={fees}
                        onChange={(e) =>
                          setFees(
                            e.target.value
                          )
                        }
                        className={
                          underlineInput
                        }
                        style={{
                          borderColor:
                            line,
                        }}
                        placeholder={
                          DEFAULT_FEE
                        }
                      />
                    </Field>
                  </div>

                  {/* CLINIC NAME */}

                  <Field label="Clinic name">
                    <input
                      type="text"
                      value={
                        clinicName
                      }
                      onChange={(e) =>
                        setClinicName(
                          e.target.value
                        )
                      }
                      className={
                        underlineInput
                      }
                      style={{
                        borderColor: line,
                      }}
                      placeholder="Your clinic name"
                    />
                  </Field>

                  {/* CLINIC ADDRESS */}

                  <Field label="Clinic address">
                    <textarea
                      value={
                        clinicAddress
                      }
                      onChange={(e) =>
                        setClinicAddress(
                          e.target.value
                        )
                      }
                      className="w-full bg-transparent border rounded-sm px-3 py-2.5 text-[15px] outline-none min-h-[80px] transition-colors"
                      style={{
                        borderColor: line,
                      }}
                      placeholder="Full clinic address"
                    />
                  </Field>
                </>
              )}

              {/* BUTTONS */}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !name.trim() ||
                      !email.trim() ||
                      !password
                    ) {
                      showAlert(
                        'Incomplete form',
                        'Please fill in your name, email and password.',
                        'warning'
                      );
                      return;
                    }

                    if (
                      password.length <
                      6
                    ) {
                      showAlert(
                        'Weak password',
                        'Password must be at least 6 characters.',
                        'warning'
                      );
                      return;
                    }

                    if (
                      role === 'doctor' &&
                      (!specialization.trim() ||
                        !degree.trim() ||
                        !registrationNumber.trim())
                    ) {
                      showAlert(
                        'Missing details',
                        'Please fill in all professional details.',
                        'warning'
                      );
                      return;
                    }

                    setStep(
                      role === 'doctor'
                        ? 'documents'
                        : 'review'
                    );
                  }}
                  disabled={
                    !name.trim() ||
                    !email.trim() ||
                    !password
                  }
                  className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                  style={{
                    backgroundColor: ink,
                    color: paper,
                  }}
                >
                  Continue
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStep('phone')
                  }
                  className="text-sm self-center"
                  style={{
                    color: inkMuted,
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* DOCUMENTS                                                         */}
          {/* ================================================================ */}

          {step === 'documents' &&
            role === 'doctor' && (
              <div className="space-y-6">
                <div>
                  <h1
                    className={`${serif.className} text-2xl font-semibold mb-1`}
                  >
                    Attachments
                  </h1>

                  <p
                    className="text-sm"
                    style={{
                      color: inkMuted,
                    }}
                  >
                    Required for KYC
                    verification. Our team
                    reviews these manually.
                  </p>
                </div>

                {[
                  {
                    key: 'medicalDegree' as DocumentKey,
                    label:
                      'Medical degree certificate',
                    required: true,
                  },

                  {
                    key: 'registrationCertificate' as DocumentKey,
                    label:
                      'Medical registration certificate',
                    required: true,
                  },

                  {
                    key: 'aadharCard' as DocumentKey,
                    label:
                      'Aadhaar card',
                    required: true,
                  },

                  {
                    key: 'profilePhoto' as DocumentKey,
                    label:
                      'Profile photo',
                    required: false,
                  },
                ].map(
                  (
                    {
                      key,
                      label,
                      required,
                    },
                    idx
                  ) => (
                    <div
                      key={key}
                      className="border rounded-sm p-4 relative"
                      style={{
                        borderColor: line,
                        borderStyle:
                          documentUrls[
                            key
                          ]
                            ? 'solid'
                            : 'dashed',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Eyebrow>
                            Attachment{' '}
                            {String(
                              idx + 1
                            ).padStart(
                              2,
                              '0'
                            )}
                          </Eyebrow>

                          <p className="text-sm font-medium mt-1">
                            {label}

                            {required && (
                              <span
                                style={{
                                  color:
                                    stamp,
                                }}
                              >
                                {' '}
                                *
                              </span>
                            )}
                          </p>
                        </div>

                        {documentUrls[
                          key
                        ] && (
                          <Stamp
                            label="Attached"
                            tone="sage"
                          />
                        )}
                      </div>

                      <input
                        type="file"
                        accept={getAcceptType(
                          key
                        )}
                        onChange={async (
                          e
                        ) => {
                          const file =
                            e.target
                              .files?.[0];

                          if (!file)
                            return;

                          await handleFileUpload(
                            file,
                            key
                          );

                          e.target.value =
                            '';
                        }}
                        disabled={
                          uploading
                        }
                        className={`${mono.className} w-full text-xs mt-3`}
                        style={{
                          color:
                            inkMuted,
                        }}
                      />

                      {documentUrls[
                        key
                      ] && (
                        <p className="text-[10px] mt-2 text-gray-400 break-all">
                          Cloudinary upload
                          complete
                        </p>
                      )}
                    </div>
                  )
                )}

                {uploading && (
                  <p
                    className={`${mono.className} text-xs text-center uppercase tracking-[0.1em]`}
                    style={{
                      color: inkMuted,
                    }}
                  >
                    Uploading to
                    Cloudinary…
                  </p>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setStep('review')
                    }
                    disabled={
                      !documentUrls.medicalDegree ||
                      !documentUrls.registrationCertificate ||
                      !documentUrls.aadharCard ||
                      uploading
                    }
                    className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                    style={{
                      backgroundColor: ink,
                      color: paper,
                    }}
                  >
                    Continue to review
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStep('details')
                    }
                    className="text-sm self-center"
                    style={{
                      color: inkMuted,
                    }}
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}

          {/* ================================================================ */}
          {/* REVIEW                                                            */}
          {/* ================================================================ */}

          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1
                    className={`${serif.className} text-2xl font-semibold mb-1`}
                  >
                    Review & submit
                  </h1>

                  <p
                    className="text-sm"
                    style={{
                      color: inkMuted,
                    }}
                  >
                    Please verify your
                    information before
                    submitting.
                  </p>
                </div>

                {role === 'doctor' && (
                  <Stamp
                    label="Pending review"
                    tone="ink"
                  />
                )}
              </div>

              {/* BASIC DETAILS */}

              <div
                className="border rounded-sm divide-y"
                style={{
                  borderColor: line,
                }}
              >
                {[
                  ['Name', name],

                  ['Email', email],

                  [
                    'Phone',
                    formatPhoneNumber(
                      phone
                    ),
                  ],

                  ...(role === 'doctor'
                    ? [
                        [
                          'Specialization',
                          specialization,
                        ],
                        [
                          'Degree',
                          degree,
                        ],
                        [
                          'Registration number',
                          registrationNumber,
                        ],
                        [
                          'Experience',
                          experience
                            ? `${experience} years`
                            : 'Not specified',
                        ],
                        [
                          'Consultation fee',
                          fees
                            ? `₹${fees}`
                            : `₹${DEFAULT_FEE}`,
                        ],
                        [
                          'Clinic',
                          clinicName ||
                            'Not specified',
                        ],
                      ]
                    : [
                        [
                          'Age',
                          age ||
                            'Not specified',
                        ],
                        [
                          'Gender',
                          gender,
                        ],
                      ]),
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <span
                        className={`${mono.className} text-[11px] uppercase tracking-[0.1em]`}
                        style={{
                          color:
                            inkMuted,
                        }}
                      >
                        {label}
                      </span>

                      <span className="text-sm font-medium text-right break-words">
                        {value}
                      </span>
                    </div>
                  )
                )}

                {role === 'doctor' && (
                  <div className="px-4 py-3">
                    <span
                      className={`${mono.className} text-[11px] uppercase tracking-[0.1em]`}
                      style={{
                        color:
                          inkMuted,
                      }}
                    >
                      Attachments
                    </span>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {documentUrls.medicalDegree && (
                        <Stamp
                          label="Degree"
                          tone="sage"
                        />
                      )}

                      {documentUrls.registrationCertificate && (
                        <Stamp
                          label="Registration"
                          tone="sage"
                        />
                      )}

                      {documentUrls.aadharCard && (
                        <Stamp
                          label="Aadhaar"
                          tone="sage"
                        />
                      )}

                      {documentUrls.profilePhoto && (
                        <Stamp
                          label="Photo"
                          tone="sage"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* DOCTOR NOTICE */}

              {role === 'doctor' && (
                <div
                  className="border-l-2 pl-4 py-1"
                  style={{
                    borderColor: stamp,
                  }}
                >
                  <p
                    className="text-sm"
                    style={{
                      color: inkMuted,
                    }}
                  >
                    Your account will be
                    verified in{' '}
                    <strong
                      style={{
                        color: ink,
                      }}
                    >
                      2-3
                    </strong>{' '}
                    business days.
                  </p>
                </div>
              )}

              {/* SUBMIT */}

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    handleSignup
                  }
                  disabled={
                    loading ||
                    uploading
                  }
                  className={`${mono.className} w-full py-3.5 rounded-sm text-sm uppercase tracking-[0.12em] font-medium transition-opacity disabled:opacity-40`}
                  style={{
                    backgroundColor: ink,
                    color: paper,
                  }}
                >
                  {loading
                    ? 'Creating account…'
                    : 'Create account'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStep(
                      role === 'doctor'
                        ? 'documents'
                        : 'details'
                    )
                  }
                  disabled={loading}
                  className="text-sm self-center"
                  style={{
                    color: inkMuted,
                  }}
                >
                  ← Back to edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* LOGIN                                                               */}
        {/* ------------------------------------------------------------------ */}

        <p
          className="text-center text-sm mt-6"
          style={{
            color: inkMuted,
          }}
        >
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-semibold underline"
            style={{
              color: sage,
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PAGE
// -----------------------------------------------------------------------------

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            backgroundColor: paper,
          }}
        >
          <div
            className={`${mono.className} text-sm uppercase tracking-[0.14em]`}
            style={{
              color: inkMuted,
            }}
          >
            Loading…
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
