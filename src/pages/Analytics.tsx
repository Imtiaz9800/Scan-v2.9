import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/Layout';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ScanRecord } from '../types';
import { BarChart3, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function Analytics() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const unsubScans = onSnapshot(collection(db, 'scans'), (snap) => {
      setScans(snap.docs.map(d => d.data() as ScanRecord));
    });

    return () => unsubScans();
  }, [user]);

  if (authLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || user.role !== 'admin') return <div className="text-center py-20 text-slate-500">Access Denied. Admin only.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Analytics</h1>
        <p className="text-slate-500">Monitor verification activity and security alerts.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <BarChart3 size={24} />
            </div>
            <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Total Scans</h3>
          </div>
          <div className="text-4xl font-black text-slate-900">{scans.length}</div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Authentic Scans</h3>
          </div>
          <div className="text-4xl font-black text-slate-900">{scans.filter(s => s.isAuthentic).length}</div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <ShieldAlert size={24} />
            </div>
            <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Failed Verifications</h3>
          </div>
          <div className="text-4xl font-black text-slate-900">{scans.filter(s => !s.isAuthentic).length}</div>
        </div>
      </div>
    </div>
  );
}
