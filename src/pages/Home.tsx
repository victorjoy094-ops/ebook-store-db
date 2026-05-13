import { useEffect, useState } from "react";
import { collection, query, limit, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BookCard } from "../components/books/BookCard";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { AdSpace } from "../components/ads/AdSpace";

export function Home() {
  const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all published books for collections filtering
        const booksSnap = await getDocs(query(
          collection(db, "books"), 
          where("status", "==", "published"),
          orderBy("createdAt", "desc")
        ));
        const books = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        setAllBooks(books);
        setFeaturedBooks(books.slice(0, 8));

        // Fetch active collections
        const collsSnap = await getDocs(query(collection(db, "collections"), where("isActive", "==", true), limit(3)));
        setCollections(collsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <div className="absolute right-0 top-0 rounded-bl-lg bg-orange-500 px-4 py-1.5 text-[10px] font-bold text-white uppercase tracking-widest">
              Featured
            </div>
            
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">New Release</span>
                <h1 className="mt-4 font-serif text-5xl font-bold leading-tight text-brand-dark md:text-6xl">
                   JM BOOKS <br />
                   <span className="italic text-slate-400">Unlimited Reading.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
                   From essential educational textbooks and lecture notes to captivating fiction and insightful non-fiction, discover a world of knowledge and stories.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link to="/store" className="rounded bg-brand px-8 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90">
                    Browse All Titles
                  </Link>
                  <Link to="/subscriptions" className="rounded border border-slate-300 bg-white px-8 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                    Membership Details
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative hidden h-[400px] items-center justify-center lg:flex"
              >
                <div className="relative z-10 flex h-72 w-52 flex-col justify-center rounded-lg border-l-4 border-slate-700 bg-slate-800 p-6 text-center text-white shadow-2xl">
                  <p className="text-[9px] opacity-60">ISBN-13: 978-0123456789</p>
                  <h4 className="mt-2 font-serif text-xl italic leading-tight">The Art of Scalable Systems</h4>
                  <div className="mx-auto my-4 h-0.5 w-8 bg-orange-500" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">JM PRESS</p>
                </div>
                <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-brand/5 blur-3xl" />
                <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
              </motion.div>
            </div>
          </div>
          <AdSpace position="home_hero" className="mt-8 rounded-xl overflow-hidden" />
        </div>
      </section>

      {/* Curated Collections */}
      {collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 bg-slate-50/50">
          <div className="mb-12 text-center">
             <span className="text-[10px] font-black uppercase tracking-widest text-brand">Handpicked Lists</span>
             <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Curated Collections</h2>
             <p className="mt-4 text-slate-500 max-w-2xl mx-auto">Discover themed collections and staff-recommended titles selected by our expert editorial team.</p>
          </div>

          <div className="space-y-24">
            {collections.map((coll, idx) => {
              const collectionBooks = allBooks.filter(b => coll.bookIds.includes(b.id));
              if (collectionBooks.length === 0) return null;

              return (
                <div key={coll.id} className={`flex flex-col gap-12 ${idx % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center`}>
                  <div className="w-full lg:w-1/3 space-y-6">
                    <div className="flex items-center gap-2">
                       <div className="h-0.5 w-8 bg-brand"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-brand">{coll.type.replace('_', ' ')}</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900">{coll.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{coll.description || "A special selection of titles chosen for our community."}</p>
                    <Link to="/store" className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline">
                      Explore this collection <ArrowRight size={16} />
                    </Link>
                  </div>
                  <div className="grid w-full lg:w-2/3 grid-cols-2 gap-6 sm:grid-cols-4">
                    {collectionBooks.slice(0, 4).map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdSpace position="home_featured" className="rounded-xl" />
      </div>

      {/* Stats/Features */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 border-y border-slate-200 py-12 md:grid-cols-4">
          <div className="text-center">
            <h4 className="text-2xl font-bold text-brand-dark">50k+</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ebooks</p>
          </div>
          <div className="text-center">
            <h4 className="text-2xl font-bold text-brand-dark">12k+</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Readers</p>
          </div>
          <div className="text-center">
            <h4 className="text-2xl font-bold text-brand-dark">USD</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Global Payments</p>
          </div>
          <div className="text-center">
            <h4 className="text-2xl font-bold text-brand-dark">24/7</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Instant Access</p>
          </div>
        </div>
      </section>

      {/* stats section ends */}
      
      {/* Category Sections */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {[
          { title: "Educational Textbook", description: "Essential academic resources across various disciplines.", category: "Educational Textbook" },
          { title: "Lecture Notes", description: "Comprehensive study materials and summarized course content.", category: "Lecture Notes" },
          { title: "Fiction", description: "Get lost in imaginative worlds and compelling narratives.", category: "Fiction" },
          { title: "Non-Fiction", description: "Real-world insights, history, science, and more.", category: "Non-Fiction" }
        ].map((section, idx) => {
          const sectionBooks = allBooks.filter(b => b.category === section.category).slice(0, 4);
          if (sectionBooks.length === 0) return null;

          return (
            <div key={section.title} className={`mb-24 ${idx !== 0 ? 'pt-24 border-t border-slate-100' : ''}`}>
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{section.title}</h2>
                  <p className="mt-2 text-slate-500">{section.description}</p>
                </div>
                <Link 
                  to={`/store?category=${section.category}`} 
                  className="flex items-center gap-1 text-sm font-bold text-brand hover:underline"
                >
                  View All <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {sectionBooks.map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Book Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Recently Added Titles</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 uppercase tracking-widest">Handpicked for your library</p>
          </div>
          <Link to="/store" className="text-sm font-bold text-brand hover:underline">
            View All Categories &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="animate-pulse space-y-4">
                <div className="aspect-[3/4] rounded bg-slate-200" />
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 lg:grid-cols-4">
            {featuredBooks.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      {/* Author CTA */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand">For Creators</span>
              <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">Are you a Writer?</h2>
              <p className="mt-6 text-lg text-slate-400">
                Join our exclusive network of published authors. Share your manuscripts with a global audience of premium readers and earn industry-leading 70% royalties.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link 
                  to="/publish" 
                  className="rounded-full bg-brand px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-brand/20 transition-transform hover:scale-105 active:scale-95"
                >
                  Start Publishing
                </Link>
                <div className="flex items-center gap-4 text-slate-400">
                   <div className="h-10 w-[1px] bg-slate-700" />
                   <div className="text-[10px] font-bold uppercase tracking-widest">
                     <p>70% Royalties</p>
                     <p>Global Distro</p>
                   </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="rounded-2xl bg-white/5 p-8 text-center backdrop-blur-sm">
                  <BookOpen className="mx-auto mb-4 text-brand" size={32} />
                  <p className="text-xl font-black">Unlimited</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Uploads</p>
               </div>
               <div className="rounded-2xl bg-white/5 p-8 text-center backdrop-blur-sm">
                  <Zap className="mx-auto mb-4 text-brand" size={32} />
                  <p className="text-xl font-black">Instant</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Approvals</p>
               </div>
               <div className="col-span-2 rounded-2xl bg-brand/10 p-8 text-center border border-brand/20">
                  <ShieldCheck className="mx-auto mb-4 text-brand" size={32} />
                  <p className="text-xl font-black">Verified Author Program</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trusted by 1k+ Publishers</p>
               </div>
            </div>
          </div>
        </div>
      </section>
      {/* Newsletter */}
      <section className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand">Stay Updated</span>
          <h2 className="mt-4 text-4xl font-black text-slate-900 tracking-tight">Join the JM Books community</h2>
          <p className="mt-4 text-lg text-slate-500">
            Get weekly updates on new manuscripts, exclusive author interviews, and premium member discounts.
          </p>
          <form className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="w-full max-w-sm rounded-full border border-slate-200 bg-white px-8 py-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
              required
            />
            <button 
              type="submit"
              className="rounded-full bg-slate-900 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-brand active:scale-95"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            By subscribing, you agree to our <Link to="/about" className="underline">Terms of Service</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
