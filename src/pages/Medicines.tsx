import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/Layout';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { Medicine } from '../types';
import { Plus, QrCode, Package, Trash2, Download, XCircle, ShieldCheck, Clock, Search } from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { encryptMedicineId } from '../utils/crypto';

export default function Medicines() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', batchNumber: '', mfgDate: '', expiryDate: '' });
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [activeMedId, setActiveMedId] = useState<string | null>(null);
  const [qrOptions, setQrOptions] = useState<{
    width: number;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  }>({
    width: 400,
    errorCorrectionLevel: 'M'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const medQuery = user.role === 'admin' 
      ? query(collection(db, 'medicines'))
      : query(collection(db, 'medicines'), where('manufacturerUid', '==', user.uid));
    
    const unsubMeds = onSnapshot(medQuery, (snap) => {
      setMedicines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicine)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'medicines'));

    return () => unsubMeds();
  }, [user]);

  const handleCreateMed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const medId = Math.random().toString(36).substring(2, 15);
      const medData: Medicine = {
        id: medId,
        ...newMed,
        manufacturerUid: user!.uid,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'medicines', medId), medData);
      setShowAddMed(false);
      setNewMed({ name: '', batchNumber: '', mfgDate: '', expiryDate: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'medicines');
    }
  };

  const deleteMed = async (id: string) => {
    if (confirm('Are you sure you want to delete this medicine and its verification code?')) {
      await deleteDoc(doc(db, 'medicines', id));
    }
  };

  const generateQR = async (medId: string, options = qrOptions) => {
    setActiveMedId(medId);
    const encryptedPayload = encryptMedicineId(medId);
    
    // Generate PNG for preview
    const qrPng = await QRCode.toDataURL(encryptedPayload, { 
      width: options.width, 
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: 2 
    });
    setQrPreview(qrPng);

    // Generate SVG for high-quality download
    const svgString = await QRCode.toString(encryptedPayload, {
      type: 'svg',
      width: options.width,
      errorCorrectionLevel: options.errorCorrectionLevel,
      margin: 2
    });
    setQrSvg(svgString);
  };

  const downloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification-code-${activeMedId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeMedId && qrPreview) {
      generateQR(activeMedId);
    }
  }, [qrOptions]);

  const filteredMedicines = medicines.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Medicine Management</h1>
          <p className="text-slate-500">Register and manage your pharmaceutical products.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search name or batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setShowAddMed(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={20} /> New Medicine
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMedicines.map(med => (
          <motion.div layout key={med.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Package size={24} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => generateQR(med.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <QrCode size={18} />
                </button>
                <button onClick={() => deleteMed(med.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{med.name}</h3>
            <p className="text-sm text-slate-500 mb-4 font-mono">Batch: {med.batchNumber}</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase text-slate-400">
              <div>MFG: <span className="text-slate-700">{med.mfgDate}</span></div>
              <div>EXP: <span className="text-slate-700">{med.expiryDate}</span></div>
            </div>
          </motion.div>
        ))}
        {filteredMedicines.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Package size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">
              {searchTerm ? `No medicines matching "${searchTerm}"` : 'No medicines registered yet.'}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddMed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMed(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Register New Medicine</h2>
              <form onSubmit={handleCreateMed} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Medicine Name</label>
                  <input required value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Paracetamol 500mg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Batch Number</label>
                  <input required value={newMed.batchNumber} onChange={e => setNewMed({...newMed, batchNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. BN-2024-001" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">MFG Date</label>
                    <input required type="date" value={newMed.mfgDate} onChange={e => setNewMed({...newMed, mfgDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 uppercase tracking-wider">Expiry Date</label>
                    <input required type="date" value={newMed.expiryDate} onChange={e => setNewMed({...newMed, expiryDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddMed(false)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Register Medicine</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {qrPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setQrPreview(null); setActiveMedId(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Verification Code</h2>
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  <ShieldCheck size={12} /> Securely Encrypted
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Size (px)</label>
                  <select 
                    value={qrOptions.width} 
                    onChange={e => setQrOptions({...qrOptions, width: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={200}>Small (200px)</option>
                    <option value={400}>Medium (400px)</option>
                    <option value={600}>Large (600px)</option>
                    <option value={1000}>Print (1000px)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precision</label>
                  <select 
                    value={qrOptions.errorCorrectionLevel} 
                    onChange={e => setQrOptions({...qrOptions, errorCorrectionLevel: e.target.value as any})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6 inline-block">
                <img src={qrPreview} alt="QR Code" className="w-64 h-64 mx-auto rounded-lg shadow-sm" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <a href={qrPreview} download={`verification-code-${activeMedId}.png`} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">
                    <Download size={18} /> PNG
                  </a>
                  <button onClick={downloadSvg} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all">
                    <Download size={18} /> SVG
                  </button>
                </div>
                <button onClick={() => { setQrPreview(null); setQrSvg(null); setActiveMedId(null); }} className="w-full py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
