import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/Layout';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { UserProfile, Medicine, Article } from '../types';
import { Users, CheckCircle, XCircle, Package, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManagement() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedUserForData, setSelectedUserForData] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    const unsubMeds = onSnapshot(collection(db, 'medicines'), (snap) => {
      setMedicines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicine)));
    });

    const unsubArts = onSnapshot(collection(db, 'articles'), (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
    });

    return () => { unsubUsers(); unsubMeds(); unsubArts(); };
  }, [user]);

  const updateUserStatus = async (uid: string, status: UserProfile['status']) => {
    await updateDoc(doc(db, 'users', uid), { status });
  };

  const updateUserRole = async (uid: string, role: UserProfile['role']) => {
    await updateDoc(doc(db, 'users', uid), { role });
  };

  if (authLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user || user.role !== 'admin') return <div className="text-center py-20 text-slate-500">Access Denied. Admin only.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-slate-500">Review and manage professional registrations.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allUsers.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedUserForData(u)}
                      className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                    >
                      {u.displayName}
                    </button>
                    <div className="text-sm text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                      u.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                      u.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {u.status !== 'approved' && (
                        <button onClick={() => updateUserStatus(u.uid, 'approved')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Approve">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {u.status !== 'suspended' && (
                        <button onClick={() => updateUserStatus(u.uid, 'suspended')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Suspend">
                          <XCircle size={18} />
                        </button>
                      )}
                      {user.email === 'imtiazhaque413@gmail.com' && u.role !== 'admin' && (
                        <button onClick={() => updateUserRole(u.uid, 'admin')} className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Make Admin">
                          <Users size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedUserForData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUserForData(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Data for {selectedUserForData.displayName}</h2>
                  <p className="text-slate-500">{selectedUserForData.email} • {selectedUserForData.role}</p>
                </div>
                <button onClick={() => setSelectedUserForData(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <XCircle size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Package size={20} className="text-indigo-600" />
                    Medicines ({medicines.filter(m => m.manufacturerUid === selectedUserForData.uid).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {medicines.filter(m => m.manufacturerUid === selectedUserForData.uid).map(m => (
                      <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1">Batch: {m.batchNumber}</div>
                      </div>
                    ))}
                    {medicines.filter(m => m.manufacturerUid === selectedUserForData.uid).length === 0 && (
                      <p className="text-slate-400 text-sm italic">No medicines found for this user.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-indigo-600" />
                    Articles ({articles.filter(a => a.authorUid === selectedUserForData.uid).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {articles.filter(a => a.authorUid === selectedUserForData.uid).map(a => (
                      <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="font-bold text-slate-900">{a.title}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{a.content}</div>
                      </div>
                    ))}
                    {articles.filter(a => a.authorUid === selectedUserForData.uid).length === 0 && (
                      <p className="text-slate-400 text-sm italic">No articles found for this user.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
