import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, deleteDoc, orderBy, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Upload, Plus, CheckCircle2, AlertCircle, Loader2, BarChart3, Database, Trash2, Edit3, UserPlus, DollarSign, Headphones, FileText, Megaphone, PenTool, Sparkles, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import { handleFirestoreError, OperationType } from "../lib/firebase";

type Tab = "dashboard" | "upload" | "manage" | "earnings" | "journals" | "stories";

export function PublisherPortal() {
  const { user, profile, signIn, loading: authLoading, walletAddress, connectWallet } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(false);
  const [requestingAudio, setRequestingAudio] = useState<string | null>(null);
  const [application, setApplication] = useState<any>(null);
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [myStories, setMyStories] = useState<any[]>([]);
  const [myJournalSubmissions, setMyJournalSubmissions] = useState<any[]>([]);
  const [myPublishedJournals, setMyPublishedJournals] = useState<any[]>([]);
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn13: "",
    category: "Fiction",
    description: "",
    tags: "",
    price: 9.99,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Story state
  const [storyData, setStoryData] = useState({
    title: "",
    category: "Personal Growth",
    summary: "",
    content: ""
  });
  const [storyCover, setStoryCover] = useState<File | null>(null);

  // Journal Submission State
  const [journalData, setJournalData] = useState({
    title: "",
    category: "Science",
    abstract: "",
  });
  const [journalFile, setJournalFile] = useState<File | null>(null);

  // Application Form
  const [appData, setAppData] = useState({ bio: "", portfolioUrl: "" });

  useEffect(() => {
    if (!user) {
      if (!authLoading) setFetching(false);
      return;
    }

    async function fetchData() {
      setFetching(true);
      try {
        const promises = [];

        // Fetch My Application
        const appQuery = query(collection(db, "applications"), where("userId", "==", user?.uid));
        promises.push(getDocs(appQuery).then(snap => {
          if (!snap.empty) {
            setApplication({ id: snap.docs[0].id, ...snap.docs[0].data() });
          }
        }));

        // Fetch My Books and related if Author
        if (profile?.isAuthor) {
          const booksQuery = query(collection(db, "books"), where("authorId", "==", user?.uid));
          const tQuery = query(collection(db, "transactions"), where("authorId", "==", user?.uid));
          const journalsQuery = query(collection(db, "journalSubmissions"), where("authorId", "==", user?.uid));
          const publishedJournalsQuery = query(collection(db, "journals"), where("authorId", "==", user?.uid));
          const storiesQuery = query(collection(db, "stories"), where("authorId", "==", user?.uid));

          promises.push(getDocs(booksQuery).then(snap => {
            const books = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            const sortedBooks = [...books].sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || 0;
              return timeB - timeA;
            });
            setMyBooks(sortedBooks);
          }));

          promises.push(getDocs(tQuery).then(snap => {
            const transactions = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            const sortedTx = [...transactions].sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || 0;
              return timeB - timeA;
            });
            setMyTransactions(sortedTx);
          }));

          promises.push(getDocs(journalsQuery).then(snap => {
            setMyJournalSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }));

          promises.push(getDocs(publishedJournalsQuery).then(snap => {
            setMyPublishedJournals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }));

          promises.push(getDocs(storiesQuery).then(snap => {
            setMyStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }));
        }

        await Promise.all(promises);
      } catch (err) {
        console.error("Error fetching publisher data:", err);
        toast.error("Could not sync your library. Try refreshing.");
      } finally {
        setFetching(false);
      }
    }

    fetchData();
  }, [user, profile?.isAuthor, authLoading]); // Only re-fetch if identity changes

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "applications"), {
        userId: user.uid,
        userName: user.displayName,
        bio: appData.bio,
        portfolioUrl: appData.portfolioUrl,
        status: "pending",
        createdAt: serverTimestamp()
      });
      toast.success("Application submitted! We'll review it soon.");
      window.location.reload();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "applications");
      toast.error("Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !coverFile || !pdfFile) {
      toast.error("Please fill all fields and select files (Cover and Manuscript).");
      return;
    }

    const finalIsbn = formData.isbn13.trim() || ("JM-" + Math.random().toString(36).substring(2, 7).toUpperCase() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase());

    setLoading(true);
    const toastId = toast.loading("Uploading files and publishing...");
    try {
      // 1. Upload Files in Parallel
      const coverRef = ref(storage, `covers/${Date.now()}-${coverFile.name}`);
      const pdfRef = ref(storage, `books/${Date.now()}-${pdfFile.name}`);

      const [coverSnap, pdfSnap] = await Promise.all([
        uploadBytes(coverRef, coverFile),
        uploadBytes(pdfRef, pdfFile)
      ]);

      const [coverUrl, pdfUrl] = await Promise.all([
        getDownloadURL(coverSnap.ref),
        getDownloadURL(pdfSnap.ref)
      ]);

      // 3. Save to Firestore
      const bookData = {
        title: formData.title,
        author: formData.author,
        authorId: user.uid,
        isbn13: finalIsbn,
        category: formData.category,
        description: formData.description,
        tags: formData.tags.split(",").map(t => t.trim()).filter(t => t !== ""),
        price: formData.price,
        coverUrl,
        pdfUrl,
        status: "pending",
        createdAt: serverTimestamp()
      };

      const bookRef = await addDoc(collection(db, "books"), bookData);
      
      // Log Audit and update local state in parallel
      await Promise.all([
        addDoc(collection(db, "auditLogs"), {
          action: "BOOK_UPLOAD",
          performedBy: user.uid,
          details: `Author ${user.displayName} uploaded ${formData.title}`,
          timestamp: serverTimestamp()
        }),
        // Avoid full re-fetch, just update local state
        new Promise<void>((resolve) => {
          setMyBooks(prev => [{ id: bookRef.id, ...bookData, createdAt: { toMillis: () => Date.now() } as any }, ...prev]);
          resolve();
        })
      ]);

      toast.success("Manuscript submitted for review!", { id: toastId });
      setFormData({
        title: "", author: "", isbn13: "", category: "Fiction",
        description: "", tags: "", price: 9.99
      });
      setCoverFile(null);
      setPdfFile(null);
      setActiveTab("manage");
    } catch (err) {
      console.error("Upload error:", err);
      if (err instanceof Error && err.message.includes("permission")) {
         handleFirestoreError(err, OperationType.WRITE, "books");
      }
      toast.error("Upload failed: " + (err instanceof Error ? err.message : "Possible error"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAudiobook = async (bookId: string) => {
    if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
      toast.error("Payment system not initialized. Contact admin.");
      return;
    }

    const book = myBooks.find(b => b.id === bookId);

    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `audiobook-svc-${bookId}-${Date.now()}`,
      amount: 10.00,
      currency: "USD",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: user?.email || "",
        phone_number: "",
        name: user?.displayName || "Guest Reader",
      },
      customizations: {
        title: "AI Audiobook Service",
        description: `Audiobook conversion fee for "${book?.title}"`,
        logo: "https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-abstract-symbol-book-icon-vector.jpg",
      },
      callback: async (response: any) => {
        if (response.status === "successful") {
          setRequestingAudio(bookId);
          try {
            const bookRef = doc(db, "books", bookId);
            await updateDoc(bookRef, {
              audiobookRequestStatus: "paid"
            });

            await addDoc(collection(db, "transactions"), {
              userId: user?.uid,
              userName: user?.displayName,
              email: user?.email,
              bookId: bookId,
              amount: 10,
              type: "audiobook_service",
              status: "successful",
              transactionId: response.transaction_id,
              createdAt: serverTimestamp()
            });

            setMyBooks(myBooks.map(b => b.id === bookId ? { ...b, audiobookRequestStatus: "paid" } : b));
            toast.success("Payment successful! Admin will convert your book shortly.");
          } catch (err) {
            toast.error("Error updating status after payment. Contact support.");
          } finally {
            setRequestingAudio(null);
          }
        } else {
          toast.error("Payment failed.");
        }
      },
      onclose: () => {},
    });
  };

  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !journalFile) {
      toast.error("Please select a manuscript file.");
      return;
    }

    if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
      toast.error("Payment system not initialized. Contact admin.");
      return;
    }

    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `journal-vetting-${user.uid}-${Date.now()}`,
      amount: 40.00,
      currency: "USD",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: user?.email || "",
        phone_number: "",
        name: user?.displayName || "Guest Reader",
      },
      customizations: {
        title: "Journal Vetting Fee",
        description: `Vetting payment for "${journalData.title}"`,
        logo: "https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-abstract-symbol-book-icon-vector.jpg",
      },
      callback: async (response: any) => {
        if (response.status === "successful") {
          setLoading(true);
          try {
            const toastId = toast.loading("Uploading files and finalising submission...");
            const fileRef = ref(storage, `journalSubmissions/${Date.now()}-${journalFile.name}`);
            const fileSnap = await uploadBytes(fileRef, journalFile);
            const fileUrl = await getDownloadURL(fileSnap.ref);

            const submissionData = {
              authorId: user.uid,
              authorName: user.displayName,
              title: journalData.title,
              category: journalData.category,
              abstract: journalData.abstract,
              fileUrl,
              status: "submitted",
              paymentStatus: "paid",
              transactionId: response.transaction_id,
              createdAt: serverTimestamp()
            };

            const submissionRef = await addDoc(collection(db, "journalSubmissions"), submissionData);
            
            await Promise.all([
              addDoc(collection(db, "auditLogs"), {
                action: "JOURNAL_SUBMISSION",
                performedBy: user.uid,
                details: `Author ${user.displayName} paid $40 and submitted journal ${journalData.title}`,
                entityId: submissionRef.id,
                timestamp: serverTimestamp()
              }),
              new Promise<void>((resolve) => {
                setMyJournalSubmissions(prev => [{ id: submissionRef.id, ...submissionData, createdAt: { toMillis: () => Date.now() } as any }, ...prev]);
                resolve();
              })
            ]);

            toast.success("Journal manuscript submitted!", { id: toastId });
            setJournalData({ title: "", category: "Science", abstract: "" });
            setJournalFile(null);
          } catch (err) {
            console.error("Journal submission error:", err);
            handleFirestoreError(err, OperationType.WRITE, "journalSubmissions");
            toast.error("Submission error after payment. Please contact support with ID: " + response.transaction_id);
          } finally {
            setLoading(false);
          }
        } else {
          toast.error("Payment was not successful.");
        }
      },
      onclose: () => {
        console.log("Modal closed");
      },
    });
  };

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !storyData.title || !storyData.summary || !storyData.content) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Publishing story...");
    try {
      let coverUrl = "";
      if (storyCover) {
        const coverRef = ref(storage, `storyCovers/${Date.now()}-${storyCover.name}`);
        const snap = await uploadBytes(coverRef, storyCover);
        coverUrl = await getDownloadURL(snap.ref);
      }

      const storyPayload = {
        title: storyData.title,
        authorId: user.uid,
        authorName: user.displayName,
        summary: storyData.summary,
        category: storyData.category,
        coverUrl,
        readCount: 0,
        status: "published",
        createdAt: serverTimestamp()
      };

      const storyRef = await addDoc(collection(db, "stories"), storyPayload);

      // Save restricted content and Audit log in parallel
      await Promise.all([
        addDoc(collection(db, "stories", storyRef.id, "content"), {
          id: "full",
          content: storyData.content,
          updatedAt: serverTimestamp()
        }),
        addDoc(collection(db, "auditLogs"), {
          action: "STORY_PUBLISH",
          performedBy: user.uid,
          details: `Author published story ${storyData.title}`,
          entityId: storyRef.id,
          timestamp: serverTimestamp()
        }),
        new Promise<void>((resolve) => {
          setMyStories(prev => [{ id: storyRef.id, ...storyPayload, createdAt: { toMillis: () => Date.now() } as any }, ...prev]);
          resolve();
        })
      ]);

      toast.success("Story published successfully!", { id: toastId });
      setStoryData({ title: "", category: "Personal Growth", summary: "", content: "" });
      setStoryCover(null);
      setActiveTab("stories");
    } catch (err) {
      console.error("Story publish error:", err);
      handleFirestoreError(err, OperationType.WRITE, "stories");
      toast.error("Story publication failed.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (user && fetching)) return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-brand" size={40} /></div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-slate-200 bg-white p-12 text-center shadow-xl shadow-slate-200/50"
        >
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 text-brand">
            <BookOpen size={48} />
          </div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Become a JM Author</h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-slate-500">
            Join the most exclusive digital library and start reaching readers in every corner of the globe.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
            {[
              { title: "70% Royalties", desc: "Keep more of what you earn with our transparent pricing." },
              { title: "Global Reach", desc: "Your books available to premium members worldwide." },
              { title: "Easy Upload", desc: "Submit PDF or EPUB manuscripts in minutes." }
            ].map(item => (
              <div key={item.title} className="rounded-2xl bg-slate-50 p-6">
                <p className="text-xs font-black uppercase tracking-widest text-brand">{item.title}</p>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <button 
            onClick={signIn} 
            className="mt-12 rounded-full bg-slate-900 px-12 py-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:bg-brand hover:scale-105 active:scale-95"
          >
            Sign In to Start Your Journey
          </button>
        </motion.div>
      </div>
    );
  }

  if (!profile?.isAuthor) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          {application?.status === "pending" ? (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-brand">
                <Loader2 className="animate-spin" size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Application Under Review</h2>
              <p className="text-slate-500">We've received your request to join as an author. Our literary scouts will review your portfolio and get back to you shortly.</p>
              <div className="rounded-2xl bg-slate-50 p-8 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-4">Your Submission Details</p>
                <div 
                  className="text-sm italic text-slate-600 prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: application.bio }}
                />
                {application.portfolioUrl && (
                  <p className="mt-4 text-xs font-bold text-brand">{application.portfolioUrl}</p>
                )}
              </div>
            </div>
          ) : application?.status === "rejected" ? (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Application Not Approved</h2>
              <p className="text-slate-500">Thank you for your interest. Unfortunately, we cannot accept your author application at this time. Our current focus is on specific literary genres.</p>
              <button 
                onClick={() => setApplication(null)}
                className="text-xs font-black uppercase tracking-widest text-brand hover:underline"
              >
                Try applying again with a different portfolio
              </button>
            </div>
          ) : (
            <div className="space-y-8 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">Publish Your Story</h2>
                  <p className="mt-1 text-slate-500 text-lg">Join JM BOOKS as a World-Class Author.</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/5 text-brand">
                  <UserPlus size={32} />
                </div>
              </div>
              
              <form onSubmit={submitApplication} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Author Bio & Style</label>
                    <span className="text-[10px] text-slate-400">Be descriptive</span>
                  </div>
                  <div className="quill-container">
                    <ReactQuill 
                      theme="snow"
                      value={appData.bio}
                      onChange={content => setAppData({ ...appData, bio: content })}
                      placeholder="Tell us about yourself, your writing history, and what you plan to publish..."
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, false] }],
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['link', 'clean']
                        ],
                      }}
                      className="bg-slate-50 overflow-hidden rounded-xl border border-slate-200"
                    />
                  </div>
                  <style>{`
                    .quill-container .ql-toolbar {
                      border: none !important;
                      border-bottom: 1px solid #e2e8f0 !important;
                      background: #f8fafc;
                    }
                    .quill-container .ql-container {
                      border: none !important;
                      min-height: 150px;
                      font-family: inherit;
                      font-size: 14px;
                    }
                    .quill-container .ql-editor.ql-blank::before {
                      color: #94a3b8;
                      font-style: normal;
                    }
                  `}</style>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portfolio / Website Link</label>
                  <input 
                    type="url"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
                    placeholder="https://yourwebsite.com or linkedIn/behance"
                    value={appData.portfolioUrl}
                    onChange={e => setAppData({ ...appData, portfolioUrl: e.target.value })}
                  />
                </div>
                <button 
                  disabled={loading || !appData.bio}
                  className="w-full rounded-full bg-brand py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-brand/20 transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
                >
                  {loading ? <Loader2 className="mx-auto animate-spin" /> : "Request Author Access"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

    const totalGross = myTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalRoyalty = totalGross * 0.7;

    const totalJournalReads = myPublishedJournals.reduce((acc, j) => acc + (j.readCount || 0), 0);
    const journalEarnings = totalJournalReads * 0.10; // $0.10 per read split

    const totalStoryReads = myStories.reduce((acc, s) => acc + (s.readCount || 0), 0);
    const storyEarnings = totalStoryReads * 0.10;

    return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Publisher Portal</h1>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Manage your literary portfolio</p>
              {(walletAddress || profile?.walletAddress) ? (
                 <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 border border-green-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-green-700 tracking-tighter">
                      { (walletAddress || profile?.walletAddress).slice(0, 6) }...{(walletAddress || profile?.walletAddress).slice(-4) }
                    </span>
                 </div>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="text-[9px] border border-slate-200 rounded-full px-2 py-0.5 font-black uppercase text-slate-400 hover:text-brand hover:border-brand transition-all"
                >
                  Connect Payout Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        <nav className="flex gap-2 rounded-lg bg-slate-100 p-1">
          {[
            { id: "dashboard", icon: BarChart3, label: "Overview" },
            { id: "manage", icon: Database, label: "My Books" },
            { id: "stories", icon: PenTool, label: "Stories" },
            { id: "journals", icon: FileText, label: "Journals" },
            { id: "earnings", icon: DollarSign, label: "Earnings" },
            { id: "upload", icon: Plus, label: "New Title" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 rounded px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === tab.id ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "dashboard" && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Books</h3>
                <p className="mt-4 text-4xl font-black text-slate-900">{myBooks.length}</p>
                <div className="mt-2 text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                  {myBooks.filter(b => b.status === "published").length} Live
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stories</h3>
                <p className="mt-4 text-4xl font-black text-slate-900">{myStories.length}</p>
                <div className="mt-2 text-[8px] font-black uppercase text-brand tracking-tighter">
                  {totalStoryReads} Total Reads
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Journals</h3>
                <p className="mt-4 text-4xl font-black text-slate-900">{myPublishedJournals.length}</p>
                <div className="mt-2 text-[8px] font-black uppercase text-blue-500 tracking-tighter">
                  {totalJournalReads} Total Reads
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Trans.</h3>
                <p className="mt-4 text-4xl font-black text-slate-900">{myTransactions.length}</p>
                <div className="mt-2 text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                  Last 30 Days
                </div>
              </div>
            </div>

            <div className="rounded-[2.5rem] bg-slate-900 p-12 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand/20 to-transparent pointer-events-none" />
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Total Unified Earnings</h3>
                    <p className="text-7xl font-black text-white tracking-tight">
                      ${(totalRoyalty + journalEarnings + storyEarnings).toFixed(2)}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <div className="rounded-full bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-brand" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Books: ${totalRoyalty.toFixed(2)}</span>
                      </div>
                      <div className="rounded-full bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Stories: ${storyEarnings.toFixed(2)}</span>
                      </div>
                      <div className="rounded-full bg-white/5 border border-white/10 px-4 py-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Journals: ${journalEarnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-400 leading-relaxed italic">
                      "Your words are your wealth. At JM BOOKS, we ensure authors receive the highest industry splits, paid out directly to your connected wallet."
                    </p>
                    <button 
                      onClick={() => setActiveTab("earnings")}
                      className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand hover:text-white transition-colors"
                    >
                      Detailed Breakdown <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === "earnings" && (
          <motion.div 
            key="earnings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Sales</p>
                   <p className="mt-2 text-3xl font-black text-slate-900">${totalGross.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Royalty (70%)</p>
                   <p className="mt-2 text-3xl font-black text-brand">${totalRoyalty.toFixed(2)}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 border-l-4 border-l-blue-500 shadow-sm">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Journal Reads</p>
                   <p className="mt-2 text-3xl font-black text-slate-900">{totalJournalReads}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-8 border-l-4 border-l-green-500 shadow-sm">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Journal Earnings (@$0.10)</p>
                   <p className="mt-2 text-3xl font-black text-green-600">${journalEarnings.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-8 border-l-4 border-l-purple-500 shadow-sm">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Story Reads (Subscribers)</p>
                   <p className="mt-2 text-3xl font-black text-slate-900">{totalStoryReads}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-8 border-l-4 border-l-brand shadow-sm">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Story Royalty Support</p>
                   <p className="mt-2 text-3xl font-black text-brand">${storyEarnings.toFixed(2)}</p>
                </div>
             </div>

             <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-left font-sans">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Item</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Your Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {myBooks.find(b => b.id === tx.bookId)?.title || "Unknown Title"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">${tx.amount?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-black text-brand">${(tx.amount * 0.7).toFixed(2)}</td>
                      </tr>
                    ))}
                    {myTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm italic text-slate-400">No earnings data found yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </motion.div>
        )}

        {activeTab === "journals" && (
          <motion.div 
            key="journals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <form onSubmit={handleJournalSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 border-l-4 border-brand pl-4">Submit New Journal</h3>
                    <div className="bg-brand/5 text-brand px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border border-brand/10">
                        Vetting Fee: $40
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Journal Title</label>
                        <input required value={journalData.title} onChange={e => setJournalData({...journalData, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                        <select value={journalData.category} onChange={e => setJournalData({...journalData, category: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand">
                            {["Science", "Technology", "Economics", "Humanities", "Medicine", "Arts"].map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Abstract / Summary</label>
                    <textarea required rows={4} value={journalData.abstract} onChange={e => setJournalData({...journalData, abstract: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manuscript (PDF)</label>
                    <div className="relative flex h-32 items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-brand">
                        <input type="file" accept="application/pdf" onChange={e => setJournalFile(e.target.files?.[0] || null)} className="absolute inset-0 cursor-pointer opacity-0" />
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            {journalFile ? <CheckCircle2 size={24} className="text-green-500" /> : <Upload size={20} />}
                            <p className="text-[10px] font-bold uppercase">{journalFile ? journalFile.name : "Select PDF Document"}</p>
                        </div>
                    </div>
                </div>

                <button disabled={loading} className="w-full rounded-full bg-slate-900 py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-brand active:scale-95 disabled:opacity-50">
                    {loading ? <Loader2 className="mx-auto animate-spin" /> : "Pay $40 and Submit for Vetting"}
                </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Journal Submissions</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Journal Title</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myJournalSubmissions.map(sub => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900">{sub.title}</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{sub.category}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                                        sub.status === "published" ? "bg-green-50 text-green-600" : 
                                        sub.status === "vetting" ? "bg-blue-50 text-brand" : "bg-slate-50 text-slate-400"
                                    }`}>
                                        {sub.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-black text-green-600 uppercase">PAID $40</span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    {sub.createdAt?.toDate ? sub.createdAt.toDate().toLocaleDateString() : 'New'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </motion.div>
        )}
        {activeTab === "stories" && (
          <motion.div 
            key="stories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <form onSubmit={handleStorySubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 border-l-4 border-brand pl-4">Publish New Story</h3>
                    <div className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-100">
                        <Sparkles size={14} /> Premium Category
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Story Title</label>
                      <input required value={storyData.title} onChange={e => setStoryData({...storyData, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                      <select value={storyData.category} onChange={e => setStoryData({...storyData, category: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand">
                          {["Personal Growth", "Business", "Tech", "Life Lessons", "Creativity", "Future"].map(c => <option key={c}>{c}</option>)}
                      </select>
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hero Image (Optional)</label>
                    <div className="relative flex h-24 items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-brand">
                        <input type="file" accept="image/*" onChange={e => setStoryCover(e.target.files?.[0] || null)} className="absolute inset-0 cursor-pointer opacity-0" />
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                            {storyCover ? <CheckCircle2 size={20} className="text-green-500" /> : <Upload size={18} />}
                            <p className="text-[8px] font-bold uppercase">{storyCover ? storyCover.name : "Select Image"}</p>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Public Summary (The Paywall Preview)</label>
                    <textarea required rows={3} value={storyData.summary} onChange={e => setStoryData({...storyData, summary: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand italic" placeholder="This summary is shown to everyone..." />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Story Content (Subscriber-Only)</label>
                    <textarea required rows={10} value={storyData.content} onChange={e => setStoryData({...storyData, content: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-serif outline-none border border-slate-200 focus:ring-1 focus:ring-brand" placeholder="Write your full story here..." />
                </div>

                <button disabled={loading} className="w-full rounded-full bg-slate-900 py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-brand active:scale-95 disabled:opacity-50">
                    {loading ? <Loader2 className="mx-auto animate-spin" /> : "Publish Story to Journal"}
                </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Published Stories</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Story Details</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reads</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myStories.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900">{s.title}</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{s.category}</p>
                                </td>
                                <td className="px-6 py-4 text-sm font-black text-brand">{s.readCount || 0}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-green-50 text-green-600 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">Active</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-4">
                                        <button onClick={() => toast.error("Editing coming soon")} className="text-slate-400 hover:text-brand"><Edit3 size={16} /></button>
                                        <button onClick={async () => {
                                          if (confirm("Delete this story?")) {
                                            await deleteDoc(doc(db, "stories", s.id));
                                            setMyStories(myStories.filter(prev => prev.id !== s.id));
                                          }
                                        }} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {myStories.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-sm italic text-slate-400">No stories published yet.</td>
                          </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </motion.div>
        )}
        {activeTab === "manage" && (
          <motion.div 
            key="manage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
          >
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Book Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myBooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen className="text-slate-200" size={40} />
                        <p className="text-sm font-medium text-slate-400 italic">No books in your library yet.</p>
                        <button 
                          onClick={() => setActiveTab("upload")}
                          className="text-xs font-bold uppercase tracking-widest text-brand hover:underline"
                        >
                          Upload your first manuscript
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  myBooks.map(book => (
                    <tr key={book.id}>
                      <td className="flex items-center gap-4 px-6 py-4">
                        <img src={book.coverUrl} className="h-12 w-9 rounded object-cover shadow-sm transition-transform hover:scale-110" referrerPolicy="no-referrer" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{book.title}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{book.category}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                          book.status === "published" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {book.status === "published" ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {book.status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">${book.price?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {!book.hasAudiobook && (
                            <button
                              onClick={() => handleRequestAudiobook(book.id)}
                              disabled={requestingAudio === book.id || book.audiobookRequestStatus === 'paid'}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                                book.audiobookRequestStatus === 'paid'
                                  ? "bg-green-50 text-green-600"
                                  : "bg-brand/10 text-brand hover:bg-brand/20"
                              }`}
                            >
                              {requestingAudio === book.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Headphones size={12} />
                              )}
                              {book.audiobookRequestStatus === 'paid' ? "Paid" : "Get AI Audio ($10)"}
                            </button>
                          )}
                          {book.hasAudiobook && (
                            <div className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-green-600">
                              <CheckCircle2 size={10} /> Audio Live
                            </div>
                          )}
                          <button onClick={() => toast.error("Editing coming soon")} className="text-slate-400 hover:text-brand transition-colors"><Edit3 size={16} /></button>
                          <button onClick={async () => {
                            if (confirm("Are you sure you want to delete this manuscript? This action cannot be undone.")) {
                              try {
                                await deleteDoc(doc(db, "books", book.id));
                                setMyBooks(prev => prev.filter(b => b.id !== book.id));
                                toast.success("Manuscript removed.");
                              } catch (err) {
                                toast.error("Failed to delete.");
                              }
                            }
                          }} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === "upload" && (
          <motion.form 
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleUpload} 
            className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Book Title</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Author Name (Display)</label>
                    <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ISBN / Book ID (Optional)</label>
                    <input 
                      value={formData.isbn13} 
                      onChange={e => setFormData({...formData, isbn13: e.target.value})} 
                      className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" 
                      placeholder="Leave empty for auto JM-ID" 
                    />
                    <p className="text-[9px] text-slate-400 italic">No ISBN? We'll generate a unique JM-ID for internal use.</p>
                  </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand">
                  {["Educational Textbook", "Lecture Notes", "Fiction", "Non-Fiction", "Business", "Self-Help", "Technology", "History", "Mystery"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (USD)</label>
                <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags (comma separated)</label>
                <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" placeholder="e.g. beginner, study" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none border border-slate-200 focus:ring-1 focus:ring-brand" />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cover Image (High Res JPG)</label>
                <div className="relative flex h-32 items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-brand">
                  <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="absolute inset-0 cursor-pointer opacity-0" />
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    {coverFile ? <CheckCircle2 size={24} className="text-green-500" /> : <Upload size={20} />}
                    <p className="text-[10px] font-bold uppercase">{coverFile ? coverFile.name : "Select Image"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manuscript (PDF/EPUB)</label>
                <div className="relative flex h-32 items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-brand">
                  <input type="file" accept="application/pdf,application/epub+zip" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="absolute inset-0 cursor-pointer opacity-0" />
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    {pdfFile ? <CheckCircle2 size={24} className="text-green-500" /> : <Upload size={20} />}
                    <p className="text-[10px] font-bold uppercase">{pdfFile ? pdfFile.name : "Select Manuscript"}</p>
                  </div>
                </div>
              </div>
            </div>

            <button disabled={loading} className="w-full rounded bg-brand py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="mx-auto animate-spin" /> : "Submit Manuscript for Review"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
