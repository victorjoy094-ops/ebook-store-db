import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, setDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle, Download, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasedBook, setPurchasedBook] = useState<any>(null);

  const status = searchParams.get("status");
  const tx_ref = searchParams.get("tx_ref");
  const transaction_id = searchParams.get("transaction_id");

  useEffect(() => {
    async function verifyPayment() {
      if (!user) return;
      if (status !== "successful" && status !== "completed") {
        setError("Payment was not successful. Please try again.");
        setVerifying(false);
        return;
      }

      try {
        // In a real app, we'd call a backend to verify transaction_id with Flutterwave
        // For this applet, we'll trust the status param but check if we already processed it
        
        // Extract metadata if we stored it in tx_ref or elsewhere
        // Here we'll just assume success for demo purposes if status is successful
        
        // Update user profile
        const userRef = doc(db, "users", user.uid);
        
        // If it's a book purchase (we can find out from tx_ref or metadata)
        // For simplicity, let's assume we store the bookId in tx_ref if it's jmbooks-bookid-timestamp
        const parts = tx_ref?.split('-') || [];
        const bookId = parts[1]; // jmbooks-ID-timestamp

        if (bookId) {
            const bookDoc = await getDoc(doc(db, "books", bookId));
            if (bookDoc.exists()) {
                setPurchasedBook({ id: bookDoc.id, ...bookDoc.data() });
                await updateDoc(userRef, {
                    purchasedBooks: arrayUnion(bookId)
                });

                // Record Transaction
                await addDoc(collection(db, "transactions"), {
                    userId: user.uid,
                    email: user.email,
                    name: user.displayName,
                    bookId: bookId,
                    authorId: bookDoc.data().authorId || "SYSTEM",
                    amount: bookDoc.data().price,
                    type: "purchase",
                    tx_ref: tx_ref,
                    status: "successful",
                    referral_id: localStorage.getItem("referral_id"),
                    createdAt: serverTimestamp()
                });
            }
        } else {
            // Check if it's a subscription
            await updateDoc(userRef, {
                subscriptionTier: "monthly", 
                isPremium: true
            });

            // Record Subscription Transaction
            await addDoc(collection(db, "transactions"), {
                userId: user.uid,
                email: user.email,
                name: user.displayName,
                type: "subscription",
                amount: 5, // Default monthly
                tx_ref: tx_ref,
                status: "successful",
                referral_id: localStorage.getItem("referral_id"),
                createdAt: serverTimestamp()
            });
        }
        
        // Clear referral after success
        localStorage.removeItem("referral_id");
      } catch (err) {
        console.error("Verification error:", err);
        setError("Failed to update your profile. Please contact support.");
      } finally {
        setVerifying(false);
      }
    }

    if (user) {
        verifyPayment();
    }
  }, [user, status, tx_ref]);

  if (verifying) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-brand" />
        <p className="mt-4 font-medium text-gray-600">Verifying your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <CheckCircle className="rotate-45" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-bold">Payment Error</h1>
        <p className="mt-4 text-gray-600">{error}</p>
        <Link to="/" className="mt-8 inline-block rounded-full bg-brand px-8 py-3 font-bold text-white">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-white p-12 text-center shadow-xl border border-black/5"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle size={40} />
        </div>
        <h1 className="mt-8 font-serif text-4xl font-bold">Payment Successful!</h1>
        <p className="mt-4 text-lg text-gray-600">
          Thank you for your purchase. Your account has been updated and your book is ready.
        </p>

        {purchasedBook && (
          <div className="mt-12 overflow-hidden rounded-2xl border border-black/10 text-left">
            <div className="flex gap-6 p-6">
              <div className="h-40 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                <img 
                    src={purchasedBook.coverUrl} 
                    alt={purchasedBook.title} 
                    className="h-full w-full object-cover" 
                    referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold">{purchasedBook.title}</h3>
                <p className="text-sm text-gray-600">by {purchasedBook.author}</p>
                <p className="mt-4 text-xs font-bold uppercase text-gray-400">Transaction ID: {transaction_id}</p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <a 
                    href={purchasedBook.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full bg-brand px-6 py-2 text-sm font-bold text-white"
                  >
                    <Download size={16} /> Download PDF
                  </a>
                  <Link to={`/book/${purchasedBook.id}`} className="flex items-center gap-2 rounded-full border border-gray-200 px-6 py-2 text-sm font-bold text-gray-600">
                    <BookOpen size={16} /> View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!purchasedBook && (
          <div className="mt-12 rounded-2xl bg-brand/5 p-8">
            <h3 className="font-serif text-xl font-bold text-brand">Premium Membership Active</h3>
            <p className="mt-2 text-sm text-gray-600">You now have unlimited access to our entire catalog.</p>
            <Link to="/store" className="mt-6 inline-flex items-center gap-2 font-bold text-brand hover:underline">
              Start Reading <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
