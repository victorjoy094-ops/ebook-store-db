import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Helmet } from "react-helmet-async";
import { Share2, Facebook, Twitter, MessageCircle, BookOpen, Download, Lock, Check, Heart, Star, Sparkles, Send, User, Settings, Crown, ArrowRight, X, Headphones, Play, Pause } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import toast from "react-hot-toast";
import { BookCard } from "../components/books/BookCard";
import { AdSpace } from "../components/ads/AdSpace";
import { PDFPreview } from "../components/books/PDFPreview";
import { EpubPreview } from "../components/books/EpubPreview";

export function BookDetails() {
  const { id } = useParams();
  const { user, profile, signIn, isAdmin } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isFetchingRecs, setIsFetchingRecs] = useState(false);
  const [isGeneratingAIReviews, setIsGeneratingAIReviews] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const navigate = useNavigate();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Playback error:", err);
        toast.error("Audio playback failed. Please try again.");
      });
    }
    setIsPlayingAudio(!isPlayingAudio);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setCurrentTime(current);
      const progress = (current / audioRef.current.duration) * 100;
      setAudioProgress(isNaN(progress) ? 0 : progress);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnd = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = seekTo;
    setAudioProgress(parseFloat(e.target.value));
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    async function fetchBookAndReviews() {
      if (!id) return;
      try {
        if (id === "seeded-fundamentals-business") {
          const seededBook = {
            id: "seeded-fundamentals-business",
            title: "Fundamentals of Business Management",
            author: "Joy S. Mbotor",
            authorId: "joy-s-mbotor",
            isbn13: "978-978-68-2451-2",
            category: "Educational Textbook",
            description: "Fundamentals of Business Management is a comprehensive guide that bridges theory and practice, equipping students, entrepreneurs, and business leaders with the knowledge to thrive in today's dynamic business environment. Covering core topics such as corporate governance, digital transformation, sustainability, and crisis management, this book blends global insights with practical case studies to inspire ethical leadership and strategic thinking.",
            price: 5.00,
            coverUrl: "/book_cover.png",
            status: "published",
            createdAt: new Date().toISOString()
          };
          setBook(seededBook);
          // fetchRecommendations(seededBook); // Can skip or use generic
          setLoading(false);
          return;
        }

        const docRef = doc(db, "books", id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const bookData = { id: snapshot.id, ...snapshot.data() as any };
          setBook(bookData);
          fetchRecommendations(bookData);
        }

        // Fetch Reviews
        const reviewsQuery = query(collection(db, "reviews"), where("bookId", "==", id));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        setReviews(reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBookAndReviews();
  }, [id]);

  const fetchRecommendations = async (currentBook: any) => {
    setIsFetchingRecs(true);
    try {
      // 1. Fetch books in same category
      const q = query(
        collection(db, "books"),
        where("category", "==", currentBook.category),
        where("status", "==", "published"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      let candidates: any[] = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.id !== currentBook.id);

      // 2. Fallback to any published books if few candidates
      if (candidates.length < 4) {
        const fallbackQ = query(
          collection(db, "books"),
          where("status", "==", "published"),
          limit(15)
        );
        const fallbackSnap = await getDocs(fallbackQ);
        const fallbacks = fallbackSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((b: any) => b.id !== currentBook.id && !candidates.find(c => c.id === b.id));
        candidates = [...candidates, ...fallbacks].slice(0, 15);
      }

      if (candidates.length === 0) {
        setRecommendations([]);
        return;
      }

      // 3. AI Analysis to pick best matches
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const prompt = `
        Current Book: ${currentBook.title} by ${currentBook.author} (${currentBook.category})
        Description: ${currentBook.description}

        User Wishlist IDs: ${JSON.stringify(profile?.wishlist || [])}

        Candidate Recommendations:
        ${candidates.map((c, i) => `${i}: Title: ${c.title}, Author: ${c.author}, Category: ${c.category}`).join("\n")}

        Identify the 4 most similar or relevant books for a reader who likes the current book.
        Consider existing preferences if Wishlist IDs are provided.
        Return ONLY a JSON array of the indices from the Candidate list (e.g., [0, 2, 4, 5]).
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          responseMimeType: "application/json",
        },
        contents: prompt
      });

      const textResult = result.text || "[]";
      const indices = JSON.parse(textResult.trim());
      const chosen = Array.isArray(indices) 
        ? indices.map((idx: number) => candidates[idx]).filter(Boolean)
        : candidates.slice(0, 4);
        
      setRecommendations(chosen.slice(0, 4));
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      // Fallback
      setRecommendations([]);
    } finally {
      setIsFetchingRecs(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (!book) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a professional literary critic. Provide a concise, 3-sentence professional analysis of the following book. Focus on its impact, potential audience, and core message. Do not use markdown bolding."
        },
        contents: `Analyze this book: Title: ${book.title}, Author: ${book.author}, Category: ${book.category}, Description: ${book.description}`
      });
      setAiAnalysis(response.text);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      toast.error("Could not generate AI summary");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnhanceDescription = async () => {
    if (!book) return;
    setIsEnhancing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a professional author and book reviewer. Your goal is to write a highly engaging, immersive, and detailed book description that spans between 200 and 250 words. Use vivid language and sensory details, focusing heavily on the emotional arc of the characters or the core problem being solved. Ensure the tone is evocative and high-stakes. Do NOT use markdown bolding or headers. Return only the plain text description."
        },
        contents: `Write an immersive, detailed description for this book: Title: ${book.title}, Author: ${book.author}, Category: ${book.category}, Current Synopsis: ${book.description}`
      });
      setEnhancedDescription(response.text);
      toast.success("Immersive description generated!");
    } catch (error) {
      console.error("AI Enhancement failed:", error);
      toast.error("Could not generate immersive description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.error("Sign in to save books");
      signIn();
      return;
    }

    const isInWishlist = profile?.wishlist?.includes(book.id);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        wishlist: isInWishlist ? arrayRemove(book.id) : arrayUnion(book.id)
      });
      toast.success(isInWishlist ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error("Failed to update wishlist");
    }
  };

  const handleGenerateAIReviews = async () => {
    if (!book) return;
    setIsGeneratingAIReviews(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const prompt = `
        You are simulating reader reviews for a book in a library/store app.
        Book Title: ${book.title}
        Author: ${book.author}
        Description: ${book.description}

        Generate 3 diverse reviews in JSON format.
        Review 1: Positive, enthusiastic (4-5 stars).
        Review 2: Mixed, middle-of-the-road (3 stars).
        Review 3: Constructive criticism, lower rating (1-2 stars).

        Each review should have:
        - userDisplayName: A realistic human name.
        - rating: number (1-5).
        - comment: 2-3 sentences of plausible feedback. Do not use generic praise only. Mention themes or tone if possible.
        Return ONLY a JSON array of objects.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          responseMimeType: "application/json",
        },
        contents: prompt
      });

      const text = result.text || "[]";
      const aiReviews = JSON.parse(text.trim());
      
      const formattedReviews = aiReviews.map((r: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        ...r,
        createdAt: { toDate: () => new Date() },
        isAiGenerated: true
      }));

      setReviews(prev => [...formattedReviews, ...prev]);
      toast.success("Sample reviews generated!");
    } catch (error) {
      console.error("AI Review Generation failed:", error);
      toast.error("Could not generate sample reviews");
    } finally {
      setIsGeneratingAIReviews(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      signIn();
      return;
    }
    if (!newReview.comment.trim()) return;

    setSubmittingReview(true);
    try {
      const reviewData = {
        userId: user.uid,
        userDisplayName: user.displayName,
        bookId: book.id,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "reviews"), reviewData);
      setReviews([{ id: docRef.id, ...reviewData, createdAt: new Date() }, ...reviews]);
      setNewReview({ rating: 5, comment: "" });
      toast.success("Review posted!");
    } catch (error) {
      toast.error("Failed to post review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePurchase = () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      signIn();
      return;
    }

    if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
      toast.error("Payment system not initialized. Contact admin.");
      return;
    }

    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `jmbooks-${id}-${Date.now()}`,
      amount: book?.price || 0,
      currency: "USD",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: user?.email || "",
        phone_number: "",
        name: user?.displayName || "Guest Reader",
      },
      customizations: {
        title: "JM Books Purchase",
        description: `Payment for ${book?.title}`,
        logo: "https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-abstract-symbol-book-icon-vector.jpg",
      },
      meta: {
        book_id: id,
        type: "purchase",
        referral_id: localStorage.getItem("referral_id") || ""
      },
      callback: (response: any) => {
        if (response.status === "successful") {
          navigate(`/payment-success?status=successful&tx_ref=${response.tx_ref}&transaction_id=${response.transaction_id}`);
        } else {
          toast.error("Payment was not successful.");
        }
      },
      onclose: () => {
        console.log("Modal closed");
      },
    });
  };

  const shareOnSocial = (platform: string) => {
    const url = window.location.href;
    const text = `I just found this amazing book: "${book.title}" by ${book.author}. Check it out on JM Books!`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
        break;
    }

    if (shareUrl) window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!book) return <div className="flex h-screen items-center justify-center">Book not found.</div>;

  const isAuthor = book && profile && (book.authorId === profile.authorId || profile.isAuthor && book.author === profile.displayName);
  const hasPurchased = profile?.purchasedBooks?.includes(book.id) || profile?.isPremium;
  const isInWishlist = profile?.wishlist?.includes(book.id);
  const isFree = book.price === 0;
  const canDownload = hasPurchased || isFree || isAdmin || isAuthor;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Helmet>
        <title>{book.title} | JM Books</title>
        <meta name="description" content={book.description} />
        <meta property="og:title" content={`${book.title} by ${book.author} | JM Books`} />
        <meta property="og:description" content={book.description} />
        <meta property="og:image" content={book.coverUrl || `https://picsum.photos/seed/${book.id}/600/800`} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="book" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={book.title} />
        <meta name="twitter:description" content={book.description} />
        <meta name="twitter:image" content={book.coverUrl || `https://picsum.photos/seed/${book.id}/600/800`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Book",
            "name": book.title,
            "author": {
              "@type": "Person",
              "name": book.author
            },
            "isbn": book.isbn13,
            "genre": book.category,
            "description": book.description,
            "offers": {
              "@type": "Offer",
              "price": book.price,
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock"
            }
          })}
        </script>
      </Helmet>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Book Book Cover Column */}
        <div className="lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative sticky top-24 overflow-hidden rounded-lg border-l-8 border-slate-700 bg-slate-800 shadow-2xl"
          >
            <img
              src={book.coverUrl || `https://picsum.photos/seed/${book.id}/600/800`}
              alt={book.title}
              className="h-full w-full object-cover opacity-90 transition-all group-hover:scale-105 group-hover:opacity-100"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all group-hover:bg-slate-900/40 group-hover:opacity-100">
              <button 
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-xl transition-transform hover:scale-105"
              >
                <BookOpen size={16} /> Open Preview
              </button>
            </div>
          </motion.div>
        </div>

        {/* Content Column */}
        <div className="lg:col-span-8">
          <div className="flex flex-col">
            <div className="mb-6">
              <Link to="/store" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-brand">
                Browse Store &rarr;
              </Link>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
              ISBN-13: {book.isbn13 || "978-0000000000"}
            </span>
            <h1 className="mt-4 font-serif text-5xl font-black leading-tight text-brand-dark">
              {book.title}
            </h1>
            <p className="mt-2 text-xl font-medium italic text-slate-500">
              By {book.authorId ? (
                <Link to={`/author/${book.authorId}`} className="hover:text-brand hover:underline">
                  {book.author}
                </Link>
              ) : book.author}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6 border-y border-slate-100 py-6">
              <div className="flex items-center gap-2">
                <Star className="fill-brand text-brand" size={18} />
                <span className="text-xl font-black text-slate-900">
                  {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "4.8"}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">({reviews.length} Reviews)</span>
              </div>
              <div className="h-6 w-[1px] bg-slate-200" />
              <div className="rounded bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                {book.category}
              </div>
            </div>

            {/* AI Summary Section */}
            {book.audioUrl && (
              <div className="mt-10 rounded-2xl bg-brand p-8 text-white shadow-lg overflow-hidden relative group">
                <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-10 transition-transform group-hover:scale-110 group-hover:rotate-12">
                  <Headphones size={120} />
                </div>
                
                <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                    <Headphones size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">AI-Generated Audiobook</h3>
                    <h4 className="mt-1 text-xl font-black">Listen to a narration of this title</h4>
                    <p className="mt-2 text-xs text-brand-light font-medium opacity-80">Experience the story through professional AI voice synthesis.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={toggleAudio}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand shadow-xl transition-transform hover:scale-105"
                    >
                      {isPlayingAudio ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                    </button>
                  </div>
                </div>

                <audio 
                  ref={audioRef} 
                  src={book.audioUrl} 
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnd}
                  preload="metadata"
                  className="hidden" 
                />

                <div className="mt-6 flex flex-col gap-2">
                  <div className="relative group/progress h-6 flex items-center">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={audioProgress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full h-1 rounded-full bg-white/20 relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${audioProgress}%` }}
                        className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                      />
                      <motion.div 
                        animate={{ left: `${audioProgress}%` }}
                        className="absolute top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 rounded-2xl bg-slate-900 p-8 text-white shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-accent" size={20} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">AI Literary Analysis</h3>
                </div>
                {!aiAnalysis && (
                  <button 
                    onClick={handleAiAnalyze}
                    disabled={isAnalyzing}
                    className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-white disabled:opacity-50"
                  >
                    {isAnalyzing ? "Analyzing..." : "Generate Insights"}
                  </button>
                )}
              </div>
              <div className="min-h-[60px]">
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 opacity-50 italic text-sm">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}><Sparkles size={16} /></motion.div>
                    Gemini is reading the manuscript...
                  </div>
                ) : aiAnalysis ? (
                  <p className="text-sm leading-relaxed text-slate-300 italic">
                    "{aiAnalysis}"
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Get a professional 3-sentence analysis generated by Gemini AI.</p>
                )}
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synopsis</h3>
                {!enhancedDescription && (
                  <button 
                    onClick={handleEnhanceDescription}
                    disabled={isEnhancing}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark disabled:opacity-50"
                  >
                    <Sparkles size={12} className={isEnhancing ? "animate-pulse" : ""} />
                    {isEnhancing ? "Generating..." : "Generate Immersive Description"}
                  </button>
                )}
              </div>
              
              <div className="mt-4 relative">
                <AnimatePresence mode="wait">
                  {enhancedDescription ? (
                    <motion.div
                      key="enhanced"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 rounded-2xl p-8 border-l-4 border-brand"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles size={14} className="text-brand" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand">AI-Enhanced Immersive Narrative</span>
                      </div>
                      <p className="text-lg leading-relaxed text-slate-700 italic">
                        {enhancedDescription}
                      </p>
                      <button 
                        onClick={() => setEnhancedDescription(null)}
                        className="mt-6 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
                      >
                        &larr; View Original
                      </button>
                    </motion.div>
                  ) : (
                    <motion.p 
                      key="original"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-lg leading-relaxed text-slate-600"
                    >
                      {book.description || "In this groundbreaking work, the author explores the fundamental principles that govern modern digital experiences. From structural integrity to emotional resonance, discover why some books leave a lasting impact while others fade away."}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchase Options</p>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-4xl font-black text-slate-900">
                      {book.price === 0 ? "FREE" : `$${book.price.toFixed(2)}`}
                    </span>
                    {book.price > 0 && (
                      <span className="ml-2 text-sm font-bold text-slate-400 uppercase tracking-widest line-through">$35.00</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleWishlist}
                  className={`flex items-center justify-center gap-2 rounded border px-8 py-4 text-sm font-bold transition-all sm:w-auto w-full ${
                    isInWishlist 
                      ? "border-brand bg-brand/5 text-brand" 
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Heart size={18} className={isInWishlist ? "fill-brand" : ""} />
                  {isInWishlist ? "Saved to Wishlist" : "Add to Wishlist"}
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                {canDownload ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <a
                      href={book.pdfUrl}
                      download={`${book.title}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded bg-brand px-10 py-4 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 w-full"
                    >
                      <Download size={20} /> Download PDF
                    </a>
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="rounded border border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 w-full"
                    >
                      Read Online
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <button
                      onClick={handlePurchase}
                      className="rounded bg-brand px-10 py-4 text-lg font-black uppercase tracking-widest text-white shadow-md transition-opacity hover:opacity-90 w-full"
                    >
                      Buy Ebook
                    </button>
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="rounded border border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 w-full"
                    >
                      Read Preview
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Support Grid */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div className="rounded-xl border border-slate-100 p-4 text-center">
                <BookOpen size={20} className="mx-auto mb-2 text-brand" />
                <p className="text-[10px] font-bold uppercase text-slate-400">Pages</p>
                <p className="text-sm font-black text-slate-900">342</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 text-center">
                <Settings size={20} className="mx-auto mb-2 text-brand" />
                <p className="text-[10px] font-bold uppercase text-slate-400">Format</p>
                <p className="text-sm font-black text-slate-900">PDF / EPUB</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 text-center">
                <Crown size={20} className="mx-auto mb-2 text-brand" />
                <p className="text-[10px] font-bold uppercase text-slate-400">Edition</p>
                <p className="text-sm font-black text-slate-900">1st (2024)</p>
              </div>
            </div>

            {/* Social Share */}
            <div className="mt-16 flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Share this work:</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => shareOnSocial("facebook")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-[#1877F2] hover:text-white"
                  title="Share on Facebook"
                >
                  <Facebook size={18} />
                </button>
                <button 
                  onClick={() => shareOnSocial("twitter")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-black hover:text-white"
                  title="Share on X (Twitter)"
                >
                  <Twitter size={18} />
                </button>
                <button 
                  onClick={() => shareOnSocial("whatsapp")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-[#25D366] hover:text-white"
                  title="Share on WhatsApp"
                >
                  <MessageCircle size={18} />
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-brand hover:text-white"
                  title="Copy Link"
                >
                  <Share2 size={18} />
                </button>
                
                <div className="mx-4 h-6 w-[1px] bg-slate-100" />
                
                <div className="flex items-center gap-3 grayscale opacity-30">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Secured:</span>
                  <div className="flex items-center rounded border border-slate-900 px-2 py-0.5 text-[8px] font-black italic text-slate-900">
                    FLUTTERWAVE <span className="ml-1 text-accent">USD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <section className="mt-24 border-t border-slate-100 pt-16">
              <div className="mb-12 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">Reader Feedback</h2>
                  <div className="mt-1 flex items-center gap-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Community ratings & reviews</p>
                    <span className="text-slate-200">|</span>
                    <button 
                      onClick={handleGenerateAIReviews}
                      disabled={isGeneratingAIReviews}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand-dark disabled:opacity-50"
                    >
                      <Sparkles size={12} className={isGeneratingAIReviews ? "animate-pulse" : ""} />
                      {isGeneratingAIReviews ? "Generating..." : "Generate AI Samples"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-brand font-black">
                   <Star size={20} className="fill-brand" />
                   <span className="text-2xl">{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0"}</span>
                </div>
              </div>

              {/* Review Form */}
              <div className="mb-16 rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 underline underline-offset-8">Write a Review</h4>
                <form onSubmit={submitReview} className="space-y-4">
                  <div className="flex gap-4">
                    {[1,2,3,4,5].map(star => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className={`transition-transform hover:scale-110 ${newReview.rating >= star ? "text-brand" : "text-slate-200"}`}
                      >
                        <Star size={32} className={newReview.rating >= star ? "fill-brand" : ""} />
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <textarea 
                      placeholder="Share your thoughts on this title..."
                      value={newReview.comment}
                      onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                      className="w-full rounded-lg border-slate-200 bg-white p-6 text-sm italic focus:ring-brand"
                      rows={3}
                    />
                    <button 
                      type="submit"
                      disabled={submittingReview || !newReview.comment.trim()}
                      className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded bg-brand text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Review List */}
              <div className="space-y-12">
                {reviews.length > 0 ? reviews.map((review, i) => (
                  <motion.div 
                    key={review.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="flex gap-6"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <User size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-black text-slate-900">{review.userDisplayName || "Anonymous Reader"}</h5>
                          {review.isAiGenerated && (
                            <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-brand">AI Sample</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-brand">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className={i < review.rating ? "fill-brand" : "text-slate-200"} />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 italic">"{review.comment}"</p>
                      <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-12 text-center">
                    <p className="text-sm italic text-slate-400">No reviews yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </section>

            <AdSpace position="book_details_bottom" className="mt-16 rounded-xl overflow-hidden" />

            {/* AI Recommendations Section */}
            {(isFetchingRecs || recommendations.length > 0) && (
              <section className="mt-24 border-t border-slate-100 pt-16">
                <div className="mb-12 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <Sparkles size={16} className="text-brand" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-brand">Powered by Gemini AI</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Similar Titles You'll Love</h2>
                    <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">Based on your taste and literary analysis</p>
                  </div>
                  <Link to="/store" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand">
                    View All <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                {isFetchingRecs ? (
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="animate-pulse space-y-4">
                        <div className="aspect-[3/4] rounded bg-slate-100" />
                        <div className="h-2 w-3/4 rounded bg-slate-100" />
                        <div className="h-2 w-1/2 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    {recommendations.map(reco => (
                      <BookCard key={reco.id} book={reco} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
            >
              <button 
                onClick={() => setShowPreview(false)}
                className="absolute right-6 top-6 z-10 rounded-full bg-white shadow-md p-2 text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Close Preview"
              >
                <X size={24} />
              </button>
              <div className="h-full w-full p-0 overflow-y-auto bg-slate-50">
                <div className="mx-auto max-w-4xl text-slate-800 p-8 pb-32">
                  <div className="mb-12 text-center">
                    <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-brand">Manuscript Preview</h3>
                    <h2 className="font-serif text-4xl font-black text-slate-900">{book.title}</h2>
                    <p className="mt-4 text-sm font-medium italic text-slate-500">
                      {canDownload ? "Full Digital Access" : (book.pdfUrl?.toLowerCase().endsWith('.epub') ? "Digital Preview" : "Excerpts from the first 10 pages")}
                    </p>
                  </div>
                  
                  {book.pdfUrl?.toLowerCase().endsWith('.epub') ? (
                    <EpubPreview url={book.pdfUrl} />
                  ) : (
                    <PDFPreview url={book.pdfUrl} maxPages={canDownload ? 9999 : 10} />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

