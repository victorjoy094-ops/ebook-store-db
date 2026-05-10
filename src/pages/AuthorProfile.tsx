import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { BookCard } from "../components/books/BookCard";
import { motion } from "motion/react";
import { User, BookOpen, Star, Globe, Twitter, Mail, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function AuthorProfile() {
  const { id } = useParams();
  const { user, profile, signIn } = useAuth();
  const [author, setAuthor] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    if (profile?.followingAuthors && id) {
      setIsFollowing(profile.followingAuthors.includes(id));
    }
  }, [profile, id]);

  const handleFollow = async () => {
    if (!user) {
      toast.error("Sign in to follow authors");
      signIn();
      return;
    }
    if (!id) return;

    setFollowingLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        followingAuthors: isFollowing ? arrayRemove(id) : arrayUnion(id)
      });
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? "Unfollowed author" : "Following author!");
    } catch (error) {
      toast.error("Failed to update following status");
    } finally {
      setFollowingLoading(false);
    }
  };

  useEffect(() => {
    async function fetchAuthorAndBooks() {
      if (!id) return;
      try {
        const docRef = doc(db, "users", id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setAuthor({ id: snapshot.id, ...snapshot.data() });
        }

        const booksQuery = query(
          collection(db, "books"),
          where("authorId", "==", id),
          where("status", "==", "published"),
          orderBy("createdAt", "desc")
        );
        const booksSnapshot = await getDocs(booksQuery);
        setBooks(booksSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching author data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAuthorAndBooks();
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Author...</div>;
  if (!author) return <div className="flex h-screen items-center justify-center">Author profile not found.</div>;

  return (
    <div className="bg-[#F5F5F0] min-h-screen">
      {/* Header / Hero */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-32 w-32 rounded-full border-4 border-brand bg-slate-800 flex items-center justify-center mb-8 overflow-hidden"
            >
              {author.photoURL ? (
                <img src={author.photoURL} alt={author.displayName} className="h-full w-full object-cover" />
              ) : (
                <User size={64} className="text-slate-600" />
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Verified Author</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight">{author.displayName}</h1>
              
              <div className="mt-6 flex justify-center">
                 <button 
                  onClick={handleFollow}
                  disabled={followingLoading}
                  className={`flex items-center gap-2 rounded-full px-8 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                    isFollowing 
                      ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-800/80" 
                      : "bg-brand text-white shadow-xl shadow-brand/20 hover:bg-brand/90"
                  }`}
                 >
                    {isFollowing ? <Check size={16} /> : <Plus size={16} />}
                    {isFollowing ? "Following" : "Follow Author"}
                 </button>
              </div>

              <p className="mt-8 max-w-2xl text-lg text-slate-400">
                {author.bio || "A passionate writer dedicated to sharing high-quality literature with the world."}
              </p>
              
              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{books.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Publications</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-700" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white">
                    {books.length > 0 ? "4.9" : "0.0"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Avg Rating</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center gap-4">
                 <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-brand transition-colors">
                    <Twitter size={18} />
                 </button>
                 <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-brand transition-colors">
                    <Globe size={18} />
                 </button>
                 <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-brand transition-colors">
                    <Mail size={18} />
                 </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Books Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex items-end justify-between border-b border-slate-200 pb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Bibliography</h2>
            <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">Works published on JM BOOKS</p>
          </div>
          <div className="flex gap-4">
             <span className="text-xs font-bold text-slate-900">Latest</span>
             <span className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">Popular</span>
          </div>
        </div>

        {books.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 lg:grid-cols-4">
            {books.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
             <BookOpen className="mx-auto mb-4 text-slate-200" size={64} />
             <p className="text-lg font-medium text-slate-500 italic">This author hasn't published any works yet.</p>
          </div>
        )}
      </section>

      {/* Recognition / Badges */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border-t border-slate-200">
         <div className="flex flex-wrap justify-center gap-12 py-10 opacity-40">
            <div className="flex items-center gap-2">
               <Star size={20} />
               <span className="text-xs font-black uppercase tracking-widest">Top Rated Author</span>
            </div>
            <div className="flex items-center gap-2">
               <BookOpen size={20} />
               <span className="text-xs font-black uppercase tracking-widest">JM Press Partner</span>
            </div>
            <div className="flex items-center gap-2">
               <Globe size={20} />
               <span className="text-xs font-black uppercase tracking-widest">Global Reach</span>
            </div>
         </div>
      </section>
    </div>
  );
}
