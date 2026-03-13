import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Article, Medicine } from '../types';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, Calendar, Package, ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function ArticleView() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const artDoc = await getDoc(doc(db, 'articles', id));
        if (artDoc.exists()) {
          const artData = artDoc.data() as Article;
          setArticle(artData);
          
          if (artData.medicineId) {
            const medDoc = await getDoc(doc(db, 'medicines', artData.medicineId));
            if (medDoc.exists()) {
              setMedicine(medDoc.data() as Medicine);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `articles/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  
  if (!article) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-slate-900">Article Not Found</h2>
      <p className="text-slate-500 mb-6">The requested information is either private or does not exist.</p>
      <Link to="/" className="text-indigo-600 font-bold hover:underline">Return Home</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-8 transition-colors group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Scanner
      </Link>

      <motion.article 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        {medicine && (
          <div className="bg-emerald-50 border-b border-emerald-100 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="text-xs font-black uppercase text-emerald-600 tracking-wider">Verified Medicine Info</div>
                <div className="text-lg font-bold text-emerald-900">{medicine.name}</div>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-emerald-600/60 uppercase">Batch Number</div>
              <div className="font-mono font-bold text-emerald-900">{medicine.batchNumber}</div>
            </div>
          </div>
        )}

        <div className="p-8 md:p-12">
          <div className="flex items-center gap-4 text-slate-400 text-sm font-bold uppercase mb-6">
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              {new Date(article.createdAt?.seconds * 1000).toLocaleDateString()}
            </div>
            <div className="w-1 h-1 bg-slate-200 rounded-full" />
            <div className="text-indigo-600">Safety Guidelines</div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
            {article.title}
          </h1>

          {article.imageUrl && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <img 
                src={article.imageUrl} 
                alt={article.title} 
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {article.videoUrl && (
            <div className="mb-8 rounded-2xl overflow-hidden bg-black aspect-video shadow-lg">
              {article.videoUrl.includes('youtube.com') || article.videoUrl.includes('youtu.be') ? (
                <iframe
                  className="w-full h-full"
                  src={article.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  title="Video content"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  src={article.videoUrl} 
                  controls 
                  className="w-full h-full"
                />
              )}
            </div>
          )}

          <div className="prose prose-slate prose-indigo max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-slate-900">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        </div>

        <div className="bg-slate-50 p-8 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                <Package className="text-slate-400" size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Manufacturer</div>
                <div className="text-sm font-bold text-slate-700">Verified Professional</div>
              </div>
            </div>
            <button className="w-full sm:w-auto bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm">
              Report Issue
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
