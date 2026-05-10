import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BookCard } from "../components/books/BookCard";
import { Search, Filter, SlidersHorizontal, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CATEGORIES = [
  "All", 
  "Educational Textbook", 
  "Lecture Notes", 
  "Fiction", 
  "Non-Fiction", 
  "Business", 
  "Self-Help", 
  "Technology", 
  "Mystery"
];

export function Store() {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [authorSearch, setAuthorSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearch(s);
    const c = searchParams.get("category");
    if (c) setSelectedCategory(c);
  }, [searchParams]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("referral_id", ref);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      try {
        let q = query(
          collection(db, "books"), 
          where("status", "==", "published"),
          orderBy("createdAt", "desc")
        );
        
        if (selectedCategory !== "All") {
          q = query(
            collection(db, "books"), 
            where("status", "==", "published"),
            where("category", "==", selectedCategory), 
            orderBy("createdAt", "desc")
          );
        }
        
        const snapshot = await getDocs(q);
        let booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        // Manual Seed for requested book if not already present
        const requestedISBN = "978-978-68-2451-2";
        const hasRequestedBook = booksData.some(b => b.isbn13 === requestedISBN);
        
        if (!hasRequestedBook) {
          const seededBook = {
            id: "seeded-fundamentals-business",
            title: "Fundamentals of Business Management",
            author: "Joy S. Mbotor",
            authorId: "joy-s-mbotor", // Placeholder or fetch if possible
            isbn13: requestedISBN,
            category: "Educational Textbook",
            description: "Fundamentals of Business Management is a comprehensive guide that bridges theory and practice, equipping students, entrepreneurs, and business leaders with the knowledge to thrive in today's dynamic business environment. Covering core topics such as corporate governance, digital transformation, sustainability, and crisis management, this book blends global insights with practical case studies to inspire ethical leadership and strategic thinking.",
            price: 5.00,
            coverUrl: "/book_cover.png", // User uploaded cover
            status: "published",
            createdAt: new Date().toISOString(),
            isSeeded: true
          };
          booksData = [seededBook, ...booksData];
        }

        setBooks(booksData);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, [selectedCategory]);

  const getTime = (timestamp: any) => {
    if (!timestamp) return 0;
    if (timestamp.toMillis) return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    return new Date(timestamp).getTime();
  };

  const filteredBooks = books
    .filter(book => {
      const searchLower = search.toLowerCase();
      const authorSearchLower = authorSearch.toLowerCase();
      
      const matchesGeneral = 
        book.title.toLowerCase().includes(searchLower) || 
        book.author.toLowerCase().includes(searchLower) ||
        (book.tags && book.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)));
      
      const matchesAuthor = book.author.toLowerCase().includes(authorSearchLower);
      
      return matchesGeneral && matchesAuthor;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "title-az") return a.title.localeCompare(b.title);
      if (sortBy === "title-za") return b.title.localeCompare(a.title);
      if (sortBy === "oldest") return getTime(a.createdAt) - getTime(b.createdAt);
      if (sortBy === "newest") return getTime(b.createdAt) - getTime(a.createdAt);
      return 0;
    });

  return (
    <div className="mx-auto flex max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 pr-8 lg:flex">
        <section className="mb-8">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Categories</h3>
          <ul className="space-y-3 text-sm font-medium">
            {CATEGORIES.map(cat => (
              <li 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer transition-colors ${
                  selectedCategory === cat ? "text-brand" : "text-slate-700 hover:text-brand"
                }`}
              >
                {cat}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 italic text-brand-dark underline decoration-blue-300 decoration-2 underline-offset-4 text-xs font-bold">JM Unlimited</h3>
          <p className="mb-3 text-[11px] text-blue-700">Get access to 50,000+ titles for just $5/month. Unlimited reading, anytime.</p>
          <Link 
            to="/subscriptions"
            className="block w-full rounded bg-brand py-2 text-center text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Sart Reading Free
          </Link>
        </section>

        <div className="mt-auto">
          <p className="text-[10px] text-slate-400">SEO Optimized Frontend & Metadata ready.</p>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 lg:pl-10">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recently Added Titles</h1>
            <p className="mt-1 text-xs text-slate-500 uppercase tracking-widest">Explore {selectedCategory} Collections</p>
          </div>

          <div className="flex w-full max-w-2xl flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by title, author, or ISBN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-md border-none bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none ring-brand transition-all focus:ring-2"
              />
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Filter by author..."
                value={authorSearch}
                onChange={e => setAuthorSearch(e.target.value)}
                className="w-full rounded-md border-none bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none ring-brand transition-all focus:ring-2"
              />
            </div>

            <div className="relative">
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none rounded border-none bg-slate-100 py-2.5 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none ring-brand transition-all focus:ring-2"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="title-az">Title: A-Z</option>
                <option value="title-za">Title: Z-A</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] rounded bg-slate-200" />
                <div className="h-3 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filteredBooks.map((book, i) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <BookCard book={book} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-sm font-medium italic text-slate-400">No books found matching your search criteria.</p>
            <button 
              onClick={() => {setSearch(""); setAuthorSearch(""); setSelectedCategory("All")}}
              className="mt-4 text-xs font-bold text-brand uppercase tracking-widest hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
