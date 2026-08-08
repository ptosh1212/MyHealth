'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import {
  User, Mail, Phone, MapPin, Calendar, Activity,
  Edit, Save, Camera, ShieldCheck, HeartPulse,
  AlertCircle, ChevronRight, UserCircle, Lock
} from 'lucide-react';
import { ProfileSkeleton } from '@/components/SkeletonLoader';

export default function PatientProfile() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    bloodGroup: '',
    address: '',
    emergencyContact: '',
    emergencyName: '',
    allergies: '',
    chronicConditions: '',
    profilePic: '',
  });

  useEffect(() => {
    if (user?.uid) {
      fetchProfile();
    }
  }, [user?.uid]);

  const fetchProfile = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'users', user!.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          name: data.name || '',
          email: data.email || user?.email || '',
          phone: data.phone || '',
          age: String(data.age || ''),
          gender: data.gender || '',
          bloodGroup: data.bloodGroup || '',
          address: typeof data.address === 'object' ? data.address.formatted || '' : data.address || '',
          emergencyContact: data.emergencyContact || '',
          emergencyName: data.emergencyName || '',
          allergies: data.allergies || '',
          chronicConditions: data.chronicConditions || '',
          profilePic: data.profilePic || data.photoURL || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'PRESCRIPTIONS');
      formData.append('folder', 'profiles');

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/vrgpf6co/image/upload',
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (data.secure_url) {
        setProfile({ ...profile, profilePic: data.secure_url });
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      const updateData = {
        name: profile.name,
        phone: profile.phone,
        age: parseInt(profile.age) || 0,
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        address: profile.address,
        emergencyContact: profile.emergencyContact,
        emergencyName: profile.emergencyName,
        allergies: profile.allergies,
        chronicConditions: profile.chronicConditions,
        profilePic: profile.profilePic,
        photoURL: profile.profilePic,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'users', user.uid), updateData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 " +
    "disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-600 disabled:cursor-default transition-colors";

  const labelClass = "text-[13px] font-medium text-slate-500";

  return (
    <div className="min-h-svh bg-slate-50 pb-24 lg:pb-12 text-slate-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[24px] font-semibold text-slate-900">Patient profile</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium px-2 py-0.5">
                <ShieldCheck size={12} /> Verified
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">
              Health ID: {user?.uid.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
            className={`h-[42px] px-5 rounded-lg text-[14px] font-medium transition-colors flex items-center gap-2 border ${
              editing
                ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600 disabled:opacity-70'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/70 border-t-transparent animate-spin rounded-full" />
            ) : editing ? (
              <><Save size={16} /> Save changes</>
            ) : (
              <><Edit size={16} /> Edit profile</>
            )}
          </button>
        </div>

        {/* Main identity card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                {profile.profilePic ? (
                  <img src={profile.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={36} className="text-slate-300" />
                  </div>
                )}
              </div>

              {editing && (
                <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-teal-700 transition-colors">
                  {uploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <Camera size={14} />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            <div className="text-center sm:text-left space-y-2 min-w-0">
              <h2 className="text-[20px] font-semibold text-slate-900 truncate">
                {profile.name || 'Unnamed patient'}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" /> {profile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-6">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User size={16} className="text-slate-400" />
                <h3 className="text-[14px] font-semibold text-slate-800">Personal details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Full name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!editing}
                    className={inputClass}
                    placeholder="Enter legal name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Phone number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    disabled={!editing}
                    className={inputClass}
                    placeholder="+91 00000 00000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Gender</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    disabled={!editing}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Age</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    disabled={!editing}
                    className={inputClass}
                    placeholder="24"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <MapPin size={13} className="text-slate-400" /> Residential address
                </label>
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  disabled={!editing}
                  className={`${inputClass} min-h-[90px] resize-none`}
                  placeholder="Enter full address for medical records"
                />
              </div>
            </div>

            {/* Emergency contact */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <AlertCircle size={16} className="text-rose-500" />
                <h3 className="text-[14px] font-semibold text-slate-800">Emergency contact</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Contact name</label>
                  <input
                    type="text"
                    value={profile.emergencyName}
                    onChange={(e) => setProfile({ ...profile, emergencyName: e.target.value })}
                    disabled={!editing}
                    className={inputClass}
                    placeholder="Next of kin or guardian"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Emergency mobile</label>
                  <input
                    type="tel"
                    value={profile.emergencyContact}
                    onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                    disabled={!editing}
                    className={inputClass}
                    placeholder="+91 00000 00000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 space-y-6">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Activity size={16} className="text-slate-400" />
                <h3 className="text-[14px] font-semibold text-slate-800">Health profile</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Blood group</label>
                  <select
                    value={profile.bloodGroup}
                    onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                    disabled={!editing}
                    className={`${inputClass} font-medium`}
                  >
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <HeartPulse size={13} className="text-slate-400" /> Chronic conditions
                  </label>
                  <textarea
                    value={profile.chronicConditions}
                    onChange={(e) => setProfile({ ...profile, chronicConditions: e.target.value })}
                    disabled={!editing}
                    className={`${inputClass} min-h-[100px] text-[13px] resize-none`}
                    placeholder="e.g. Diabetes, hypertension"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`${labelClass} flex items-center gap-1.5`}>
                    <AlertCircle size={13} className="text-slate-400" /> Allergies
                  </label>
                  <textarea
                    value={profile.allergies}
                    onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                    disabled={!editing}
                    className={`${inputClass} min-h-[100px] text-[13px] resize-none`}
                    placeholder="e.g. Paracetamol, peanuts"
                  />
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Lock size={15} />
                <span className="text-[13px] font-medium">Your data is protected</span>
              </div>
              <p className="text-[12.5px] text-slate-500 leading-relaxed">
                Your medical information is encrypted and only shared with doctors during a confirmed booking.
              </p>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-center pt-6">
          <p className="text-[11px] text-slate-400">MyHealth patient profile</p>
        </div>

      </div>

      <PatientBottomNav />
    </div>
  );
}