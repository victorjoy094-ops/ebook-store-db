import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, User, Calendar, ArrowRight, Loader2 } from "lucide-react";

export function Stories() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const q = query(
          collection(db, "stories"),
          where("status", "==", "published"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching stories:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <Loader2 className="animate-spin text-brand" size={40} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mb-16 text-center space-y-4">
        <h1 className="text-6xl font-black tracking-tight text-slate-900 font-serif italic">Great stories, curated for you.</h1>
        <p className="mx-auto max-w-2xl text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
          Discover insights from authors around the world. Securely distributed on JM BOOKS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story, idx) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link to={`/story/${story.id}`} className="group block space-y-6">
              <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl">
                {story.coverUrl ? (
                  <img src={story.coverUrl} alt={story.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-200 text-slate-400">
                    <BookOpen size={40} />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand">
                  <span>{story.category || "General"}</span>
                  <span className="h-1 w-1 rounded-full bg-brand/30" />
                  <span>5 min read</span>
                </div>
                <h3 className="text-2xl font-black leading-tight text-slate-900 group-hover:text-brand transition-colors">
                  {story.title}
                </h3>
                <p className="line-clamp-3 text-sm font-medium text-slate-500 leading-relaxed italic">
                  {story.summary}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                      {story.authorName?.[0] || <User size={14} />}
                    </div>
                    <span className="text-xs font-bold text-slate-600">{story.authorName}</span>
                  </div>
                  <ArrowRight className="text-slate-200 group-hover:text-brand group-hover:translate-x-1 transition-all" size={18} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {stories.length === 0 && (
        <div className="py-32 text-center">
          <BookOpen className="mx-auto mb-4 text-slate-200" size={64} />
          <h2 className="text-xl font-bold text-slate-900">No stories published yet.</h2>
          <p className="text-slate-500">Check back later for fresh content!</p>
        </div>
      )}
    </div>
  );
}
