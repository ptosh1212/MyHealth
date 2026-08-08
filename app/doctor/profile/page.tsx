'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { User, Mail, Stethoscope, Award, MapPin, DollarSign, FileText, Camera, CheckCircle, ShieldCheck, Briefcase, GraduationCap, Building } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { StatCardSkeleton } from '@/components/SkeletonLoader';

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

  if (loading) {
    return (
      <div className="doctor-page min-h-svh bg-[#080C10]">
        <DoctorSidebar />
        <div className="px-4 py-8 max-w-4xl mx-auto space-y-6">
           <div className="h-32 w-32 rounded-full bg-white/5 animate-shimmer mx-auto md:mx-0" />
           <div className="space-y-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-page min-h-svh bg-[#080C10]">
      <DoctorSidebar />

      <div className="px-4 py-6 max-w-4xl mx-auto lg:px-8 space-y-8 pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-white flex items-center gap-2">
              Professional Profile
            </h1>
            <p className="text-[13px] text-white/30 mt-1">Manage your public identity and clinic details</p>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className={`btn-primary px-8 py-3.5 ${editing ? 'animate-glow-pulse' : ''}`}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Saving...
              </div>
            ) : editing ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={18} /> Save Changes
              </div>
            ) : (
              'Edit Professional Profile'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Sidebar Area: Photo & Bio */}
          <div className="lg:col-span-4 space-y-6 animate-fade-in-up delay-75">
            <div className="card p-8 flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/[0.05] group-hover:border-primary/50 transition-all duration-300">
                  {profile.profilePic ? (
                    <img src={profile.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <User size={48} className="text-primary/40" />
                    </div>
                  )}
                </div>
                {editing && (
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-primary text-black flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 active:scale-95 transition-all">
                    {uploading ? <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full" /> : <Camera size={20} />}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>
              
              <h2 className="text-[20px] font-bold text-white mb-1">
                {profile.name ? `Dr. ${profile.name}` : 'Add your name'}
              </h2>
              <p className="text-[13px] text-white/40 mb-4">{profile.specialization || 'Healthcare Professional'}</p>
              
              <div className="w-full pt-4 border-t border-white/[0.05] flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Status</span>
                  <div className={`badge ${profile.online ? 'badge-green' : 'badge-red'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${profile.online ? 'bg-primary' : 'bg-rose'}`} />
                    {profile.online ? 'Online' : 'Offline'}
                  </div>
                </div>
                {editing && (
                  <button 
                    onClick={() => setProfile({ ...profile, online: !profile.online })}
                    className="mt-2 w-full py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12px] font-bold text-white/60 hover:text-white transition-colors"
                  >
                    Switch to {profile.online ? 'Offline' : 'Online'}
                  </button>
                )}
              </div>
            </div>

            <div className="card p-6">
               <div className="flex items-center gap-2 mb-4">
                 <ShieldCheck size={18} className="text-primary" />
                 <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">About Me</h3>
               </div>
               <textarea
                  value={profile.about}
                  onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                  disabled={!editing}
                  className={`input-dark min-h-[160px] text-[13px] leading-relaxed resize-none ${!editing ? 'bg-transparent border-transparent px-0 cursor-default' : ''}`}
                  placeholder="Enter a brief biography about your medical journey..."
                />
            </div>
          </div>

          {/* Main Content Area: Forms */}
          <div className="lg:col-span-8 space-y-6 animate-fade-in-up delay-150">
            
            {/* Professional Info */}
            <div className="card p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    disabled={!editing}
                    className="input-dark"
                    placeholder="Dr. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="input-dark opacity-50 cursor-not-allowed"
                    placeholder="email@ananthealth.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <Stethoscope size={12} /> Specialization
                  </label>
                  <input
                    type="text"
                    value={profile.specialization}
                    onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                    disabled={!editing}
                    className="input-dark"
                    placeholder="e.g. Cardiologist"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={12} /> Experience (Yrs)
                  </label>
                  <input
                    type="number"
                    value={profile.experience}
                    onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                    disabled={!editing}
                    className="input-dark"
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap size={12} /> Medical Degree
                  </label>
                  <input
                    type="text"
                    value={profile.degree}
                    onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                    disabled={!editing}
                    className="input-dark"
                    placeholder="e.g. MBBS, MD"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={12} /> Consultation Fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">₹</span>
                    <input
                      type="number"
                      value={profile.consultationFee}
                      onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })}
                      disabled={!editing}
                      className="input-dark pl-9"
                      placeholder="699"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Info */}
            <div className="card p-6 md:p-8 space-y-6">
               <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
                 <Building size={18} className="text-primary" />
                 <h3 className="text-[14px] font-bold text-white uppercase tracking-wider">Hospital / Clinic Location</h3>
               </div>
               
               <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Clinic Name</label>
                    <input
                      type="text"
                      value={profile.clinicName}
                      onChange={(e) => setProfile({ ...profile, clinicName: e.target.value })}
                      disabled={!editing}
                      className="input-dark"
                      placeholder="e.g. Anant Multispeciality"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                       <MapPin size={12} /> Full Address
                    </label>
                    <textarea
                      value={profile.clinicAddress}
                      onChange={(e) => setProfile({ ...profile, clinicAddress: e.target.value })}
                      disabled={!editing}
                      className="input-dark min-h-[100px] pt-3 resize-none"
                      placeholder="Street, City, Building Number, Pincode"
                    />
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}