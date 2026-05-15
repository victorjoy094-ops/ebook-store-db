import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Lock, Sparkles, User, Calendar, BookOpen, Share2, Facebook, Twitter, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";

export function StoryDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [story, setStory] = useState<any>(null);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const fetchStory = async () => {
      if (!id) return;
      try {
        const storyRef = doc(db, "stories", id);
        const storySnap = await getDoc(storyRef);
        if (storySnap.exists()) {
          setStory({ id: storySnap.id, ...storySnap.data() });
          
          // Increment read count (optional, could be done via cloud function or simple write)
          await updateDoc(storyRef, { readCount: increment(1) });
        }
      } catch (err) {
        console.error("Error fetching story:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchFullContent = async () => {
      if (!id) return;
      try {
        const contentRef = doc(db, "stories", id, "content", "full");
        const contentSnap = await getDoc(contentRef);
        if (contentSnap.exists()) {
          setFullContent(contentSnap.data().content);
        }
      } catch (err: any) {
        // Expected error if not authorized (permission-denied)
        console.log("Access restricted to full content", err.message);
      } finally {
        setCheckingAccess(false);
      }
    };

    fetchStory().then(() => fetchFullContent());
  }, [id, user]);

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <Loader2 className="animate-spin text-brand" size={40} />
    </div>
  );

  if (!story) return (
    <div className="mx-auto max-w-7xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Story not found.</h1>
      <Link to="/stories" className="text-brand hover:underline mt-4 inline-block">Back to stories</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <motion.article 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <header className="space-y-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <span className="rounded-full bg-brand/10 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
              {story.category || "General"}
            </span>
            <h1 className="font-serif text-5xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
              {story.title}
            </h1>
          </div>

          <div className="flex items-center justify-center gap-6 border-y border-slate-100 py-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm ring-1 ring-slate-200">
                {story.authorName?.[0] || <User size={20} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900">{story.authorName}</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   <Calendar size={10} />
                   <span>{story.createdAt?.toDate ? story.createdAt.toDate().toLocaleDateString() : "Recently"}</span>
                   <span>·</span>
                   <span>5 min read</span>
                </div>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-100" />
            <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-brand transition-colors"><Share2 size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Twitter size={18} /></button>
            </div>
          </div>
        </header>

        {story.coverUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-3xl bg-slate-100 shadow-2xl shadow-slate-200/50">
            <img src={story.coverUrl} alt={story.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="story-content prose prose-slate prose-lg max-w-none prose-headings:font-serif prose-headings:font-black prose-p:font-serif prose-p:leading-relaxed prose-p:text-slate-700">
          <p className="font-bold text-xl italic text-slate-900 leading-relaxed mb-8">
            {story.summary}
          </p>

          {checkingAccess ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          ) : fullContent ? (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-pre-wrap font-serif"
              >
                {fullContent}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="relative mt-8">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent pt-32" />
              <div className="relative z-10 space-y-12 pb-16 pt-32 text-center">
                 <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand text-white shadow-xl shadow-brand/20">
                   <Lock size={32} />
                 </div>
                 <div className="space-y-4">
                   <h2 className="text-3xl font-black tracking-tight text-slate-900 font-serif">You've reached the end of the preview.</h2>
                   <p className="mx-auto max-w-md text-slate-500 font-medium leading-relaxed italic">
                     Become a member of JM BOOKS for $5/month to read the full story and support independent authors.
                   </p>
                 </div>
                 <div className="flex flex-col items-center gap-4">
                   <Link 
                     to="/subscriptions" 
                     className="rounded-full bg-slate-900 px-10 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-900/20 transition-all hover:bg-brand active:scale-95 flex items-center gap-2"
                   >
                     <Sparkles size={18} />
                     Subscribe to Read More
                   </Link>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cancel any time · Secure Payment</p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </motion.article>

      <footer className="mt-24 border-t border-slate-100 pt-16">
        <div className="rounded-3xl bg-slate-900 p-12 text-white overflow-hidden relative">
           <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
           <div className="relative z-10 space-y-6 text-center">
             <h3 className="text-2xl font-black font-serif italic text-white/90">Love this story?</h3>
             <p className="mx-auto max-w-md text-sm font-medium text-slate-400 leading-relaxed italic">
               Authors on JM BOOKS earn 70% of subscription revenue based on the time you spend reading. Your membership directly supports their work.
             </p>
             <div className="flex justify-center gap-4 pt-4">
                <button 
                    onClick={() => toast.success("Feature coming soon!")}
                    className="rounded-full bg-white/10 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-colors"
                >
                    Follow Author
                </button>
                <Link to="/stories" className="rounded-full bg-brand px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-all">
                    More Stories
                </Link>
             </div>
           </div>
        </div>
      </footer>
    </div>
  );
}
