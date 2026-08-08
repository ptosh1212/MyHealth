'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Pill, Plus, Package, DollarSign, Tag } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
}

const CATEGORIES = ['Antibiotic', 'Analgesic', 'Antiviral', 'Vitamin', 'Cardiac', 'Diabetes', 'Gastro', 'Neuro', 'Other'];

export default function Medicines() {
  const { user } = useAuthStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      // Check if doctor has a shop
      const shopQuery = query(collection(db, 'shops'), where('doctorId', '==', user.uid));
      const shopSnap = await getDocs(shopQuery);
      
      if (!shopSnap.empty) {
        const shop = shopSnap.docs[0].data();
        setShopId(shop.shopId);

        // Fetch medicines
        const medQuery = query(collection(db, 'products'), where('shopId', '==', shop.shopId));
        const medSnap = await getDocs(medQuery);
        setMedicines(medSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Medicine[]);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user?.uid]);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'products'), {
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
        shopId,
        doctorId: user?.uid,
        createdAt: Timestamp.now(),
        isActive: true,
      });

      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setCategory('');
      setStock('');
      setShowAddModal(false);

      // Refresh list
      const medQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
      const medSnap = await getDocs(medQuery);
      setMedicines(medSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Medicine[]);
    } catch (error) {
      console.error('Error adding medicine:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
          <Package className="mx-auto mb-4 text-gray-600" size={64} />
          <h2 className="text-2xl font-bold mb-4">Register Your Pharmacy First</h2>
          <p className="text-slate-500 mb-6">You need to register a pharmacy before adding medicines</p>
          <button className="bg-primary text-slate-900 px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition">
            Register Pharmacy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Medicine Inventory</h1>
          <p className="text-slate-500 mt-2">{medicines.length} products in stock</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-slate-900 px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2"
        >
          <Plus size={20} />
          Add Medicine
        </button>
      </div>

      {/* Medicines Grid */}
      {medicines.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Pill className="mx-auto mb-4 text-gray-600" size={64} />
          <p className="text-slate-500 text-lg">No medicines added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {medicines.map((medicine) => (
            <div key={medicine.id} className="glass rounded-2xl p-6 hover:glow transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Pill className="text-primary" size={24} />
                </div>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-xs font-medium">
                  {medicine.category}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2">{medicine.name}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{medicine.description}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Base Price</span>
                  <span className="text-lg font-bold">₹{medicine.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">GST (12%)</span>
                  <span className="text-sm font-medium text-slate-600">₹{(medicine.price * 0.12).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-sm font-medium">Final Price</span>
                  <span className="text-xl font-bold text-primary">₹{(medicine.price * 1.12).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Stock</span>
                  <span className={`font-semibold ${medicine.stock < 10 ? 'text-red-400' : 'text-green-400'}`}>
                    {medicine.stock} units
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl p-6 md:p-8 animate-slide-up pb-12 sm:pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Add New Medicine</h2>

            <form onSubmit={handleAddMedicine} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Medicine Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
                  placeholder="e.g. Amoxicillin 500mg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition min-h-[100px]"
                  placeholder="What does this medicine treat?"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Stock *</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
                    placeholder="Units"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        category === cat
                          ? 'bg-primary text-slate-900'
                          : 'bg-white hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition"
                  placeholder="Or type custom category"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-slate-900 px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}