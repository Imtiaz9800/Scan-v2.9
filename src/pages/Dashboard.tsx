import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/Layout';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Medicine, Article, UserProfile, ScanRecord } from '../types';
import { Package, FileText, Users, BarChart3, Clock, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, loading: authLoading } = useContext(AuthContext);
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    if (!user) return;

    const medQuery = user.role === 'admin' 
      ? query(collection(db, 'medicines'))
      : query(collection(db, 'medicines'), where('manufacturerUid', '==', user.uid));
    
    const unsubMeds = onSnapshot(medQuery, (snap) => {
      setMedicines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicine)));
    });

    const artQuery = user.role === 'admin'
      ? query(collection(db, 'articles'))
      : query(collection(db, 'articles'), where('authorUid', '==', user.uid));

    const unsubArts = onSnapshot(artQuery, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
    });

    let unsubUsers = () => {};
    let unsubScans = () => {};

    if (user.role === 'admin') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setAllUsers(snap.docs.map(d => d.data() as UserProfile));
      });
      unsubScans = onSnapshot(collection(db, 'scans'), (snap) => {
        setScans(snap.docs.map(d => d.data() as ScanRecord));
      });
    }

    return () => { 
      unsubMeds(); 
      unsubArts(); 
      unsubUsers(); 
      unsubScans(); 
    };
  }, [user]);

  if (authLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="text-center py-20 text-slate-500">Please login to access the dashboard.</div>;

  if (user.status === 'pending') {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-3xl shadow-xl text-center border border-amber-100">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="text-amber-500 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Pending Approval</h2>
        <p className="text-slate-600">Your professional registration has been received. An administrator will review your credentials shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome, {user.displayName}</h1>
        <p className="text-slate-500">Here's an overview of your professional activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
              <Package size={20} />
            </div>
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Medicines</h3>
          </div>
          <div className="text-3xl font-black text-slate-900">{medicines.length}</div>
          <Link to="/medicines" className="mt-4 flex items-center gap-1 text-xs font-bold text-violet-600 hover:gap-2 transition-all">
            Manage <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Articles</h3>
          </div>
          <div className="text-3xl font-black text-slate-900">{articles.length}</div>
          <Link to="/articles" className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 hover:gap-2 transition-all">
            Manage <ArrowRight size={14} />
          </Link>
        </div>

        {user.role === 'admin' && (
          <>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <Users size={20} />
                </div>
                <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total Users</h3>
              </div>
              <div className="text-3xl font-black text-slate-900">{allUsers.length}</div>
              <Link to="/users" className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-600 hover:gap-2 transition-all">
                Manage <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <BarChart3 size={20} />
                </div>
                <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total Scans</h3>
              </div>
              <div className="text-3xl font-black text-slate-900">{scans.length}</div>
              <Link to="/analytics" className="mt-4 flex items-center gap-1 text-xs font-bold text-rose-600 hover:gap-2 transition-all">
                View <ArrowRight size={14} />
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock size={20} className="text-violet-600" />
            Recent Medicines
          </h2>
          <div className="space-y-4">
            {medicines.slice(0, 5).map(med => (
              <div key={med.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">{med.name}</div>
                  <div className="text-xs text-slate-500 font-mono">Batch: {med.batchNumber}</div>
                </div>
                <Link to="/medicines" className="p-2 text-slate-400 hover:text-violet-600 transition-colors">
                  <ArrowRight size={18} />
                </Link>
              </div>
            ))}
            {medicines.length === 0 && <p className="text-slate-400 text-sm italic">No medicines registered.</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            System Status
          </h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="font-bold text-slate-900">Security Active</div>
                <div className="text-sm text-slate-500">AES-256 Encryption enabled for all QR codes.</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-violet-600">
                <Package size={24} />
              </div>
              <div>
                <div className="font-bold text-slate-900">Database Synced</div>
                <div className="text-sm text-slate-500">Real-time synchronization with Firestore active.</div>
              </div>
            </div>
            {user.role === 'admin' && scans.filter(s => !s.isAuthentic).length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="font-bold text-red-900">Security Alert</div>
                  <div className="text-sm text-red-700">{scans.filter(s => !s.isAuthentic).length} failed verifications detected.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
