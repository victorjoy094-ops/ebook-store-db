import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Plus, Upload, Loader2, Check, Settings, BarChart3, Database, Trash2, Edit3, User as UserIcon, DollarSign, BookOpen, Mail, Headphones, Megaphone, FileText, PenTool } from "lucide-react";
import toast from "react-hot-toast";
import { generateAudiobookExcerpt } from "../services/geminiService";

type AdminTab = "upload" | "manage" | "analytics" | "users" | "apps" | "logs" | "collections" | "inbox" | "ads" | "journals" | "stories";

export function Admin() {
  const { user: adminUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("upload");
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [journalSubmissions, setJournalSubmissions] = useState<any[]>([]);
  const [publishedJournals, setPublishedJournals] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    authorId: "SYSTEM",
    isbn13: "",
    category: "Fiction",
    description: "",
    tags: "",
    price: 0,
    status: "published",
  });

  const [collectionForm, setCollectionForm] = useState({
    title: "",
    description: "",
    type: "curated",
    bookIds: [] as string[],
    isActive: true
  });

  const [adForm, setAdForm] = useState({
    title: "",
    position: "home_hero",
    code: "",
    active: true
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    category: "",
    description: "",
    tags: "",
    price: 0
  });

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchData = async () => {
      try {
        const booksSnap = await getDocs(query(collection(db, "books"), orderBy("createdAt", "desc")));
        setBooks(booksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const transSnap = await getDocs(query(collection(db, "transactions"), orderBy("createdAt", "desc")));
        setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const usersSnap = await getDocs(collection(db, "users"));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const appsSnap = await getDocs(query(collection(db, "applications"), orderBy("createdAt", "desc")));
        setApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const logsSnap = await getDocs(query(collection(db, "auditLogs"), orderBy("timestamp", "desc")));
        setAuditLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const collsSnap = await getDocs(query(collection(db, "collections"), orderBy("createdAt", "desc")));
        setCollections(collsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const msgsSnap = await getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc")));
        setMessages(msgsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const adsSnap = await getDocs(query(collection(db, "ads"), orderBy("createdAt", "desc")));
        setAds(adsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const jSubSnap = await getDocs(query(collection(db, "journalSubmissions"), orderBy("createdAt", "desc")));
        setJournalSubmissions(jSubSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const journalsSnap = await getDocs(query(collection(db, "journals"), orderBy("createdAt", "desc")));
        setPublishedJournals(journalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const storiesSnap = await getDocs(query(collection(db, "stories"), orderBy("createdAt", "desc")));
        setStories(storiesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching admin data:", err);
      }
    };
    
    fetchData();
  }, [isAdmin]);

  const startEditing = (book: any) => {
    setEditingBook(book);
    setEditForm({
      title: book.title || "",
      author: book.author || "",
      category: book.category || "Fiction",
      description: book.description || "",
      tags: book.tags?.join(", ") || "",
      price: book.price || 0
    });
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    setLoading(true);
    try {
      const bookRef = doc(db, "books", editingBook.id);
      const updateData = {
        ...editForm,
        tags: editForm.tags.split(",").map(t => t.trim()).filter(t => t !== "")
      };
      await updateDoc(bookRef, updateData);
      
      setBooks(books.map(b => b.id === editingBook.id ? { ...b, ...updateData } : b));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "BOOK_UPDATE",
        performedBy: adminUser?.uid,
        entityId: editingBook.id,
        details: `Updated details for ${editForm.title}`,
        timestamp: serverTimestamp()
      });

      toast.success("Book updated!");
      setEditingBook(null);
    } catch (err) {
      toast.error("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const approveBook = async (bookId: string) => {
    try {
      await updateDoc(doc(db, "books", bookId), { status: "published" });
      setBooks(books.map(b => b.id === bookId ? { ...b, status: "published" } : b));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "BOOK_APPROVE",
        performedBy: adminUser?.uid,
        entityId: bookId,
        details: `Approved manuscript ${bookId}`,
        timestamp: serverTimestamp()
      });

      toast.success("Book published!");
    } catch (err) {
      toast.error("Approval failed.");
    }
  };

  const approveAuthor = async (appId: string, userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { isAuthor: true });
      await updateDoc(doc(db, "applications", appId), { status: "approved" });
      setApplications(applications.map(a => a.id === appId ? { ...a, status: "approved" } : a));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "AUTHOR_APPROVE",
        performedBy: adminUser?.uid,
        entityId: userId,
        details: `Approved author application ${appId} for user ${userId}`,
        timestamp: serverTimestamp()
      });

      toast.success("Author verified!");
    } catch (err) {
      toast.error("Failed to approve author.");
    }
  };

  const rejectAuthor = async (appId: string) => {
    if (!confirm("Reject this author application?")) return;
    try {
      await updateDoc(doc(db, "applications", appId), { status: "rejected" });
      setApplications(applications.map(a => a.id === appId ? { ...a, status: "rejected" } : a));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "AUTHOR_REJECT",
        performedBy: adminUser?.uid,
        entityId: appId,
        details: `Rejected author application ${appId}`,
        timestamp: serverTimestamp()
      });

      toast.success("Application rejected.");
    } catch (err) {
      toast.error("Failed to reject.");
    }
  };

  if (!isAdmin) {
    return <div className="flex h-[70vh] items-center justify-center font-bold">Unauthorized. Admins only.</div>;
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverFile || !pdfFile) {
      toast.error("Please select both cover and Manuscript files.");
      return;
    }

    setLoading(true);
    try {
      const coverRef = ref(storage, `covers/${Date.now()}-${coverFile.name}`);
      const coverSnap = await uploadBytes(coverRef, coverFile);
      const coverUrl = await getDownloadURL(coverSnap.ref);

      const pdfRef = ref(storage, `books/${Date.now()}-${pdfFile.name}`);
      const pdfSnap = await uploadBytes(pdfRef, pdfFile);
      const pdfUrl = await getDownloadURL(pdfSnap.ref);

      const bookData = {
        ...formData,
        isbn13: formData.isbn13.trim() || ("JM-" + Math.random().toString(36).substring(2, 7).toUpperCase() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase()),
        tags: formData.tags.split(",").map(t => t.trim()).filter(t => t !== ""),
        coverUrl,
        pdfUrl,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "books"), bookData);

      await addDoc(collection(db, "auditLogs"), {
        action: "ADMIN_UPLOAD",
        performedBy: adminUser?.uid,
        entityId: docRef.id,
        details: `Admin uploaded ${formData.title}`,
        timestamp: serverTimestamp()
      });

      toast.success("Book published successfully!");
      setFormData({
        title: "", author: "", authorId: "SYSTEM", isbn13: "", category: "Fiction",
        description: "", tags: "", price: 0, status: "published",
      });
      setCoverFile(null);
      setPdfFile(null);
      
      const booksSnap = await getDocs(query(collection(db, "books"), orderBy("createdAt", "desc")));
      setBooks(booksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const deleteBook = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete ${title}?`)) return;
    try {
      await deleteDoc(doc(db, "books", id));
      setBooks(books.filter(b => b.id !== id));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "BOOK_DELETE",
        performedBy: adminUser?.uid,
        entityId: id,
        details: `Deleted book ${title}`,
        timestamp: serverTimestamp()
      });

      toast.success("Book deleted.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collectionForm.bookIds.length === 0) {
      toast.error("Select at least one book.");
      return;
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "collections"), {
        ...collectionForm,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "auditLogs"), {
        action: "COLLECTION_CREATE",
        performedBy: adminUser?.uid,
        entityId: docRef.id,
        details: `Created collection ${collectionForm.title}`,
        timestamp: serverTimestamp()
      });

      toast.success("Collection created!");
      setCollectionForm({ title: "", description: "", type: "curated", bookIds: [], isActive: true });
      
      const collsSnap = await getDocs(query(collection(db, "collections"), orderBy("createdAt", "desc")));
      setCollections(collsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Creation failed.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (id: string, title: string) => {
    if (!confirm(`Delete collection ${title}?`)) return;
    try {
      await deleteDoc(doc(db, "collections", id));
      setCollections(collections.filter(c => c.id !== id));
      toast.success("Collection removed.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const markMessageRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "contactMessages", id), { status: "read" });
      setMessages(messages.map(m => m.id === id ? { ...m, status: "read" } : m));
    } catch (err) {
      toast.error("Failed to update message.");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "contactMessages", id));
      setMessages(messages.filter(m => m.id !== id));
      toast.success("Message deleted.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const handleGenerateAudio = async (book: any) => {
    if (!book.description && !book.title) {
      toast.error("Book needs a description to generate audio.");
      return;
    }

    setGeneratingAudio(book.id);
    try {
      const textToRead = `Book: ${book.title}. Description: ${book.description}`;
      const base64Audio = await generateAudiobookExcerpt(textToRead);
      
      if (!base64Audio) throw new Error("No audio generated");

      // Convert base64 to Blob
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/wav" });
      const file = new File([blob], `audiobook-${book.id}.wav`, { type: "audio/wav" });

      // Upload to Storage
      const audioRef = ref(storage, `audiobooks/${book.id}-${Date.now()}.wav`);
      const snap = await uploadBytes(audioRef, file);
      const audioUrl = await getDownloadURL(snap.ref);

      // Update Firestore
      await updateDoc(doc(db, "books", book.id), {
        audioUrl,
        hasAudiobook: true
      });

      setBooks(books.map(b => b.id === book.id ? { ...b, audioUrl, hasAudiobook: true } : b));
      
      await addDoc(collection(db, "auditLogs"), {
        action: "AUDIOBOOK_GENERATE",
        performedBy: adminUser?.uid,
        entityId: book.id,
        details: `Generated AI audiobook for ${book.title}`,
        timestamp: serverTimestamp()
      });

      toast.success("Audiobook generated successfully!");
    } catch (err) {
      console.error("Audio generation failed:", err);
      toast.error("Failed to generate audiobook. Please try again.");
    } finally {
      setGeneratingAudio(null);
    }
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const adData = {
        ...adForm,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "ads"), adData);
      
      await addDoc(collection(db, "auditLogs"), {
        action: "AD_CREATE",
        performedBy: adminUser?.uid,
        entityId: docRef.id,
        details: `Created ad ${adForm.title} for ${adForm.position}`,
        timestamp: serverTimestamp()
      });

      toast.success("Ad created!");
      setAdForm({ title: "", position: "home_hero", code: "", active: true });
      
      const adsSnap = await getDocs(query(collection(db, "ads"), orderBy("createdAt", "desc")));
      setAds(adsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Failed to create ad.");
    } finally {
      setLoading(false);
    }
  };

  const deleteAd = async (id: string, title: string) => {
    if (!confirm(`Delete ad ${title}?`)) return;
    try {
      await deleteDoc(doc(db, "ads", id));
      setAds(ads.filter(a => a.id !== id));
      toast.success("Ad deleted.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const publishJournal = async (sub: any) => {
    setLoading(true);
    try {
      const journalData = {
        title: sub.title,
        author: sub.authorName,
        authorId: sub.authorId,
        abstract: sub.abstract,
        contentUrl: sub.fileUrl,
        category: sub.category,
        status: "published",
        readCount: 0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "journals"), journalData);
      
      await updateDoc(doc(db, "journalSubmissions", sub.id), {
        status: "published"
      });

      setJournalSubmissions(journalSubmissions.map(s => s.id === sub.id ? { ...s, status: "published" } : s));
      setPublishedJournals([{ id: docRef.id, ...journalData }, ...publishedJournals]);

      await addDoc(collection(db, "auditLogs"), {
        action: "JOURNAL_PUBLISH",
        performedBy: adminUser?.uid,
        entityId: docRef.id,
        details: `Published journal ${sub.title} from submission ${sub.id}`,
        timestamp: serverTimestamp()
      });

      toast.success("Journal published to directory!");
    } catch (err) {
      toast.error("Failed to publish journal.");
    } finally {
      setLoading(false);
    }
  };

  const deleteJournal = async (id: string, title: string) => {
    if (!confirm(`Delete published journal ${title}?`)) return;
    try {
      await deleteDoc(doc(db, "journals", id));
      setPublishedJournals(publishedJournals.filter(j => j.id !== id));
      toast.success("Journal removed.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const totalRevenue = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Admin Console</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Library Control & Accountability</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 rounded-lg bg-slate-100 p-1">
          {[
            { id: "upload", icon: Plus, label: "Add" },
            { id: "manage", icon: Database, label: "Library" },
            { id: "collections", icon: BookOpen, label: "Curated" },
            { id: "apps", icon: UserIcon, label: "Apps" },
            { id: "inbox", icon: Mail, label: "Inbox" },
            { id: "ads", icon: Megaphone, label: "Ads" },
            { id: "journals", icon: FileText, label: "Journals" },
            { id: "stories", icon: PenTool, label: "Stories" },
            { id: "users", icon: DollarSign, label: "Users" },
            { id: "analytics", icon: BarChart3, label: "Stats" },
            { id: "logs", icon: Database, label: "Logs" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 rounded px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                activeTab === tab.id ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "upload" && (
        <form onSubmit={handleUpload} className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Book Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Author</label>
              <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">ISBN / Book ID (Optional)</label>
              <input value={formData.isbn13} onChange={e => setFormData({...formData, isbn13: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" placeholder="Auto-generated if empty" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand">
                {["Educational Textbooks", "Lecture Notes", "Fiction", "Non-Fiction", "Business", "Self-Help", "Technology", "History", "Mystery"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (USD)</label>
              <input required type="number" step="0.01" value={isNaN(formData.price) ? "" : formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags (comma separated)</label>
              <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" placeholder="e.g. beginner, study, physics" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
            <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cover Image</label>
              <div className="relative flex h-32 items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-brand">
                <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="absolute inset-0 cursor-pointer opacity-0" />
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  {coverFile ? <Check size={20} className="text-green-500" /> : <Upload size={20} />}
                  <p className="text-[10px] font-bold uppercase">{coverFile ? coverFile.name : "Select JPG/PNG"}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manuscript (PDF/EPUB)</label>
              <div className="relative flex h-32 items-center justify-center rounded border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-brand">
                <input type="file" accept="application/pdf,application/epub+zip" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="absolute inset-0 cursor-pointer opacity-0" />
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  {pdfFile ? <Check size={20} className="text-green-500" /> : <Upload size={20} />}
                  <p className="text-[10px] font-bold uppercase">{pdfFile ? pdfFile.name : "Select PDF/EPUB"}</p>
                </div>
              </div>
            </div>
          </div>

          <button disabled={loading} className="w-full rounded bg-brand py-4 text-sm font-black uppercase tracking-widest text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                <span>Publishing...</span>
              </div>
            ) : "Publish Book"}
          </button>
        </form>
      )}

      {activeTab === "manage" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Title & Author</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.map(book => (
                <tr key={book.id}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{book.title}</p>
                    <p className="text-xs text-slate-500">{book.author}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                        book.status === "published" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        {book.status || "pending"}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${book.price?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {book.status !== 'published' && (
                        <button 
                          onClick={() => approveBook(book.id)} 
                          className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-green-600 hover:bg-green-100" 
                          title="Publish Book"
                        >
                          <Check size={12} /> Publish
                        </button>
                      )}
                      {adminUser?.email === "mbotorjoy@gmail.com" && (
                        <button 
                          onClick={() => handleGenerateAudio(book)}
                          disabled={generatingAudio === book.id || (book.audiobookRequestStatus !== 'paid' && book.authorId !== 'SYSTEM')}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${
                            book.hasAudiobook 
                              ? "bg-brand/10 text-brand hover:bg-brand/20" 
                              : (book.audiobookRequestStatus === 'paid' || book.authorId === 'SYSTEM' ? "bg-slate-50 text-slate-400 hover:bg-slate-100" : "bg-slate-50 text-slate-200 cursor-not-allowed")
                          }`}
                          title={!book.hasAudiobook && book.audiobookRequestStatus !== 'paid' && book.authorId !== 'SYSTEM' ? "Waiting for author payment ($10)" : (book.hasAudiobook ? "Regenerate Audiobook" : "Generate Audiobook")}
                        >
                          {generatingAudio === book.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Headphones size={12} />
                          )}
                          {book.hasAudiobook ? "Regenerate" : "AI Audio"}
                        </button>
                      )}
                      <button onClick={() => startEditing(book)} className="text-slate-400 hover:text-brand" title="Edit Book"><Edit3 size={16} /></button>
                      <button onClick={() => deleteBook(book.id, book.title)} className="text-slate-400 hover:text-red-500" title="Delete Book"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Edit Book Details</h2>
              <button onClick={() => setEditingBook(null)} className="text-slate-400 hover:text-slate-600">
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                  <input required value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Author</label>
                  <input required value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand">
                    {["Educational Textbooks", "Lecture Notes", "Fiction", "Non-Fiction", "Business", "Self-Help", "Technology", "History", "Mystery"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (USD)</label>
                  <input required type="number" step="0.01" value={isNaN(editForm.price) ? "" : editForm.price} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags (comma separated)</label>
                  <input value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                <textarea required rows={5} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" />
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setEditingBook(null)} className="flex-1 rounded bg-slate-100 py-3 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200">
                  Cancel
                </button>
                <button disabled={loading} className="flex-[2] rounded bg-brand py-3 text-xs font-black uppercase tracking-widest text-white shadow-md hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 className="mx-auto animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "collections" && (
        <div className="space-y-12">
          <form onSubmit={handleCreateCollection} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Create Curated Collection</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collection Title</label>
                <input required value={collectionForm.title} onChange={e => setCollectionForm({...collectionForm, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" placeholder="e.g. Staff Picks" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                <select value={collectionForm.type} onChange={e => setCollectionForm({...collectionForm, type: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand">
                  <option value="staff_pick">Staff Pick</option>
                  <option value="curated">Curated</option>
                  <option value="thematic">Thematic</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <textarea rows={2} value={collectionForm.description} onChange={e => setCollectionForm({...collectionForm, description: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" placeholder="Describe this collection..." />
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Books ({collectionForm.bookIds.length})</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto rounded border border-slate-100 p-4">
                {books.map(book => {
                  const isSelected = collectionForm.bookIds.includes(book.id);
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        const newIds = isSelected 
                          ? collectionForm.bookIds.filter(id => id !== book.id)
                          : [...collectionForm.bookIds, book.id];
                        setCollectionForm({...collectionForm, bookIds: newIds});
                      }}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        isSelected ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="h-10 w-8 flex-shrink-0 bg-slate-100 overflow-hidden rounded">
                        {book.coverUrl && <img src={book.coverUrl} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-slate-900">{book.title}</p>
                        <p className="truncate text-[8px] text-slate-400 uppercase font-black">{book.author}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button disabled={loading} className="w-full rounded bg-brand py-4 text-sm font-black uppercase tracking-widest text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="mx-auto animate-spin" /> : "Create Collection"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Collections</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Title & Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Books</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.map(coll => (
                  <tr key={coll.id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{coll.title}</p>
                      <span className="text-[8px] font-black uppercase tracking-widest text-brand">{coll.type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {coll.bookIds?.length || 0} Titles
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {coll.createdAt?.toDate ? coll.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => deleteCollection(coll.id, coll.title)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {collections.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm italic text-slate-400">No collections created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "apps" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Author Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Bio & Portfolio</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map(app => (
                <tr key={app.id}>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{app.userName}</td>
                  <td className="px-6 py-4 max-w-xs">
                    <div 
                      className="text-xs text-slate-600 line-clamp-3 prose prose-slate prose-xs"
                      dangerouslySetInnerHTML={{ __html: app.bio }}
                    />
                    {app.portfolioUrl && <a href={app.portfolioUrl} target="_blank" className="text-[10px] font-bold text-brand hover:underline">{app.portfolioUrl}</a>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      app.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => approveAuthor(app.id, app.userId)} className="flex items-center gap-1 rounded bg-brand px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-white hover:opacity-90">
                          Approve
                        </button>
                        <button onClick={() => rejectAuthor(app.id)} className="flex items-center gap-1 rounded bg-slate-100 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:bg-red-50 hover:text-red-500">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3 text-brand">
                <DollarSign size={20} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Gross Revenue</h3>
              </div>
              <p className="mt-4 text-4xl font-black text-slate-900">${totalRevenue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-400">Lifetime platform sales</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3 text-accent">
                <BookOpen size={20} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Total Volumes</h3>
              </div>
              <p className="mt-4 text-4xl font-black text-slate-900">{books.length}</p>
              <p className="mt-1 text-xs text-slate-400">Available titles in store</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3 text-blue-500">
                <UserIcon size={20} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Active Readers</h3>
              </div>
              <p className="mt-4 text-4xl font-black text-slate-900">{users.length}</p>
              <p className="mt-1 text-xs text-slate-400">Aggregated user base</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Transactions</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{tx.name || "Customer"}</p>
                      <p className="text-[10px] text-slate-400">{tx.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${tx.type === 'subscription' ? 'bg-accent/10 text-accent' : 'bg-brand/10 text-brand'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">${tx.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Performed By</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td className="px-6 py-4">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{log.details}</td>
                  <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{log.performedBy}</td>
                  <td className="px-6 py-4 text-[10px] text-slate-400">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "users" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User Identification</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Membership</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{u.displayName || "Unknown"}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${u.isPremium ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {u.isPremium ? "Premium" : "Free"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${u.isAuthor ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400'}`}>
                      {u.isAuthor ? "Author" : "Reader"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "inbox" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Inbox</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand">{messages.filter(m => m.status === 'unread').length} Unread</p>
            </div>
            <div className="divide-y divide-slate-100">
              {messages.map(msg => (
                <div key={msg.id} className={`p-6 transition-colors ${msg.status === 'unread' ? 'bg-brand/5' : 'hover:bg-slate-50'}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{msg.name}</span>
                        <span className="text-[10px] text-slate-400">({msg.email})</span>
                        {msg.status === 'unread' && <span className="h-2 w-2 rounded-full bg-brand"></span>}
                      </div>
                      <p className="text-xs font-bold text-brand uppercase tracking-widest">{msg.subject}</p>
                      <p className="mt-4 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {msg.status === 'unread' && (
                        <button 
                          onClick={() => markMessageRead(msg.id)}
                          className="flex items-center gap-1 rounded bg-white border border-slate-200 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:border-brand hover:text-brand"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button 
                        onClick={() => deleteMessage(msg.id)}
                        className="flex items-center gap-1 rounded bg-white border border-slate-200 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:border-red-200 hover:text-red-500"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="px-6 py-12 text-center text-sm italic text-slate-400">No messages found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ads" && (
        <div className="space-y-12">
          <form onSubmit={handleAdSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Add New Advertisement</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ad Title (internal)</label>
                <input required value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand" placeholder="e.g. Summer Sale Banner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position</label>
                <select value={adForm.position} onChange={e => setAdForm({...adForm, position: e.target.value})} className="w-full rounded bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand">
                  <option value="home_hero">Home Hero Bottom</option>
                  <option value="home_featured">Home Featured Middle</option>
                  <option value="store_sidebar">Store Sidebar</option>
                  <option value="book_details_bottom">Book Details Bottom</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ad Code (HTML/Script)</label>
              <textarea required rows={6} value={adForm.code} onChange={e => setAdForm({...adForm, code: e.target.value})} className="font-mono w-full rounded bg-slate-50 px-4 py-3 text-xs font-medium outline-none focus:ring-1 focus:ring-brand" placeholder="<div class='my-ad'>...</div>" />
              <p className="text-[10px] text-slate-400">Paste your ad network snippet or custom HTML here.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={adForm.active} onChange={e => setAdForm({...adForm, active: e.target.checked})} id="ad-active" className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
              <label htmlFor="ad-active" className="text-sm font-bold text-slate-700">Set as Active</label>
            </div>

            <button disabled={loading} className="w-full rounded bg-brand py-4 text-sm font-black uppercase tracking-widest text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="mx-auto animate-spin" /> : "Deploy Advertisement"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Configured Ads</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ad Title</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Position</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ads.map(ad => (
                  <tr key={ad.id}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{ad.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand">{ad.position.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                          ad.active ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                        }`}>
                        {ad.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => deleteAd(ad.id, ad.title)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {ads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm italic text-slate-400">No ads configured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "journals" && (
        <div className="space-y-12">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Journal Submissions (Vetting Required)</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Journal Submission</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Author</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {journalSubmissions.filter(s => s.status !== 'published').map(sub => (
                            <tr key={sub.id}>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900">{sub.title}</p>
                                    <p className="text-[10px] font-medium text-brand uppercase tracking-widest">{sub.category}</p>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">{sub.authorName}</td>
                                <td className="px-6 py-4">
                                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-brand">{sub.status}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded bg-slate-100 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200">Review PDF</a>
                                        <button 
                                            onClick={() => publishJournal(sub)}
                                            className="rounded bg-brand px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-white hover:opacity-90"
                                        >
                                            Publish
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Published Journals</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Journal Title</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Author</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reads</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {publishedJournals.map(j => (
                            <tr key={j.id}>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900">{j.title}</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{j.category}</p>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">{j.author}</td>
                                <td className="px-6 py-4 text-sm font-black text-brand">{j.readCount || 0}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => deleteJournal(j.id, j.title)} className="text-slate-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === "stories" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Stories Registry</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand">{stories.length} Total Stories</p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Story Title</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Author</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reads</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stories.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{s.title}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{s.category}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{s.authorName}</td>
                  <td className="px-6 py-4 text-sm font-black text-brand">{s.readCount || 0}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={async () => {
                        if (confirm(`Delete story "${s.title}"?`)) {
                          await deleteDoc(doc(db, "stories", s.id));
                          setStories(stories.filter(story => story.id !== s.id));
                          toast.success("Story deleted.");
                        }
                      }} 
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {stories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm italic text-slate-400">No stories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

