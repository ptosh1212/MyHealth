'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import DoctorSidebar from '@/components/DoctorSidebar';
import {
  Bot, Phone, PhoneCall, Copy, ExternalLink, Play,
  RefreshCw, Clock, CheckCircle, AlertCircle, Loader2,
  X, ChevronRight, Trash2,
  MessageSquare, Shield, Mic
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface AiConfig {
  enabled: boolean;
  assistantId: string;
  phoneNumberId: string;
  assignedNumber: string;
  provisionedAt?: any;
}

interface VapiCall {
  id: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  transcript?: string;
  summary?: string;
  customer?: { number: string };
  cost?: number;
}

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider';
const BTN_PRIMARY =
  'bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SECONDARY =
  'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors disabled:opacity-50';

export default function AIReceptionist() {
  const { user } = useAuthStore();
  const [doctorData, setDoctorData] = useState<any>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [deprovisioning, setDeprovisioning] = useState(false);
  const [testCalling, setTestCalling] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'settings'>('overview');
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Live listener on doctor doc ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'doctors', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDoctorData(data);
        setAiConfig(data.aiReceptionist || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'calls' && aiConfig?.assistantId) fetchCalls();
  }, [activeTab, aiConfig?.assistantId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') =>
    setToast({ msg, type });

  const copy = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  const isActive = !!(aiConfig?.enabled && aiConfig?.assistantId);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleActivate = async () => {
    setProvisioning(true);
    try {
      const res = await fetch('/api/vapi/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: user!.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.alreadyExists ? 'Already active' : 'AI receptionist is live');
    } catch (e: any) {
      showToast(e.message || 'Activation failed', 'error');
    } finally {
      setProvisioning(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('This will delete your AI assistant and release your phone number. Continue?')) return;
    setDeprovisioning(true);
    try {
      const res = await fetch('/api/vapi/deprovision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: user!.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('AI receptionist deactivated');
    } catch (e: any) {
      showToast(e.message || 'Deactivation failed', 'error');
    } finally {
      setDeprovisioning(false);
    }
  };

  const handleTestCall = async () => {
    if (testPhone.length !== 10) { showToast('Enter a valid 10-digit number', 'error'); return; }
    setTestCalling(true);
    try {
      const res = await fetch('/api/vapi/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: user!.uid, phoneNumber: testPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Calling you now — answer to talk to your AI');
    } catch (e: any) {
      showToast(e.message || 'Call failed', 'error');
    } finally {
      setTestCalling(false);
    }
  };

  const fetchCalls = async () => {
    setLoadingCalls(true);
    try {
      const res = await fetch(`/api/vapi/calls?doctorId=${user!.uid}`);
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCalls(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="doctor-page min-h-svh bg-white">
        <DoctorSidebar />
        <div className="flex items-center justify-center min-h-svh">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="text-slate-300 animate-spin" />
            <p className="text-slate-400 text-sm">Loading</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-page min-h-svh bg-white">
      <DoctorSidebar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 bg-white border shadow-sm ${
          toast.type === 'success' ? 'border-teal-700' : 'border-red-700'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={16} className="text-teal-700" />
            : <AlertCircle size={16} className="text-red-700" />}
          <span className="text-[13px] font-medium text-slate-800">{toast.msg}</span>
        </div>
      )}

      <div className="px-4 py-8 max-w-3xl mx-auto lg:px-8 space-y-6 pb-24">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-slate-200 flex items-center justify-center">
              <Bot size={20} className="text-slate-700" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-slate-900">AI Receptionist</h1>
              <p className="text-[13px] text-slate-400">Answers patient calls around the clock</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 border text-[11px] font-semibold uppercase tracking-wider ${
            isActive
              ? 'border-teal-700 text-teal-700'
              : 'border-slate-300 text-slate-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-teal-700' : 'bg-slate-300'}`} />
            {isActive ? 'Live' : 'Inactive'}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-200">
          {(['overview', 'calls', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[13px] font-semibold capitalize -mb-px border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-teal-700 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">

            {/* NOT ACTIVE — Activation panel */}
            {!isActive && (
              <div className={`${CARD} p-8 flex flex-col items-center text-center gap-6`}>
                <div className="w-16 h-16 border border-slate-200 flex items-center justify-center">
                  <Bot size={30} className="text-slate-700" />
                </div>

                <div>
                  <h2 className="text-[18px] font-semibold text-slate-900 mb-2">Activate your AI receptionist</h2>
                  <p className="text-[14px] text-slate-500 max-w-sm leading-relaxed">
                    We'll create your AI, assign a dedicated phone number, and have it answering patient calls in under 30 seconds.
                  </p>
                </div>

                {/* What you get */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  {[
                    { icon: Phone, title: 'Dedicated number', desc: 'Your own AI phone line' },
                    { icon: Bot, title: 'Smart AI', desc: 'Books, answers, handles queries' },
                    { icon: MessageSquare, title: 'Auto notify', desc: 'WhatsApp to patient and you' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="p-4 border border-slate-200 flex items-start gap-3">
                        <Icon size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                          <p className="text-[12px] text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleActivate}
                  disabled={provisioning}
                  className={`${BTN_PRIMARY} w-full max-w-sm py-3.5 text-[14px] flex items-center justify-center gap-2`}
                >
                  {provisioning ? (
                    <><Loader2 size={16} className="animate-spin" /> Setting up your AI</>
                  ) : (
                    'Activate AI receptionist'
                  )}
                </button>

                {provisioning && (
                  <div className="space-y-1.5 text-[12px] text-slate-400 text-center">
                    <p>Creating AI assistant</p>
                    <p>Provisioning phone number</p>
                    <p>Connecting everything</p>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE — Show number + test */}
            {isActive && (
              <div className="space-y-4">

                {/* Phone Number Card */}
                <div className={`${CARD} p-6`}>
                  <p className={`${LABEL} mb-3`}>Your AI receptionist number</p>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[24px] font-semibold text-slate-900 tracking-wide font-mono">
                        {aiConfig?.assignedNumber
                          ? aiConfig.assignedNumber.replace(/(\+\d)(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4')
                          : 'Provisioning…'}
                      </p>
                      <p className="text-[12px] text-slate-400 mt-1">
                        Forward your clinic number to this — the AI answers 24/7
                      </p>
                    </div>
                    {aiConfig?.assignedNumber && (
                      <button
                        onClick={() => copy(aiConfig.assignedNumber, 'Number copied')}
                        className="p-2.5 border border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors flex-shrink-0"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                  </div>

                  {/* Forwarding Instructions */}
                  {aiConfig?.assignedNumber && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                      <p className={LABEL}>Set up call forwarding on your phone</p>

                      {/* USSD codes */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { carrier: 'Airtel / Jio / Vi', code: `*401*${aiConfig.assignedNumber}#` },
                          { carrier: 'BSNL', code: `*21*${aiConfig.assignedNumber}#` },
                        ].map(item => (
                          <div key={item.carrier} className="p-3 border border-slate-200">
                            <p className="text-[10px] text-slate-400 mb-1">{item.carrier}</p>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-mono text-slate-700 truncate">{item.code}</p>
                              <button
                                onClick={() => copy(item.code, 'Code copied')}
                                className="text-slate-300 hover:text-slate-700 transition-colors flex-shrink-0"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                        <span className="text-slate-700 font-semibold">How to use:</span> open your phone dialer, type the code above, press call — forwarding is now active. To disable, dial <span className="font-mono text-slate-700">##401#</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total calls', value: calls.length || '—', icon: Phone },
                    { label: 'Avg duration', value: calls.length ? `${Math.round(calls.reduce((s, c) => s + (c.duration || 0), 0) / calls.length / 60)}m` : '—', icon: Clock },
                    { label: 'Status', value: 'Live', icon: Shield },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className={`${CARD} p-4 text-center`}>
                        <Icon size={16} className="mx-auto mb-2 text-slate-400" />
                        <p className="text-[17px] font-semibold text-slate-900">{stat.value}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Test Call */}
                <div className={`${CARD} p-5 space-y-4`}>
                  <div className="flex items-center gap-2">
                    <Play size={15} className="text-slate-500" />
                    <h3 className="text-[13px] font-semibold text-slate-800">Test your AI</h3>
                    <span className="text-[12px] text-slate-400">— we'll call your phone right now</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium">+91</span>
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full pl-11 pr-3 py-2.5 border border-slate-300 text-[14px] text-slate-800 focus:outline-none focus:border-teal-700"
                        placeholder="9876543210"
                        maxLength={10}
                      />
                    </div>
                    <button
                      onClick={handleTestCall}
                      disabled={testCalling || testPhone.length !== 10}
                      className={`${BTN_PRIMARY} px-5 py-2.5 text-[13px] flex items-center gap-2 flex-shrink-0`}
                    >
                      {testCalling ? <Loader2 size={15} className="animate-spin" /> : <PhoneCall size={15} />}
                      {testCalling ? 'Calling…' : 'Call me'}
                    </button>
                  </div>
                </div>

                {/* How AI responds */}
                <div className={`${CARD} p-5 space-y-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mic size={15} className="text-slate-400" />
                    <h3 className={LABEL}>What your AI says</h3>
                  </div>
                  <div className="space-y-2.5 text-[13px]">
                    <div className="flex gap-3">
                      <span className="text-slate-300 flex-shrink-0 w-14">AI</span>
                      <span className="text-slate-600">"Thank you for calling {doctorData?.clinicName || `Dr. ${doctorData?.name}'s clinic`}. How can I help you?"</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-300 flex-shrink-0 w-14">Patient</span>
                      <span className="text-slate-500">"I want to book an appointment"</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-300 flex-shrink-0 w-14">AI</span>
                      <span className="text-slate-600">"Of course — may I have your name and phone number?"</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-300 flex-shrink-0 w-14">Patient</span>
                      <span className="text-slate-500">"What are the fees?"</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-300 flex-shrink-0 w-14">AI</span>
                      <span className="text-slate-600">"Consultation fee is ₹{doctorData?.fees || 699}. Timings are {doctorData?.startTime || '9 AM'} to {doctorData?.endTime || '6 PM'}."</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CALLS TAB ═════════════════════════════════════════════════════ */}
        {activeTab === 'calls' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">Call history</h2>
              <button onClick={fetchCalls} className="p-2 border border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-400 transition-colors">
                <RefreshCw size={15} className={loadingCalls ? 'animate-spin' : ''} />
              </button>
            </div>

            {!isActive ? (
              <div className={`${CARD} p-10 text-center`}>
                <Bot size={26} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-[14px]">Activate your AI receptionist first to see calls</p>
              </div>
            ) : loadingCalls ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className={`${CARD} h-20 animate-pulse bg-slate-50`} />)}
              </div>
            ) : calls.length === 0 ? (
              <div className={`${CARD} p-12 flex flex-col items-center text-center gap-2`}>
                <Phone size={24} className="text-slate-200" />
                <p className="text-[14px] font-semibold text-slate-400">No calls yet</p>
                <p className="text-[12px] text-slate-400">Share your AI number with patients to start receiving calls</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`w-full ${CARD} p-4 text-left hover:border-slate-400 transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <Phone size={16} className={call.status === 'ended' ? 'text-teal-700' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-800">{call.customer?.number || 'Unknown'}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                          {call.duration && <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>}
                          {call.startedAt && <span>· {new Date(call.startedAt).toLocaleDateString('en-IN')}</span>}
                          {call.cost && <span>· ${call.cost.toFixed(3)}</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                    {call.summary && (
                      <p className="text-[12px] text-slate-400 mt-2 ml-13 line-clamp-1">{call.summary}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-4">

            {isActive && (
              <>
                <div className={`${CARD} p-5 space-y-3`}>
                  <h3 className="text-[13px] font-semibold text-slate-800">Active configuration</h3>
                  {[
                    { label: 'Assistant ID', value: aiConfig?.assistantId || '—' },
                    { label: 'Phone number ID', value: aiConfig?.phoneNumberId || '—' },
                    { label: 'Assigned number', value: aiConfig?.assignedNumber || '—' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between gap-4 p-3 border border-slate-200">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">{item.label}</p>
                        <p className="text-[12px] font-mono text-slate-700 truncate">{item.value}</p>
                      </div>
                      <button onClick={() => copy(item.value)} className="p-1.5 text-slate-300 hover:text-slate-700 transition-colors flex-shrink-0">
                        <Copy size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <a
                  href="https://dashboard.vapi.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${CARD} p-4 flex items-center justify-between hover:border-slate-400 transition-colors group`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 border border-slate-200 flex items-center justify-center">
                      <ExternalLink size={15} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">Vapi dashboard</p>
                      <p className="text-[12px] text-slate-400">View detailed call analytics</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                </a>

                <button
                  onClick={handleDeactivate}
                  disabled={deprovisioning}
                  className="w-full py-3 border border-red-700 text-red-700 font-semibold text-[13px] hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deprovisioning ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deprovisioning ? 'Deactivating…' : 'Deactivate AI receptionist'}
                </button>
              </>
            )}

            {!isActive && (
              <div className={`${CARD} p-8 text-center`}>
                <Bot size={26} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 text-[14px]">No active configuration</p>
                <button onClick={() => setActiveTab('overview')} className={`${BTN_SECONDARY} mt-4 px-5 py-2 text-[13px]`}>
                  Go to overview →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Call Detail Sheet ── */}
      {selectedCall && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedCall(null)} />
          <div className="relative w-full max-h-[85svh] overflow-y-auto bg-white border-t border-slate-200 pb-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-[15px] font-semibold text-slate-900">Call details</h2>
              <button onClick={() => setSelectedCall(null)} className="w-8 h-8 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Caller', value: selectedCall.customer?.number || 'Unknown' },
                  { label: 'Duration', value: selectedCall.duration ? `${Math.floor(selectedCall.duration / 60)}m ${selectedCall.duration % 60}s` : '—' },
                  { label: 'Status', value: selectedCall.status },
                  { label: 'Cost', value: selectedCall.cost ? `$${selectedCall.cost.toFixed(4)}` : '—' },
                ].map(item => (
                  <div key={item.label} className="p-3.5 border border-slate-200">
                    <p className="text-[11px] text-slate-400 mb-1">{item.label}</p>
                    <p className="text-[14px] font-semibold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
              {selectedCall.summary && (
                <div className="p-4 border border-slate-200 bg-slate-50">
                  <p className={`${LABEL} mb-2`}>AI summary</p>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{selectedCall.summary}</p>
                </div>
              )}
              {selectedCall.transcript && (
                <div className="p-4 border border-slate-200">
                  <p className={`${LABEL} mb-2`}>Transcript</p>
                  <p className="text-[12px] text-slate-500 leading-relaxed whitespace-pre-wrap">{selectedCall.transcript}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}