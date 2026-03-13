import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/Layout';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { Article, Medicine } from '../types';
import { Plus, FileText, Trash2, Eye, XCircle, Clock, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import QRCode from 'qrcode';

export default function Articles() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [articles, setArticles] = useState<Article[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showAddArt, setShowAddArt] = useState(false);
  const [showQrArt, setShowQrArt] = useState<Article | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [newArt, setNewArt] = useState({ 
    title: '', 
    content: '', 
    medicineId: '', 
    imageUrl: '', 
    videoUrl: '', 
    status: 'public' as 'public' | 'private' 
  });

  useEffect(() => {
    if (showQrArt) {
      QRCode.toDataURL(`${window.location.origin}/article/${showQrArt.id}`)
        .then(setQrCodeData)
        .catch(console.error);
    }
  }, [showQrArt]);

  useEffect(() => {
    if (!user) return;

    const artQuery = user.role === 'admin'
      ? query(collection(db, 'articles'))
      : query(collection(db, 'articles'), where('authorUid', '==', user.uid));

    const unsubArts = onSnapshot(artQuery, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'articles'));

    const medQuery = user.role === 'admin' 
      ? query(collection(db, 'medicines'))
      : query(collection(db, 'medicines'), where('manufacturerUid', '==', user.uid));
    
    const unsubMeds = onSnapshot(medQuery, (snap) => {
      setMedicines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicine)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'medicines'));

    return () => { unsubArts(); unsubMeds(); };
  }, [user]);

  const handleCreateArt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const artId = newArt.medicineId || Math.random().toString(36).substring(2, 15);
      const artData: Article = {
        id: artId,
        ...newArt,
        authorUid: user!.uid,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'articles', artId), artData);
      setShowAddArt(false);
      setNewArt({ title: '', content: '', medicineId: '', imageUrl: '', videoUrl: '', status: 'public' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'articles');
    }
  };

  const deleteArt = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      await deleteDoc(doc(db, 'articles', id));
    }
  };

  if (authLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="text-center py-20 text-slate-500">Please login to access this page.</div>;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Articles & Guidelines</h1>
          <p className="text-slate-500">Create and manage safety guidelines for your products.</p>
        </div>
        <button 
          onClick={() => setShowAddArt(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-100 w-full md:w-auto"
        >
          <Plus size={20} /> New Article
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map(art => (
          <motion.div layout key={art.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <FileText size={24} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowQrArt(art)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                  <QrCode size={18} />
                </button>
                <Link to={`/article/${art.id}`} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                  <Eye size={18} />
                </Link>
                <button onClick={() => deleteArt(art.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{art.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{art.content}</p>
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${art.status === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {art.status}
              </span>
              {art.medicineId && (
                <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Linked to QR</span>
              )}
            </div>
          </motion.div>
        ))}
        {articles.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No articles published yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showQrArt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQrArt(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-6">Article QR Code</h2>
              {qrCodeData ? (
                <img src={qrCodeData} alt="QR Code" className="w-full h-auto" />
              ) : (
                <div className="w-full h-64 bg-slate-100 rounded-2xl flex items-center justify-center">Loading...</div>
              )}
              <button onClick={() => setShowQrArt(null)} className="mt-6 w-full py-3 px-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddArt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddArt(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Create New Article</h2>
              <form onSubmit={handleCreateArt} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Title</label>
                  <input required value={newArt.title} onChange={e => setNewArt({...newArt, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="e.g. Safety Guidelines for Paracetamol" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Link to Medicine (Optional)</label>
                  <select value={newArt.medicineId} onChange={e => setNewArt({...newArt, medicineId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all">
                    <option value="">None (Standalone Article)</option>
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.batchNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Content (Markdown Supported)</label>
                  <div data-color-mode="light">
                    <MDEditor
                      value={newArt.content}
                      onChange={(val) => setNewArt({ ...newArt, content: val || '' })}
                      preview="edit"
                      height={300}
                      className="rounded-xl overflow-hidden border border-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Image URL (Optional)</label>
                    <input value={newArt.imageUrl} onChange={e => setNewArt({...newArt, imageUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="https://example.com/image.jpg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Video URL (Optional)</label>
                    <input value={newArt.videoUrl} onChange={e => setNewArt({...newArt, videoUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all" placeholder="YouTube or MP4 link" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddArt(false)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100">Publish Article</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
