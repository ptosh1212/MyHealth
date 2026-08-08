'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, Timestamp, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAlertStore } from '@/lib/alert-store';
import { X, Camera, Plus, Trash2, Sparkles, Wand2, ChevronRight } from 'lucide-react';
import { notifyPrescriptionReady } from '@/lib/whatsapp';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const CLOUDINARY_CLOUD_NAME = 'vrgpf6co';
const CLOUDINARY_UPLOAD_PRESET = 'PRESCRIPTIONS';

export default function PrescriptionModal({
  booking,
  doctorData,
  onClose,
  onSaved
}: {
  booking: any;
  doctorData: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAlertStore();
  const [step, setStep] = useState<'type' | 'digital' | 'handwritten'>('type');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [storeMedicines, setStoreMedicines] = useState<any[]>([]);
  const [loadingStore, setLoadingStore] = useState(true);

  // Digital prescription state
  const [diagnosis, setDiagnosis] = useState('');
  const [existingConditions, setExistingConditions] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([{
    name: '', dosage: '', frequency: '', duration: '', instructions: ''
  }]);
  const [labTests, setLabTests] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Handwritten prescription state
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);

  // Fetch doctor's store medicines
  useEffect(() => {
    const fetchStoreMedicines = async () => {
      if (!doctorData?.uid) return;
      try {
        const shopQuery = query(collection(db, 'shops'), where('doctorId', '==', doctorData.uid));
        const shopSnap = await getDocs(shopQuery);
        if (!shopSnap.empty) {
          const shopId = shopSnap.docs[0].data().shopId;
          const medQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
          const medSnap = await getDocs(medQuery);
          setStoreMedicines(medSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching store medicines:', error);
      } finally {
        setLoadingStore(false);
      }
    };
    fetchStoreMedicines();
  }, [doctorData?.uid]);

  const addMedicine = () => setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const removeMedicine = (index: number) => setMedicines(medicines.filter((_, i) => i !== index));
  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'prescriptions');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) setPrescriptionImage(data.secure_url);
    } catch (error) {
      console.error('Upload error:', error);
    } finally { setUploading(false); }
  };

  const saveDigitalPrescription = async () => {
    if (!diagnosis.trim()) { showAlert('Missing Diagnosis', 'Please enter a diagnosis', 'warning'); return; }
    const validMedicines = medicines.filter(m => m.name.trim());
    if (validMedicines.length === 0) { showAlert('No Medication', 'Please add at least one medicine', 'warning'); return; }

    setSaving(true);
    try {
      await addDoc(collection(db, 'summaries'), {
        bookingId: booking.id,
        doctorId: doctorData?.uid || '',
        doctorName: doctorData?.name || '',
        doctorSpecialty: doctorData?.specialty || 'General',
        userId: booking.userId,
        userName: booking.userName || '',
        patientName: booking.patientName,
        patientAge: booking.patientAge,
        appointmentDate: booking.appointmentDate,
        appointmentDateStr: booking.appointmentDateStr,
        symptoms: booking.symptoms,
        existingConditions,
        diagnosis: diagnosis.trim(),
        medicines: validMedicines,
        labTests: labTests.split(',').map(t => t.trim()).filter(Boolean),
        advice: advice.trim(),
        followUpDate: followUpDate.trim(),
        followUpNotes: followUpNotes.trim(),
        prescriptionType: 'digital',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'completed', prescriptionWritten: true, completedAt: Timestamp.now() });
      try {
        const patientDoc = await getDoc(doc(db, 'users', booking.userId));
        const patientPhone = patientDoc.data()?.phone || '';
        if (patientPhone) await notifyPrescriptionReady(patientPhone, patientDoc.data()?.name || booking.patientName, doctorData?.name || 'Doctor');
      } catch (waErr) {}
      onSaved(); onClose();
    } catch (error) { console.error('Prescription save error:', error); } finally { setSaving(false); }
  };

  const saveHandwrittenPrescription = async () => {
    if (!prescriptionImage) { showAlert('Image Required', 'Please upload a prescription image', 'warning'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'summaries'), {
        bookingId: booking.id,
        doctorId: doctorData?.uid || '',
        doctorName: doctorData?.name || '',
        doctorSpecialty: doctorData?.specialty || 'General',
        userId: booking.userId,
        userName: booking.userName || '',
        patientName: booking.patientName,
        patientAge: booking.patientAge,
        appointmentDate: booking.appointmentDate,
        appointmentDateStr: booking.appointmentDateStr,
        symptoms: booking.symptoms,
        prescriptionImage: prescriptionImage,
        prescriptionType: 'handwritten',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'completed', prescriptionWritten: true, prescriptionUrl: prescriptionImage, completedAt: Timestamp.now() });
      try {
        const patientDoc = await getDoc(doc(db, 'users', booking.userId));
        const patientPhone = patientDoc.data()?.phone || '';
        if (patientPhone) await notifyPrescriptionReady(patientPhone, patientDoc.data()?.name || booking.patientName, doctorData?.name || 'Doctor');
      } catch (waErr) {}
      onSaved(); onClose();
    } catch (error) { console.error('Prescription save error:', error); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl max-h-[92svh] bg-white rounded-t-md sm:rounded-md border-t border-gray-200 sm:border sm:border-gray-200 shadow-sm flex flex-col animate-slide-up">

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-white z-20">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900">Issue prescription</h2>
            <p className="text-[12px] text-gray-400 font-medium">Patient: {booking.patientName}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all active:scale-90">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-12">

          {step === 'type' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => setStep('digital')} className="bg-white border border-gray-200 rounded-md p-8 flex flex-col items-center text-center gap-6 hover:border-teal-300 transition-all">
                <div className="w-16 h-16 rounded-md bg-teal-50 flex items-center justify-center border border-teal-200">
                  <Wand2 size={32} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900 mb-2">Digital prescription</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">Type diagnosis and medications using our smart assistant</p>
                </div>
                <div className="mt-4 px-6 py-2.5 rounded-sm bg-teal-600 text-white text-[12px] font-semibold">Start typing</div>
              </button>

              <button onClick={() => setStep('handwritten')} className="bg-white border border-gray-200 rounded-md p-8 flex flex-col items-center text-center gap-6 hover:border-amber-300 transition-all">
                <div className="w-16 h-16 rounded-md bg-amber-50 flex items-center justify-center border border-amber-200">
                  <Camera size={32} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900 mb-2">Scan & upload</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">Fast-track by uploading a photo of your handwritten note</p>
                </div>
                <div className="mt-4 px-6 py-2.5 rounded-sm bg-teal-600 text-white text-[12px] font-semibold">Open scanner</div>
              </button>
            </div>
          )}

          {step === 'digital' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-gray-500 px-1">Initial diagnosis *</label>
                  <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full min-h-[100px] rounded-sm border border-gray-200 bg-white px-4 pt-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" placeholder="Primary medical assessment..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-gray-500 px-1">Relevant observations</label>
                  <textarea value={existingConditions} onChange={(e) => setExistingConditions(e.target.value)} className="w-full min-h-[100px] rounded-sm border border-gray-200 bg-white px-4 pt-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" placeholder="Blood pressure, heart rate, or other signs..." />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 px-1">
                  <h3 className="text-[13px] font-semibold text-gray-700 flex items-center gap-2">
                    <Sparkles size={15} className="text-teal-600" /> Medication plan
                  </h3>
                  <button onClick={addMedicine} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-teal-50 text-teal-700 text-[11px] font-semibold hover:bg-teal-100 transition-all">
                    <Plus size={14} /> Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {medicines.map((med, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-md p-5 relative">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <input type="text" value={med.name} onChange={(e) => updateMedicine(index, 'name', e.target.value)} className="w-full h-[52px] rounded-sm border border-gray-200 bg-white px-4 text-[14px] font-semibold text-teal-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Medicine name" list={`med-list-${index}`} />
                          {!loadingStore && storeMedicines.length > 0 && (
                            <datalist id={`med-list-${index}`}>
                              {storeMedicines.map(m => <option key={m.id} value={m.name}>{m.name} (Stock)</option>)}
                            </datalist>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={med.dosage} onChange={(e) => updateMedicine(index, 'dosage', e.target.value)} className="w-full h-[52px] rounded-sm border border-gray-200 bg-white px-4 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Dosage (e.g. 500mg)" />
                          <input type="text" value={med.frequency} onChange={(e) => updateMedicine(index, 'frequency', e.target.value)} className="w-full h-[52px] rounded-sm border border-gray-200 bg-white px-4 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Freq (1-0-1)" />
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={med.duration} onChange={(e) => updateMedicine(index, 'duration', e.target.value)} className="w-full h-[52px] rounded-sm border border-gray-200 bg-white px-4 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Duration (5 days)" />
                          {medicines.length > 1 && (
                            <button onClick={() => removeMedicine(index)} className="w-10 h-[52px] rounded-sm bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 hover:bg-red-100 transition-all">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <div className="md:col-span-3">
                           <input type="text" value={med.instructions} onChange={(e) => updateMedicine(index, 'instructions', e.target.value)} className="w-full h-[48px] rounded-sm border border-gray-200 bg-gray-50 px-4 text-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Specific instructions (e.g. After lunch, take with milk)" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-gray-500 px-1">Required tests</label>
                      <input type="text" value={labTests} onChange={(e) => setLabTests(e.target.value)} className="w-full h-[48px] rounded-sm border border-gray-200 bg-white px-4 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="CBC, Thyroid, X-Ray..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-gray-500 px-1">General advice</label>
                      <textarea value={advice} onChange={(e) => setAdvice(e.target.value)} className="w-full min-h-[80px] rounded-sm border border-gray-200 bg-white px-4 pt-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" placeholder="Diet control, rest, hydration..." />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-gray-500 px-1">Follow-up schedule</label>
                      <input type="text" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full h-[48px] rounded-sm border border-gray-200 bg-white px-4 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Next Monday / After 1 week" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-gray-500 px-1">Follow-up notes</label>
                      <textarea value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} className="w-full min-h-[80px] rounded-sm border border-gray-200 bg-white px-4 pt-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" placeholder="Review scan reports, share progress..." />
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button onClick={() => setStep('type')} className="w-14 h-[50px] rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <button onClick={saveDigitalPrescription} disabled={saving} className="flex-1 h-[50px] rounded-sm bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[14px] font-semibold transition-colors">
                  {saving ? 'Transmitting data...' : 'Finalize & send'}
                </button>
              </div>
            </div>
          )}

          {step === 'handwritten' && (
            <div className="space-y-8">
              <div className={`relative border-2 border-dashed rounded-md p-12 text-center transition-all ${
                prescriptionImage ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}>
                {prescriptionImage ? (
                  <div className="space-y-6">
                    <div className="relative inline-block">
                       <img src={prescriptionImage} alt="Prescription" className="max-h-[400px] rounded-md border border-gray-200" />
                       <button onClick={() => setPrescriptionImage(null)} className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                         <Trash2 size={18} />
                       </button>
                    </div>
                    <p className="text-[13px] text-teal-700 font-medium">Document ready for processing</p>
                  </div>
                ) : (
                  <label className="cursor-pointer group flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-md bg-white border border-gray-200 flex items-center justify-center group-hover:border-teal-300 transition-colors">
                      {uploading ? <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent animate-spin rounded-full" /> : <Camera size={36} className="text-gray-300 group-hover:text-teal-600 transition-colors" />}
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-900 mb-2">Upload or capture</h3>
                      <p className="text-[13px] text-gray-500">Attach JPEG, PNG of the final prescription</p>
                    </div>
                    <div className="px-8 py-3 rounded-sm bg-teal-600 text-white text-[13px] font-semibold">
                      {uploading ? 'Uploading...' : 'Select file'}
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button onClick={() => setStep('type')} className="w-14 h-[50px] rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <button onClick={saveHandwrittenPrescription} disabled={saving || !prescriptionImage} className="flex-1 h-[50px] rounded-sm bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[14px] font-semibold transition-colors">
                  {saving ? 'Saving records...' : 'Finalize & send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}