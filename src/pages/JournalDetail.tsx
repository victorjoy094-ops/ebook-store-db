import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import { 
  ArrowLeft, 
  Calendar, 
  User as UserIcon, 
  Tag as TagIcon, 
  FileText, 
  Download, 
  Share2, 
  Lock,
  ChevronRight,
  BookOpen,
  Eye,
  ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";

export default function JournalDetail() {
  const { id } = useParams();
  const { user, profile, signIn } = useAuth();
  const navigate = useNavigate();
  const [journal, setJournal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    const fetchJournal = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, "journals", id));
        if (docSnap.exists()) {
          setJournal({ id: docSnap.id, ...docSnap.data() });
        } else {
          toast.error("Journal not found");
          navigate("/journals");
        }
      } catch (err) {
        console.error("Fetch journal error:", err);
        // If 403, we know they aren't authorized
        if (err instanceof Error && err.message.includes('insufficient permissions')) {
            // We still have the partial journal from state maybe or just the ID
        }
      } finally {
        setLoading(false);
      }
    };
    fetchJournal();
  }, [id, navigate]);

  const hasAccess = profile?.subscriptionTier && profile.subscriptionTier !== "free";

  const handleRead = async () => {
    if (!user) {
      toast.error("Please sign in first");
      signIn();
      return;
    }
    if (!hasAccess) {
      toast.error("Active membership required to read full text");
      navigate("/subscriptions");
      return;
    }
    
    setIsReading(true);
    // Increment read count
    try {
        await updateDoc(doc(db, "journals", id!), {
            readCount: increment(1)
        });
    } catch (e) {
        console.error("Read count update error:", e);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{journal ? `${journal.title} | JM Journals` : 'Journal Detail'}</title>
      </Helmet>

      {/* Header Navigation */}
      <div className="sticky top-16 z-30 border-b border-slate-100 bg-white/80 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/journals" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand">
            <ArrowLeft size={16} /> Back to Directory
          </Link>
          <div className="flex gap-4">
            <button className="text-slate-400 hover:text-brand transition-colors"><Share2 size={18} /></button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
        >
          {/* Metadata */}
          <div className="mb-8 flex flex-wrap gap-4">
            <span className="rounded-full bg-slate-100 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
              Peer-Reviewed
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand">
              <TagIcon size={12} /> {journal.category}
            </span>
          </div>

          <h1 className="text-4xl font-black leading-[1.1] text-slate-900 md:text-5xl">
            {journal.title}
          </h1>

          <div className="mt-8 flex flex-wrap items-center gap-8 border-y border-slate-100 py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <UserIcon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Main Author</p>
                <p className="text-sm font-bold text-slate-900">{journal.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Published On</p>
                <p className="text-sm font-bold text-slate-900">
                   {journal.createdAt?.toDate ? journal.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Recently"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Eye size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Views</p>
                <p className="text-sm font-bold text-slate-900">{journal.readCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Abstract Section */}
          <div className="mt-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Abstract</h2>
            <div className="mt-6 text-xl leading-relaxed text-slate-600 font-serif italic border-l-4 border-brand pl-8">
              {journal.abstract}
            </div>
          </div>

          {/* Access Control Card */}
          {!hasAccess ? (
            <div className="mt-16 overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl md:p-12">
              <div className="flex flex-col gap-8 md:flex-row md:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Lock size={40} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black tracking-tight">Full-Text Locked.</h3>
                  <p className="mt-2 text-slate-400">
                    This scholarly article is restricted to JM Books members. Join over 10,000 researchers with our academic tier.
                  </p>
                </div>
                <Link 
                  to="/subscriptions" 
                  className="rounded-full bg-brand px-10 py-5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95"
                >
                  Join Membership — $5/mo
                </Link>
              </div>
              
              <div className="mt-12 grid grid-cols-1 gap-6 border-t border-white/10 pt-12 md:grid-cols-3">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                  <FileText className="text-brand" size={16} /> PDF Download Available
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                  <BookOpen className="text-brand" size={16} /> Unlimited Article Access
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                  <ShieldAlert className="text-brand" size={16} /> Verified Research
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-16 space-y-12">
               <button 
                  onClick={handleRead}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand py-6 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-brand/20 transition-all hover:opacity-90"
               >
                  <FileText size={20} /> Open Manuscript
               </button>

               {isReading ? (
                 <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
                    <FileText size={64} className="mx-auto mb-6 text-slate-300" />
                    <h3 className="text-2xl font-black text-slate-900">PDF Reader Interface</h3>
                    <p className="mx-auto mt-4 max-w-md text-slate-500">
                        In a production environment, this would initialize a secure PDF viewer or download stream for: 
                        <br/>
                        <span className="font-mono text-[10px] bg-white px-2 py-1 rounded mt-2 inline-block border border-slate-100">{journal.contentUrl}</span>
                    </p>
                    <a 
                      href={journal.contentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      <Download size={14} /> Download PDF
                    </a>
                 </div>
               ) : (
                 <div className="flex flex-col gap-8 rounded-3xl bg-slate-50 p-12 text-center">
                    <div className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
                    <p className="text-sm font-bold text-slate-400">Click the button above to begin reading the full manuscript.</p>
                 </div>
               )}
            </div>
          )}

          {/* Citation Info */}
          <div className="mt-24 border-t border-slate-100 pt-16">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Citation</h3>
            <div className="mt-6 rounded-2xl bg-slate-50 p-6 font-mono text-xs text-slate-600 border border-slate-200">
              {journal.author}. ({journal.createdAt?.toDate ? journal.createdAt.toDate().getFullYear() : "2026"}). {journal.title}. JM Scholarly Journals. Available at: https://jmbooks.com/journal/{journal.id}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
