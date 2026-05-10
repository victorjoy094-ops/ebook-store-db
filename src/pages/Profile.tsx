import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { BookCard } from "../components/books/BookCard";
import { User as UserIcon, BookOpen, Star, Crown, Settings, ChevronRight, Heart, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export function Profile() {
  const { user, profile, logOut, walletAddress, connectWallet } = useAuth();
  const [purchasedBooks, setPurchasedBooks] = useState<any[]>([]);
  const [wishlistBooks, setWishlistBooks] = useState<any[]>([]);
  const [followingAuthors, setFollowingAuthors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"library" | "wishlist" | "affiliate" | "following">("library");
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/store?ref=${user?.uid}`;

  useEffect(() => {
    async function fetchCollections() {
      if (!profile) return;
      
      try {
        // Fetch Purchased
        if (profile.purchasedBooks?.length) {
          const pbData = [];
          for (const bookId of profile.purchasedBooks) {
            const bDoc = await getDoc(doc(db, "books", bookId));
            if (bDoc.exists()) pbData.push({ id: bDoc.id, ...bDoc.data() });
          }
          setPurchasedBooks(pbData);
        }

        // Fetch Wishlist
        if (profile.wishlist?.length) {
          const wlData = [];
          for (const bookId of profile.wishlist) {
            const bDoc = await getDoc(doc(db, "books", bookId));
            if (bDoc.exists()) wlData.push({ id: bDoc.id, ...bDoc.data() });
          }
          setWishlistBooks(wlData);
        }

        // Fetch Following
        if (profile.followingAuthors?.length) {
          const faData = [];
          for (const authorId of profile.followingAuthors) {
            const aDoc = await getDoc(doc(db, "users", authorId));
            if (aDoc.exists()) faData.push({ id: aDoc.id, ...aDoc.data() });
          }
          setFollowingAuthors(faData);
        }
      } catch (err) {
        console.error("Error fetching collections:", err);
      } finally {
        setLoading(false);
      }
    }

    if (profile) fetchCollections();
  }, [profile]);

  if (!user) return <div className="flex h-screen items-center justify-center">Please sign in to view your profile.</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* ... existing sidebar code ... */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
             <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-brand font-black text-xl">
                {user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "JB"}
             </div>
             <h2 className="mt-4 font-serif text-xl font-bold text-slate-900">{user.displayName || "Reader"}</h2>
             <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{user.email}</p>
             
             <div className="mt-6 flex items-center justify-center gap-2 rounded bg-brand/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand border border-brand/10">
                {profile?.isPremium ? <Crown size={14} /> : <BookOpen size={14} />}
                {profile?.subscriptionTier === "free" ? "Free Member" : `${profile?.subscriptionTier} Premium`}
             </div>

             <div className="mt-4">
                {walletAddress || profile?.walletAddress ? (
                   <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Connected Wallet</p>
                      <p className="text-[10px] font-mono text-slate-900 truncate">
                         {walletAddress || profile?.walletAddress}
                      </p>
                   </div>
                ) : (
                   <button 
                      onClick={connectWallet}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand transition-colors"
                   >
                      <Zap size={14} />
                      Connect MetaMask
                   </button>
                )}
             </div>

             <button 
                onClick={logOut}
                className="mt-8 text-xs font-bold text-red-500 hover:underline uppercase tracking-widest"
             >
                Sign Out
             </button>

             {user.email === "mbotorjoy@gmail.com" && !profile?.isAdmin && (
                <button 
                  onClick={async () => {
                    await setDoc(doc(db, "admins", user.uid), { email: user.email });
                    toast.success("You are now an admin! Refreshing...");
                    window.location.reload();
                  }}
                  className="mt-4 w-full rounded bg-slate-100 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200"
                >
                  Enable Admin Access
                </button>
             )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collections</h3>
             <nav className="space-y-1">
                <button 
                  onClick={() => setActiveTab("library")}
                  className={`flex w-full items-center justify-between py-2 text-sm font-bold transition-colors ${activeTab === "library" ? "text-brand" : "text-slate-600 hover:text-brand"}`}
                >
                    My Library <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => setActiveTab("wishlist")}
                  className={`flex w-full items-center justify-between py-2 text-sm font-bold transition-colors ${activeTab === "wishlist" ? "text-brand" : "text-slate-600 hover:text-brand"}`}
                >
                    Wishlist <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => setActiveTab("following")}
                  className={`flex w-full items-center justify-between py-2 text-sm font-bold transition-colors ${activeTab === "following" ? "text-brand" : "text-slate-600 hover:text-brand"}`}
                >
                    Following <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => setActiveTab("affiliate")}
                  className={`flex w-full items-center justify-between py-2 text-sm font-bold transition-colors ${activeTab === "affiliate" ? "text-brand" : "text-slate-600 hover:text-brand"}`}
                >
                    Affiliate <ChevronRight size={14} />
                </button>
             </nav>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                {activeTab === "library" ? "Your Library" : activeTab === "wishlist" ? "Your Wishlist" : activeTab === "following" ? "Following" : "Affiliate Program"}
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                {activeTab === "library" ? "Digital Collection Access" : activeTab === "wishlist" ? "Books saved for later" : activeTab === "following" ? "Authors you follow" : "Earn rewards by sharing JM Books"}
              </p>
            </div>
          </div>

          {activeTab === "following" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {followingAuthors.length > 0 ? followingAuthors.map(author => (
                <Link 
                  key={author.id} 
                  to={`/author/${author.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-brand/20 group"
                >
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-brand/20 transition-all">
                    {author.photoURL ? (
                      <img src={author.photoURL} alt={author.displayName} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <UserIcon size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate">{author.displayName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Author</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-brand" />
                </Link>
              )) : (
                <div className="col-span-full py-24 text-center">
                  <UserIcon className="mx-auto mb-4 text-slate-100" size={64} />
                  <p className="text-sm font-medium text-slate-500 italic">You're not following any authors yet.</p>
                </div>
              )}
            </div>
          ) : activeTab === "affiliate" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
               <div className="max-w-2xl">
                  <h3 className="text-xl font-bold text-slate-900">Share & Earn</h3>
                  <p className="mt-2 text-sm text-slate-500">Share your unique referral link with fellow readers. When they join or buy a book, you'll earn literary credits (coming soon).</p>
                  
                  <div className="mt-8 space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Referral Link</label>
                     <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={referralLink} 
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(referralLink);
                            toast.success("Link copied!");
                          }}
                          className="rounded bg-brand px-6 text-xs font-bold text-white transition-opacity hover:opacity-90"
                        >
                          Copy
                        </button>
                     </div>
                  </div>

                  <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                     <div className="rounded-xl bg-slate-50 p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Referrals</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">0</p>
                     </div>
                     <div className="rounded-xl bg-slate-50 p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Earnings</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">$0.00</p>
                     </div>
                  </div>
               </div>
            </div>
          ) : loading ? (
             <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                {[1,2,3].map(n => <div key={n} className="aspect-[3/4] animate-pulse bg-slate-100 rounded-lg" />)}
             </div>
          ) : (activeTab === "library" ? purchasedBooks : wishlistBooks).length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
              {(activeTab === "library" ? purchasedBooks : wishlistBooks).map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center p-12">
               <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  {activeTab === "library" ? <Star size={32} /> : <Heart size={32} />}
               </div>
               <h3 className="text-xl font-bold text-slate-900">
                 {activeTab === "library" ? "Your library is empty" : "Wishlist is empty"}
               </h3>
               <p className="mt-2 text-sm font-medium text-slate-500 max-w-xs mx-auto">
                 {activeTab === "library" ? "Start your reading journey today by exploring our handpicked collections." : "Save the books that catch your eye while browsing the store."}
               </p>
               <Link to="/store" className="mt-8 inline-block rounded bg-brand px-10 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90">
                  Explore Store
               </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
