'use client';

import { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  User,
  Mail,
  Stethoscope,
  MapPin,
  DollarSign,
  Camera,
  CheckCircle,
  Briefcase,
  GraduationCap,
  Building,
} from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';

interface ProfileData {
  name: string;
  email: string;
  specialization: string;
  experience: string;
  consultationFee: string;
  degree: string;
  university: string;
  clinicName: string;
  clinicAddress: string;
  about: string;
  profilePic: string;
  online: boolean;
}

export default function Profile() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    specialization: '',
    experience: '',
    consultationFee: '',
    degree: '',
    university: '',
    clinicName: '',
    clinicAddress: '',
    about: '',
    profilePic: '',
    online: true,
  });

  // --------------------------------------------------
  // FETCH PROFILE
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const doctorRef = doc(db, 'doctors', user.uid);
        const doctorSnap = await getDoc(doctorRef);

        let data: Record<string, any> = {};

        if (doctorSnap.exists()) {
          data = doctorSnap.data();
        } else {
          // Fallback to users document
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            data = userSnap.data();
          }
        }

        setProfile({
          name: data.name || '',
          email: data.email || user.email || '',

          specialization:
            data.specialization ||
            data.specialty ||
            '',

          experience:
            data.experience !== undefined &&
            data.experience !== null
              ? String(data.experience)
              : '',

          consultationFee:
            data.consultationFee !== undefined &&
            data.consultationFee !== null
              ? String(data.consultationFee)
              : data.fees !== undefined &&
                data.fees !== null
              ? String(data.fees)
              : '',

          degree:
            data.degree ||
            data.qualifications ||
            '',

          university:
            data.university ||
            data.college ||
            '',

          clinicName:
            data.clinicName ||
            '',

          clinicAddress:
            data.clinicAddress ||
            data.address ||
            '',

          about:
            data.about ||
            data.bio ||
            '',

          profilePic:
            data.profilePic ||
            data.photoURL ||
            '',

          online:
            data.online !== false,
        });
      } catch (error) {
        console.error('Error loading doctor profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid, user?.email]);

  // --------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append('file', file);

      // IMPORTANT:
      // Make sure this is an UNSIGNED Cloudinary upload preset.
      formData.append(
        'upload_preset',
        'PRESCRIPTIONS'
      );

      formData.append(
        'folder',
        'profiles'
      );

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/vrgpf6co/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          'Cloudinary error:',
          data
        );

        throw new Error(
          data?.error?.message ||
            'Image upload failed'
        );
      }

      if (!data.secure_url) {
        throw new Error(
          'Cloudinary did not return an image URL'
        );
      }

      // IMPORTANT:
      // Use functional state update so we don't overwrite
      // other profile changes with stale state.
      setProfile((prev) => ({
        ...prev,
        profilePic: data.secure_url,
      }));

      console.log(
        'Profile image uploaded:',
        data.secure_url
      );
    } catch (error) {
      console.error(
        'Upload error:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Could not upload image'
      );
    } finally {
      setUploading(false);

      // Allow selecting the same image again
      e.target.value = '';
    }
  };

  // --------------------------------------------------
  // SAVE PROFILE
  // --------------------------------------------------

  const handleSave = async () => {
    if (!user?.uid) {
      alert('You are not logged in.');
      return;
    }

    setSaving(true);

    try {
      const doctorRef = doc(
        db,
        'doctors',
        user.uid
      );

      const userRef = doc(
        db,
        'users',
        user.uid
      );

      const experience =
        Number.parseInt(
          profile.experience,
          10
        );

      const consultationFee =
        Number.parseFloat(
          profile.consultationFee
        );

      const safeExperience =
        Number.isNaN(experience)
          ? 0
          : experience;

      const safeConsultationFee =
        Number.isNaN(consultationFee)
          ? 0
          : consultationFee;

      // ----------------------------------------------
      // DOCTOR DOCUMENT
      // ----------------------------------------------

      const doctorUpdateData = {
        name: profile.name.trim(),

        email:
          profile.email ||
          user.email ||
          '',

        specialization:
          profile.specialization.trim(),

        // Keep both names for compatibility
        specializationLegacy:
          profile.specialization.trim(),

        specialty:
          profile.specialization.trim(),

        experience:
          safeExperience,

        consultationFee:
          safeConsultationFee,

        fees:
          safeConsultationFee,

        degree:
          profile.degree.trim(),

        qualifications:
          profile.degree.trim(),

        university:
          profile.university.trim(),

        college:
          profile.university.trim(),

        clinicName:
          profile.clinicName.trim(),

        clinicAddress:
          profile.clinicAddress.trim(),

        address:
          profile.clinicAddress.trim(),

        about:
          profile.about.trim(),

        bio:
          profile.about.trim(),

        profilePic:
          profile.profilePic,

        photoURL:
          profile.profilePic,

        online:
          profile.online,

        isOnline:
          profile.online,

        updatedAt:
          Timestamp.now(),
      };

      console.log(
        'Saving doctor profile:',
        doctorUpdateData
      );

      // THIS is the important Firestore write
      await setDoc(
        doctorRef,
        doctorUpdateData,
        {
          merge: true,
        }
      );

      console.log(
        'Doctor profile saved successfully!'
      );

      // ----------------------------------------------
      // USERS DOCUMENT
      // ----------------------------------------------

      try {
        await setDoc(
          userRef,
          {
            name:
              profile.name.trim(),

            profilePic:
              profile.profilePic,

            updatedAt:
              Timestamp.now(),
          },
          {
            merge: true,
          }
        );

        console.log(
          'Shared user profile updated!'
        );
      } catch (userError) {
        // The doctor profile is already saved,
        // so don't fail the whole operation.
        console.error(
          'Could not update users document:',
          userError
        );
      }

      // ----------------------------------------------
      // VERIFY SAVE
      // ----------------------------------------------

      const verifySnap =
        await getDoc(doctorRef);

      if (!verifySnap.exists()) {
        throw new Error(
          'Profile was saved but could not be verified.'
        );
      }

      const savedData =
        verifySnap.data();

      console.log(
        'Verified Firestore profile:',
        savedData
      );

      // Update local state using exactly what
      // Firestore saved.
      setProfile((prev) => ({
        ...prev,

        name:
          savedData.name || '',

        email:
          savedData.email ||
          user.email ||
          '',

        specialization:
          savedData.specialization ||
          savedData.specialty ||
          '',

        experience:
          String(
            savedData.experience ?? ''
          ),

        consultationFee:
          String(
            savedData.consultationFee ??
              savedData.fees ??
              ''
          ),

        degree:
          savedData.degree ||
          savedData.qualifications ||
          '',

        university:
          savedData.university ||
          savedData.college ||
          '',

        clinicName:
          savedData.clinicName ||
          '',

        clinicAddress:
          savedData.clinicAddress ||
          savedData.address ||
          '',

        about:
          savedData.about ||
          savedData.bio ||
          '',

        profilePic:
          savedData.profilePic ||
          savedData.photoURL ||
          '',

        online:
          savedData.online !== false,
      }));

      setEditing(false);

      alert('Profile saved successfully! ✅');
    } catch (error) {
      console.error(
        'PROFILE SAVE ERROR:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error';

      alert(
        `Could not save profile.\n\n${message}`
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // INPUT CLASS
  // --------------------------------------------------

  const inputClass = (
    disabled: boolean
  ) =>
    `w-full h-12 bg-white border-2 border-black px-4 text-sm focus:outline-none ${
      disabled
        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
        : ''
    }`;

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-svh bg-white">
        <DoctorSidebar />

        <div className="px-4 py-8 max-w-4xl mx-auto space-y-6">
          <div className="h-32 w-32 border-2 border-black bg-gray-100 mx-auto md:mx-0" />

          <div className="h-24 border-2 border-black bg-gray-100" />

          <div className="h-24 border-2 border-black bg-gray-100" />
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-svh bg-white text-black">
      <DoctorSidebar />

      <div className="px-4 py-6 max-w-4xl mx-auto lg:px-8 space-y-8 pb-12">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Profile
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Your public details and clinic information
            </p>
          </div>

          <button
            type="button"
            onClick={
              editing
                ? handleSave
                : () => setEditing(true)
            }
            disabled={
              saving ||
              uploading
            }
            className="h-12 px-6 bg-black text-white text-sm font-bold uppercase tracking-wide disabled:opacity-50"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />

                Saving...
              </div>
            ) : editing ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />

                Save changes
              </div>
            ) : (
              'Edit profile'
            )}
          </button>
        </div>

        {/* MAIN GRID */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT SIDEBAR */}

          <div className="lg:col-span-4 space-y-6">

            {/* PROFILE CARD */}

            <div className="border-2 border-black p-6 flex flex-col items-center text-center">

              <div className="relative mb-4">

                <div className="w-28 h-28 border-2 border-black overflow-hidden bg-gray-100">

                  {profile.profilePic ? (
                    <img
                      src={profile.profilePic}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User
                        size={40}
                        className="text-gray-400"
                      />
                    </div>
                  )}

                </div>

                {editing && (
                  <label className="absolute -bottom-2 -right-2 w-9 h-9 border-2 border-black bg-black text-white flex items-center justify-center cursor-pointer">

                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleImageUpload
                      }
                      className="hidden"
                      disabled={
                        uploading
                      }
                    />

                  </label>
                )}

              </div>

              <h2 className="text-lg font-bold mb-1">
                {profile.name
                  ? `Dr. ${profile.name}`
                  : 'Add your name'}
              </h2>

              <p className="text-sm text-gray-500 mb-4">
                {profile.specialization ||
                  'Healthcare professional'}
              </p>

              <div className="w-full pt-4 border-t-2 border-black flex flex-col gap-2">

                <div className="flex items-center justify-between">

                  <span className="text-xs font-bold text-gray-500 uppercase">
                    Status
                  </span>

                  <span className="text-xs font-bold flex items-center gap-1.5">

                    <span
                      className={`w-2 h-2 ${
                        profile.online
                          ? 'bg-black'
                          : 'bg-gray-300'
                      }`}
                    />

                    {profile.online
                      ? 'Online'
                      : 'Offline'}

                  </span>

                </div>

                {editing && (
                  <button
                    type="button"
                    onClick={() =>
                      setProfile(
                        (prev) => ({
                          ...prev,
                          online:
                            !prev.online,
                        })
                      )
                    }
                    className="mt-2 w-full py-2 border-2 border-black text-xs font-bold uppercase"
                  >
                    Switch to{' '}
                    {profile.online
                      ? 'offline'
                      : 'online'}
                  </button>
                )}

              </div>

            </div>

            {/* ABOUT */}

            <div className="border-2 border-black p-6">

              <h3 className="text-sm font-bold uppercase tracking-wide mb-3">
                About
              </h3>

              <textarea
                value={profile.about}
                onChange={(e) =>
                  setProfile(
                    (prev) => ({
                      ...prev,
                      about:
                        e.target.value,
                    })
                  )
                }
                disabled={!editing}
                className={`w-full min-h-[140px] text-sm leading-relaxed resize-none focus:outline-none ${
                  editing
                    ? 'border-2 border-black p-3 bg-white'
                    : 'bg-transparent'
                }`}
                placeholder="A short biography..."
              />

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className="lg:col-span-8 space-y-6">

            {/* PROFESSIONAL INFO */}

            <div className="border-2 border-black p-6 md:p-8 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* NAME */}

                <div className="space-y-1">

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <User size={12} />
                    Full name
                  </label>

                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile(
                        (prev) => ({
                          ...prev,
                          name:
                            e.target.value,
                        })
                      )
                    }
                    disabled={!editing}
                    className={inputClass(
                      !editing
                    )}
                    placeholder="John Doe"
                  />

                </div>

                {/* EMAIL */}

                <div className="space-y-1">

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Mail size={12} />
                    Email
                  </label>

                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className={inputClass(
                      true
                    )}
                    placeholder="email@ananthealth.com"
                  />

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SPECIALIZATION */}

                <div className="space-y-1">

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Stethoscope size={12} />
                    Specialization
                  </label>

                  <input
                    type="text"
                    value={
                      profile.specialization
                    }
                    onChange={(e) =>
                      setProfile(
                        (prev) => ({
                          ...prev,
                          specialization:
                            e.target.value,
                        })
                      )
                    }
                    disabled={!editing}
                    className={inputClass(
                      !editing
                    )}
                    placeholder="e.g. Cardiologist"
                  />

                </div>

                {/* EXPERIENCE */}

                <div className="space-y-1">

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Briefcase size={12} />
                    Experience (years)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      profile.experience
                    }
                    onChange={(e) =>
                      setProfile(
                        (prev) => ({
                          ...prev,
                          experience:
                            e.target.value,
                        })
                      )
                    }
                    disabled={!editing}
                    className={inputClass(
                      !editing
                    )}
                    placeholder="10"
                  />

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* DEGREE */}

                <div className="space-y-1">

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <GraduationCap size={12} />
                    Medical degree
                  </label>

                  <input
                    type="text"
                    value={profile.degree}
                    onChange={(e) =>
                      setProfile(
                        (prev) => ({
                          ...prev,
                          degree:
                            e.target.value,
                        })
                      )
                    }
                    disabled={!editing}
                    className={inputClass(
                      !editing
                    )}
                    placeholder="e.g. MBBS, MD"
                  />

                </div>

                {/* FEE */}

                <div className="space-y-1">

                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <DollarSign size={12} />
                    Consultation fee (₹)
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        profile.consultationFee
                      }
                      onChange={(e) =>
                        setProfile(
                          (prev) => ({
                            ...prev,
                            consultationFee:
                              e.target.value,
                          })
                        )
                      }
                      disabled={!editing}
                      className={`${inputClass(
                        !editing
                      )} pl-8`}
                      placeholder="699"
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* CLINIC INFO */}

            <div className="border-2 border-black p-6 md:p-8 space-y-6">

              <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 pb-3 border-b-2 border-black">
                <Building size={16} />
                Clinic location
              </h3>

              {/* CLINIC NAME */}

              <div className="space-y-1">

                <label className="text-xs font-bold text-gray-500 uppercase">
                  Clinic name
                </label>

                <input
                  type="text"
                  value={
                    profile.clinicName
                  }
                  onChange={(e) =>
                    setProfile(
                      (prev) => ({
                        ...prev,
                        clinicName:
                          e.target.value,
                      })
                    )
                  }
                  disabled={!editing}
                  className={inputClass(
                    !editing
                  )}
                  placeholder="e.g. My Health Multispeciality"
                />

              </div>

              {/* ADDRESS */}

              <div className="space-y-1">

                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                  <MapPin size={12} />
                  Full address
                </label>

                <textarea
                  value={
                    profile.clinicAddress
                  }
                  onChange={(e) =>
                    setProfile(
                      (prev) => ({
                        ...prev,
                        clinicAddress:
                          e.target.value,
                      })
                    )
                  }
                  disabled={!editing}
                  className={`w-full min-h-[100px] py-3 px-4 text-sm resize-none focus:outline-none border-2 border-black ${
                    !editing
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-white'
                  }`}
                  placeholder="Street, city, building number, pincode"
                />

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}