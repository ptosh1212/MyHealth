'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { User, Mail, Stethoscope, MapPin, DollarSign, Camera, CheckCircle, Briefcase, GraduationCap, Building } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';

export default function Profile() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
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

  useEffect(() => {
    if (!user?.uid) return;
    const fetchProfile = async () => {
      let docRef = doc(db, 'doctors', user.uid);
      let snap = await getDoc(docRef);
      if (!snap.exists()) {
        docRef = doc(db, 'users', user.uid);
        snap = await getDoc(docRef);
      }
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          name: data.name || '',
          email: data.email || user.email || '',
          specialization: data.specialization || data.specialty || '',
          experience: String(data.experience || ''),
          consultationFee: String(data.consultationFee || data.fees || ''),
          degree: data.degree || data.qualifications || '',
          university: data.university || data.college || '',
          clinicName: data.clinicName || '',
          clinicAddress: data.clinicAddress || data.address || '',
          about: data.about || data.bio || '',
          profilePic: data.profilePic || data.photoURL || '',
          online: data.online !== false,
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user?.uid]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'PRESCRIPTIONS');
      formData.append('folder', 'profiles');
      const response = await fetch('https://api.cloudinary.com/v1_1/vrgpf6co/image/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) setProfile({ ...profile, profilePic: data.secure_url });
    } catch (error) {
      console.error('Upload error:', error);
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      // Full professional record — lives on the doctors doc only.
      const doctorUpdateData = {
        name: profile.name,
        specialization: profile.specialization,
        specialty: profile.specialization,
        experience: parseInt(profile.experience) || 0,
        consultationFee: parseFloat(profile.consultationFee) || 0,
        fees: parseFloat(profile.consultationFee) || 0,
        degree: profile.degree,
        qualifications: profile.degree,
        university: profile.university,
        college: profile.university,
        clinicName: profile.clinicName,
        clinicAddress: profile.clinicAddress,
        address: profile.clinicAddress,
        about: profile.about,
        bio: profile.about,
        profilePic: profile.profilePic,
        photoURL: profile.profilePic,
        online: profile.online,
        isOnline: profile.online,
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'doctors', user.uid), doctorUpdateData, { merge: true });

      // Lightweight shared record — only the fields that belong on the
      // shared `users` doc, so this write doesn't leak doctor-only fields
      // (fees, bio, clinic address, etc.) into that collection.
      const userUpdateData = {
        name: profile.name,
        profilePic: profile.profilePic,
        updatedAt: Timestamp.now(),
      };
      try { await setDoc(doc(db, 'users', user.uid), userUpdateData, { merge: true }); } catch (e) {}

      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally { setSaving(false); }
  };

  const inputClass = (disabled: boolean) =>
    `w-full h-12 bg-white border-2 border-black px-4 text-sm focus:outline-none ${
      disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
    }`;

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

  return (
    <div className="min-h-svh bg-white text-black">
      <DoctorSidebar />

      <div className="px-4 py-6 max-w-4xl mx-auto lg:px-8 space-y-8 pb-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
            <p className="text-sm text-gray-500 mt-1">Your public details and clinic information</p>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className="h-12 px-6 bg-black text-white text-sm font-bold uppercase tracking-wide disabled:opacity-50"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                Saving
              </div>
            ) : editing ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} /> Save changes
              </div>
            ) : (
              'Edit profile'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Sidebar: Photo & Bio */}
          <div className="lg:col-span-4 space-y-6">
            <div className="border-2 border-black p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-28 h-28 border-2 border-black overflow-hidden bg-gray-100">
                  {profile.profilePic ? (
                    <img src={profile.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={40} className="text-gray-400" />
                    </div>
                  )}
                </div>
                {editing && (
                  <label className="absolute -bottom-2 -right-2 w-9 h-9 border-2 border-black bg-black text-white flex items-center justify-center cursor-pointer">
                    {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> : <Camera size={16} />}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              <h2 className="text-lg font-bold mb-1">
                {profile.name ? `Dr. ${profile.name}` : 'Add your name'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{profile.specialization || 'Healthcare professional'}</p>

              <div className="w-full pt-4 border-t-2 border-black flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span className={`w-2 h-2 ${profile.online ? 'bg-black' : 'bg-gray-300'}`} />
                    {profile.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                {editing && (
                  <button
                    onClick={() => setProfile({ ...profile, online: !profile.online })}
                    className="mt-2 w-full py-2 border-2 border-black text-xs font-bold uppercase"
                  >
                    Switch to {profile.online ? 'offline' : 'online'}
                  </button>
                )}
              </div>
            </div>

            <div className="border-2 border-black p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3">About</h3>
              <textarea
                value={profile.about}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                disabled={!editing}
                className={`w-full min-h-[140px] text-sm leading-relaxed resize-none focus:outline-none ${
                  editing ? 'border-2 border-black p-3 bg-white' : 'bg-transparent'
                }`}
                placeholder="A short biography..."
              />
            </div>
          </div>

          {/* Main content: forms */}
          <div className="lg:col-span-8 space-y-6">

            {/* Professional info */}
            <div className="border-2 border-black p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <User size={12} /> Full name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!editing}
                    className={inputClass(!editing)}
                    placeholder="Dr. John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Mail size={12} /> Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className={inputClass(true)}
                    placeholder="email@ananthealth.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Stethoscope size={12} /> Specialization
                  </label>
                  <input
                    type="text"
                    value={profile.specialization}
                    onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                    disabled={!editing}
                    className={inputClass(!editing)}
                    placeholder="e.g. Cardiologist"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Briefcase size={12} /> Experience (years)
                  </label>
                  <input
                    type="number"
                    value={profile.experience}
                    onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                    disabled={!editing}
                    className={inputClass(!editing)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <GraduationCap size={12} /> Medical degree
                  </label>
                  <input
                    type="text"
                    value={profile.degree}
                    onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                    disabled={!editing}
                    className={inputClass(!editing)}
                    placeholder="e.g. MBBS, MD"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <DollarSign size={12} /> Consultation fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                    <input
                      type="number"
                      value={profile.consultationFee}
                      onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })}
                      disabled={!editing}
                      className={`${inputClass(!editing)} pl-8`}
                      placeholder="699"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic info */}
            <div className="border-2 border-black p-6 md:p-8 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 pb-3 border-b-2 border-black">
                <Building size={16} /> Clinic location
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Clinic name</label>
                <input
                  type="text"
                  value={profile.clinicName}
                  onChange={(e) => setProfile({ ...profile, clinicName: e.target.value })}
                  disabled={!editing}
                  className={inputClass(!editing)}
                  placeholder="e.g. My Health Multispeciality"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                  <MapPin size={12} /> Full address
                </label>
                <textarea
                  value={profile.clinicAddress}
                  onChange={(e) => setProfile({ ...profile, clinicAddress: e.target.value })}
                  disabled={!editing}
                  className={`w-full min-h-[100px] py-3 px-4 text-sm resize-none focus:outline-none border-2 border-black ${
                    !editing ? 'bg-gray-100 text-gray-500' : 'bg-white'
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