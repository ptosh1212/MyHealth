'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Calendar, CheckCircle, Clock, Wallet, TrendingUp, CreditCard } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { StatCardSkeleton, ListSkeleton } from '@/components/SkeletonLoader';

interface Transaction {
  id: string;
  patientName: string;
  appointmentDate: any;
  appointmentDateStr?: string;
  consultationFee: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
}

const FILTERS = [
  { key: 'all', label: 'All history' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Awaiting' },
] as const;

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider';

export default function Earnings() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');

  useEffect(() => {
    if (!user?.uid) return;

    const fetchTransactions = async () => {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('doctorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setTransactions(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[]);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.uid]);

  const completed = transactions.filter(t => t.status === 'completed');
  const pending = transactions.filter(t => t.status === 'confirmed' || t.status === 'pending');

  const totalEarned = completed.reduce((sum, t) => sum + (t.consultationFee || 0), 0);
  const expectedEarnings = pending.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  const filtered = transactions.filter(t => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'pending') return t.status === 'confirmed' || t.status === 'pending';
    return true;
  });

  if (loading) {
     return (
        <div className="doctor-page min-h-svh bg-white">
          <DoctorSidebar />
          <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
               <StatCardSkeleton />
               <StatCardSkeleton />
               <StatCardSkeleton />
            </div>
            <ListSkeleton count={4} />
          </div>
        </div>
     );
  }

  return (
    <div className="doctor-page min-h-svh bg-white">
      <DoctorSidebar />

      <div className="px-4 py-8 max-w-4xl mx-auto lg:px-8 space-y-7">

        {/* Header */}
        <div className="pb-5 border-b border-slate-200">
          <h1 className="text-[22px] font-semibold text-slate-900">Financials</h1>
          <p className="text-[13px] text-slate-400 mt-1">Track your earnings and consultation statements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
           {[
             { label: 'Total revenue', value: `₹${totalEarned.toLocaleString('en-IN')}`, icon: Wallet },
             { label: 'Expected', value: `₹${expectedEarnings.toLocaleString('en-IN')}`, icon: TrendingUp },
             { label: 'Settled visits', value: completed.length, icon: CheckCircle },
           ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${CARD} p-5`}>
                  <div className="w-9 h-9 border border-slate-200 flex items-center justify-center mb-4 text-slate-500">
                    <Icon size={16} />
                  </div>
                  <p className="text-[22px] font-semibold text-slate-900 tabular-nums">{stat.value}</p>
                  <p className={`${LABEL} mt-1`}>{stat.label}</p>
                </div>
              );
           })}
        </div>

        {/* Filter & History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Statement history</h2>
            <div className="flex border border-slate-200">
               {FILTERS.map((f, i) => (
                 <button
                   key={f.key}
                   onClick={() => setFilter(f.key)}
                   className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                     i > 0 ? 'border-l border-slate-200' : ''
                   } ${
                     filter === f.key ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'
                   }`}
                 >
                   {f.label}
                 </button>
               ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className={`${CARD} p-12 flex flex-col items-center text-center gap-3`}>
                 <CreditCard size={26} className="text-slate-200" />
                 <p className="text-[14px] font-semibold text-slate-400">No transactions yet</p>
              </div>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id}
                  className={`${CARD} p-4 flex items-center justify-between gap-4`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      {t.status === 'completed' ? (
                        <CheckCircle className="text-teal-700" size={17} />
                      ) : (
                        <Clock className="text-amber-600" size={17} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold text-slate-800 truncate">{t.patientName}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <Calendar size={11} />
                        <span>{t.appointmentDateStr || 'Recent visit'}</span>
                        <span>·</span>
                        <span className="uppercase">{t.paymentMethod?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-[16px] font-semibold ${t.status === 'completed' ? 'text-teal-700' : 'text-amber-600'}`}>
                      ₹{t.status === 'completed' ? (t.consultationFee || 0).toLocaleString('en-IN') : (t.totalAmount || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                      {t.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}