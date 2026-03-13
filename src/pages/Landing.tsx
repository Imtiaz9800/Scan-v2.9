import React, { useState, useEffect, useContext } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Medicine, Article } from '../types';
import { ShieldCheck, ShieldAlert, Package, Calendar, Hash, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router-dom';

import { decryptMedicineId } from '../utils/crypto';

export default function Landing() {
  const { id } = useParams();
  const [scanResult, setScanResult] = useState<{
    medicine: Medicine | null;
    isAuthentic: boolean;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [relatedArticle, setRelatedArticle] = useState<Article | null>(null);

  const verifyMedicine = async (rawId: string) => {
    setLoading(true);
    let medicineId = rawId;
    try {
      // Try to decrypt if it looks like it might be encrypted
      const decrypted = decryptMedicineId(decodeURIComponent(rawId));
      
      if (decrypted) {
        medicineId = decrypted;
      } else {
        // If it's not a valid encrypted ID, we treat it as unverified/invalid
        setScanResult({
          medicine: null,
          isAuthentic: false,
          error: "Invalid or unverified security code."
        });
        setLoading(false);
        return;
      }

      const medDoc = await getDoc(doc(db, 'medicines', medicineId));
      const isAuthentic = medDoc.exists();
      
      setScanResult({
        medicine: isAuthentic ? (medDoc.data() as Medicine) : null,
        isAuthentic
      });

      // Log scan
      await addDoc(collection(db, 'scans'), {
        medicineId: isAuthentic ? medicineId : 'unknown',
        scannedAt: serverTimestamp(),
        isAuthentic
      });

      if (isAuthentic) {
        // Check for related article
        const artDoc = await getDoc(doc(db, 'articles', medicineId));
        if (artDoc.exists()) {
          setRelatedArticle(artDoc.data() as Article);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `medicines/${medicineId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      verifyMedicine(id);
    }
  }, [id]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    async function onScanSuccess(decodedText: string) {
      let medicineId = decodedText;
      try {
        const url = new URL(decodedText);
        const pathParts = url.pathname.split('/');
        if (pathParts.includes('verify')) {
          medicineId = pathParts[pathParts.indexOf('verify') + 1];
        }
      } catch (e) {}

      verifyMedicine(medicineId);
      scanner.clear();
    }

    function onScanFailure(error: any) {
      if (error && typeof error === 'string' && error.includes('NotAllowedError')) {
        setCameraError("Camera permission denied. Please allow camera access to scan QR codes.");
      }
    }

    return () => {
      scanner.clear().catch(e => {});
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8 md:mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight px-4"
        >
          Verify Your <span className="text-violet-600">Medicine</span>
        </motion.h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-4">
          Scan the QR code on your pharmaceutical medicine to verify its authenticity and access detailed safety information.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Scanner Section */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center min-h-[250px] p-6 text-center bg-red-50 rounded-2xl border-2 border-dashed border-red-200">
                  <ShieldAlert className="text-red-500 w-12 h-12 mb-4" />
                  <p className="text-red-800 font-bold">{cameraError}</p>
                </div>
              ) : (
                <div id="reader" className="rounded-2xl overflow-hidden border-0 bg-slate-50"></div>
              )}
              <div className="mt-6 flex items-start gap-3 text-sm text-slate-500 bg-slate-50 p-4 rounded-xl">
                <Info size={18} className="text-violet-500 shrink-0 mt-0.5" />
                <p>Position the QR code within the frame to start verification automatically.</p>
              </div>
            </div>

        {/* Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!scanResult && !loading && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-violet-50 border-2 border-dashed border-violet-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <ShieldCheck className="text-violet-400 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-violet-900 mb-2">Ready to Scan</h3>
                <p className="text-violet-600/70">Waiting for a valid QR code to be detected...</p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 flex flex-col items-center justify-center min-h-[400px]"
              >
                <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Verifying authenticity...</p>
              </motion.div>
            )}

            {scanResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={clsx(
                  "rounded-3xl p-6 md:p-8 shadow-2xl border-2 min-h-[400px] flex flex-col",
                  scanResult.isAuthentic ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                )}
              >
                <div className="flex items-center gap-4 mb-6 md:mb-8">
                  <div className={clsx(
                    "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0",
                    scanResult.isAuthentic ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {scanResult.isAuthentic ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
                  </div>
                  <div>
                    <h2 className={clsx(
                      "text-xl md:text-2xl font-black uppercase tracking-tight leading-tight",
                      scanResult.isAuthentic ? "text-emerald-900" : "text-red-900"
                    )}>
                      {scanResult.isAuthentic ? "Authentic Medicine" : "Unverified Code"}
                    </h2>
                    <p className={clsx(
                      "text-sm md:text-base font-medium",
                      scanResult.isAuthentic ? "text-emerald-700" : "text-red-700"
                    )}>
                      {scanResult.isAuthentic ? "Verified by ScanRx Network" : "Warning: Potential Counterfeit"}
                    </p>
                  </div>
                </div>

                {scanResult.isAuthentic && scanResult.medicine && (
                  <div className="space-y-4 flex-grow">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/60 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-700/60 text-xs font-bold uppercase mb-1">
                          <Package size={14} /> Medicine
                        </div>
                        <div className="text-emerald-900 font-bold">{scanResult.medicine.name}</div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-700/60 text-xs font-bold uppercase mb-1">
                          <Hash size={14} /> Batch
                        </div>
                        <div className="text-emerald-900 font-bold">{scanResult.medicine.batchNumber}</div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-700/60 text-xs font-bold uppercase mb-1">
                          <Calendar size={14} /> MFG
                        </div>
                        <div className="text-emerald-900 font-bold">{scanResult.medicine.mfgDate}</div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-700/60 text-xs font-bold uppercase mb-1">
                          <Calendar size={14} /> Expiry
                        </div>
                        <div className="text-emerald-900 font-bold">{scanResult.medicine.expiryDate}</div>
                      </div>
                    </div>

                    {relatedArticle && (
                      <Link 
                        to={`/article/${relatedArticle.id}`}
                        className="mt-6 flex items-center justify-between w-full bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Info size={20} />
                          <span className="font-bold">View Safety Guidelines</span>
                        </div>
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}
                  </div>
                )}

                {!scanResult.isAuthentic && (
                  <div className="flex-grow flex flex-col justify-center text-center">
                    <p className="text-red-900/70 font-medium mb-6">
                      {scanResult.error || "This QR code was not generated by our secure platform. Please exercise extreme caution and report this medicine to local authorities."}
                    </p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-colors"
                    >
                      Scan Another Medicine
                    </button>
                  </div>
                )}
                
                {scanResult.isAuthentic && (
                   <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 text-emerald-700 font-bold text-sm hover:underline"
                  >
                    Scan Another Medicine
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
