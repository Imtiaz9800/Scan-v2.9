import React, { useState, useEffect, useContext, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Medicine, Article } from '../types';
import { ShieldCheck, ShieldAlert, Package, Calendar, Hash, ArrowRight, Info, Camera, StopCircle, RefreshCw, Upload } from 'lucide-react';
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
  
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verifyMedicine = async (rawPayload: string) => {
    setLoading(true);
    setScanResult(null);
    setRelatedArticle(null);
    
    try {
      let medicineId: string | null = null;
      
      // 1. Try to decrypt directly (New raw payload format)
      medicineId = decryptMedicineId(rawPayload);
      
      // 2. If not raw, try to extract from URL (Legacy format support)
      if (!medicineId) {
        try {
          const url = new URL(rawPayload);
          const pathParts = url.pathname.split('/');
          if (pathParts.includes('verify')) {
            const encryptedPart = pathParts[pathParts.indexOf('verify') + 1];
            medicineId = decryptMedicineId(decodeURIComponent(encryptedPart));
          }
        } catch (e) {
          // Not a URL, and not a raw encrypted payload we recognize
        }
      }

      if (!medicineId) {
        setScanResult({
          medicine: null,
          isAuthentic: false,
          error: "This code is not recognized by the ScanRx secure network. It may be a counterfeit or from an unsupported system."
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
        isAuthentic,
        rawPayload: rawPayload.substring(0, 100) // Log first 100 chars for audit
      });

      if (isAuthentic) {
        // Check for related article
        const artDoc = await getDoc(doc(db, 'articles', medicineId));
        if (artDoc.exists()) {
          setRelatedArticle(artDoc.data() as Article);
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      setScanResult({
        medicine: null,
        isAuthentic: false,
        error: "A technical error occurred during verification. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      verifyMedicine(decodeURIComponent(id));
    }
  }, [id]);

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices.map(d => ({ id: d.id, label: d.label })));
        setSelectedCamera(devices[0].id);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
      setCameraError("Could not access camera devices. Please ensure permissions are granted.");
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(e => console.error(e));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) return;
    
    try {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      setIsScanning(true);
      setCameraError(null);

      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          verifyMedicine(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // ignore scan errors
        }
      );
    } catch (err) {
      console.error("Unable to start scanning", err);
      setCameraError("Failed to start camera. It might be in use by another application.");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Unable to stop scanning", err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      verifyMedicine(decodedText);
    } catch (err) {
      console.error("Error scanning file", err);
      setScanResult({
        medicine: null,
        isAuthentic: false,
        error: "Could not find a valid QR code in the uploaded image. Please try a clearer photo."
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
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

      <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Scanner Section */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="mb-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Camera</label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      disabled={isScanning}
                      className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 transition-all"
                    >
                      {cameras.map(cam => (
                        <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id.substring(0, 5)}`}</option>
                      ))}
                      {cameras.length === 0 && <option value="">No cameras found</option>}
                    </select>
                    <button 
                      onClick={() => Html5Qrcode.getCameras().then(devices => setCameras(devices))}
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shrink-0"
                      title="Refresh cameras"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!isScanning ? (
                    <button 
                      onClick={startScanning}
                      disabled={!selectedCamera}
                      className="h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-100 disabled:opacity-50 px-4 text-sm"
                    >
                      <Camera size={18} className="shrink-0" /> 
                      <span className="whitespace-nowrap">Start Scanning</span>
                    </button>
                  ) : (
                    <button 
                      onClick={stopScanning}
                      className="h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 px-4 text-sm"
                    >
                      <StopCircle size={18} className="shrink-0" /> 
                      <span className="whitespace-nowrap">Stop Scanner</span>
                    </button>
                  )}

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="h-12 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 px-4 text-sm"
                  >
                    <Upload size={18} className="shrink-0" /> 
                    <span className="whitespace-nowrap">Upload Image</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>


              <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden group">
                <div id="reader" className="w-full h-full"></div>
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white p-6 text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                      <Camera className="text-white/40" size={32} />
                    </div>
                    <p className="text-sm font-medium text-white/60">Camera is currently inactive.<br/>Click "Start Scanning" to begin.</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 text-white p-6 text-center backdrop-blur-md">
                    <ShieldAlert className="text-red-400 w-12 h-12 mb-4" />
                    <p className="font-bold mb-2">Camera Error</p>
                    <p className="text-sm text-red-100/70">{cameraError}</p>
                  </div>
                )}
              </div>

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
                      onClick={() => setScanResult(null)}
                      className="bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-colors"
                    >
                      Scan Another Medicine
                    </button>
                  </div>
                )}
                
                {scanResult.isAuthentic && (
                   <button 
                    onClick={() => setScanResult(null)}
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
