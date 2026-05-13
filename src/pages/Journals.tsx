import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import { BookOpen, Search, Filter, Lock, ArrowRight, Quote, FileText, Download } from "lucide-react";
import { AdSpace } from "../components/ads/AdSpace";

export default function Journals() {
  const { user, profile, signIn } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Science", "Technology", "Economics", "Humanities", "Medicine", "Arts"];

  useEffect(() => {
    const fetchJournals = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, "journals"), where("status", "==", "published"), orderBy("createdAt", "desc"));
        
        if (activeCategory !== "All") {
          q = query(collection(db, "journals"), 
            where("status", "==", "published"), 
            where("category", "==", activeCategory),
            orderBy("createdAt", "desc")
          );
        }

        const snap = await getDocs(q);
        setJournals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching journals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJournals();
  }, [activeCategory]);

  const filteredJournals = journals.filter(j => 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasAccess = profile?.subscriptionTier && profile.subscriptionTier !== "free";

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Helmet>
        <title>Scholarly Journals & Articles | JM Books</title>
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-dark py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brand blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-accent blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                Research that <span className="text-brand">Matters.</span>
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-slate-300">
                Access a curated repository of scholarly journals, peer-reviewed articles, and professional research across multiple disciplines.
              </p>
              
              {!hasAccess && (
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link 
                    to="/subscriptions" 
                    className="rounded-full bg-brand px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-brand/20 transition-all hover:-translate-y-1 hover:shadow-2xl"
                  >
                    Get Unlimited Access — $5/mo
                  </Link>
                  <button 
                    onClick={() => {
                        const el = document.getElementById('browse-journals');
                        el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="rounded-full bg-white/10 px-8 py-4 text-sm font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/20"
                  >
                    Browse Directory
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <div id="browse-journals" className="sticky top-16 z-40 border-b border-slate-200 bg-white/80 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat 
                    ? "bg-brand text-white shadow-md shadow-brand/20" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search journals or authors..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-full border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </div>

      {/* Journal Grid */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row">
            <div className="flex-1">
                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
                        ))}
                    </div>
                ) : filteredJournals.length > 0 ? (
                    <div className="grid gap-8 md:grid-cols-2">
                        {filteredJournals.map((journal) => (
                            <motion.div
                                key={journal.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-xl hover:border-brand/20"
                            >
                                <div className="flex flex-col p-8">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="rounded-full bg-brand/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-brand">
                                            {journal.category || "General"}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {journal.createdAt?.toDate ? journal.createdAt.toDate().toLocaleDateString() : "New"}
                                        </span>
                                    </div>
                                    
                                    <Link to={`/journal/${journal.id}`}>
                                        <h3 className="text-xl font-black leading-tight text-slate-900 group-hover:text-brand transition-colors line-clamp-2">
                                            {journal.title}
                                        </h3>
                                    </Link>
                                    
                                    <p className="mt-2 text-sm font-bold text-slate-500 italic">By {journal.author}</p>
                                    
                                    <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3">
                                        {journal.abstract}
                                    </p>
                                    
                                    <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                <BookOpen size={12} />
                                                <span>{journal.readCount || 0} Reads</span>
                                            </div>
                                        </div>
                                        
                                        <Link 
                                            to={`/journal/${journal.id}`}
                                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                hasAccess ? "text-brand hover:gap-3" : "text-slate-400"
                                            }`}
                                        >
                                            {hasAccess ? (
                                                <>Read Full Text <ArrowRight size={14} /></>
                                            ) : (
                                                <><Lock size={12} /> Members Only</>
                                            )}
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
                        <Quote size={48} className="mx-auto mb-4 text-slate-200" />
                        <h3 className="text-lg font-bold text-slate-900">No journals found</h3>
                        <p className="mt-2 text-slate-500">Try adjusting your search or category filter.</p>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <aside className="w-full space-y-8 lg:w-80">
                <div className="rounded-2xl bg-brand p-8 text-white shadow-xl">
                    <h3 className="text-lg font-black uppercase tracking-wider">Publish Yours</h3>
                    <p className="mt-2 text-sm leading-relaxed opacity-90">
                        Are you a researcher or academic? Submit your work to our peer-review panel.
                    </p>
                    <ul className="mt-6 space-y-3">
                        <li className="flex items-center gap-2 text-xs font-bold">
                            <div className="h-1 w-1 rounded-full bg-white" />
                            $40 Submission Fee
                        </li>
                        <li className="flex items-center gap-2 text-xs font-bold">
                            <div className="h-1 w-1 rounded-full bg-white" />
                            Peer Review Vetting
                        </li>
                        <li className="flex items-center gap-2 text-xs font-bold">
                            <div className="h-1 w-1 rounded-full bg-white" />
                            Revenue Split per Read
                        </li>
                    </ul>
                    <Link 
                        to="/publish" 
                        className="mt-8 block w-full rounded bg-white py-3 text-center text-[10px] font-black uppercase tracking-widest text-brand transition-transform hover:scale-[1.02]"
                    >
                        Submit Manuscript
                    </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Trending Research</h3>
                    <div className="space-y-4">
                        {journals.slice(0, 3).map((j, i) => (
                            <Link key={j.id} to={`/journal/${j.id}`} className="block group">
                                <span className="text-[8px] font-black text-brand uppercase">{j.category}</span>
                                <h4 className="text-xs font-black text-slate-900 line-clamp-2 group-hover:text-brand">{j.title}</h4>
                            </Link>
                        ))}
                    </div>
                </div>

                <AdSpace position="store_sidebar" />
            </aside>
        </div>
      </main>
    </div>
  );
}
