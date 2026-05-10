import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle, Download, BookOpen, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import axios from "axios";
import toast from "react-hot-toast";

export function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasedBook, setPurchasedBook] = useState<any>(null);

  const status = searchParams.get("status");
  const tx_ref = searchParams.get("tx_ref");
  const transaction_id = searchParams.get("transaction_id");

  useEffect(() => {
    async function verifyPayment() {
      if (!user) return;
      
      // If we don't have a transaction_id from the redirect, handle error
      if (!transaction_id) {
        setError("Missing transaction details. Please contact support.");
        setVerifying(false);
        return;
      }

      if (status !== "successful" && status !== "completed") {
        setError("Payment was not successful. Please try again or contact support.");
        setVerifying(false);
        return;
      }

      try {
        // Call backend to verify transaction_id with Flutterwave
        const response = await axios.get(`/api/payments/verify/${transaction_id}`);
        const data = response.data.data;

        if (response.data.status !== "success" || data.status !== "successful") {
          throw new Error("Payment verification failed on server");
        }

        // Verification successful, now update user profile based on metadata
        const userRef = doc(db, "users", user.uid);
        const metadata = data.meta || {};
        const bookId = metadata.book_id;
        const type = metadata.type; // 'purchase' or 'subscription'

        if (type === "purchase" && bookId) {
            const bookDoc = await getDoc(doc(db, "books", bookId));
            if (bookDoc.exists()) {
                const bookData = bookDoc.data();
                setPurchasedBook({ id: bookDoc.id, ...bookData });
                
                await updateDoc(userRef, {
                    purchasedBooks: arrayUnion(bookId)
                });

                // Record Transaction in Firestore
                await addDoc(collection(db, "transactions"), {
                    userId: user.uid,
                    email: user.email,
                    name: user.displayName,
                    bookId: bookId,
                    bookTitle: bookData.title,
                    amount: data.amount,
                    currency: data.currency,
                    type: "purchase",
                    tx_ref: tx_ref,
                    flw_id: transaction_id,
                    status: "successful",
                    referral_id: metadata.referral_id || localStorage.getItem("referral_id"),
                    createdAt: serverTimestamp()
                });
            }
        } else if (type === "subscription") {
            await updateDoc(userRef, {
                subscriptionTier: "monthly", 
                isPremium: true,
                subscriptionExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

            // Record Subscription Transaction
            await addDoc(collection(db, "transactions"), {
                userId: user.uid,
                email: user.email,
                name: user.displayName,
                type: "subscription",
                amount: data.amount,
                currency: data.currency,
                tx_ref: tx_ref,
                flw_id: transaction_id,
                status: "successful",
                referral_id: metadata.referral_id || localStorage.getItem("referral_id"),
                createdAt: serverTimestamp()
            });
        } else {
            // Fallback if metadata is missing (e.g. jmbooks-ID-timestamp)
            const parts = tx_ref?.split('-') || [];
            const fallbackBookId = parts[1];
            
            if (fallbackBookId && fallbackBookId !== 'sub') {
                const bookDoc = await getDoc(doc(db, "books", fallbackBookId));
                if (bookDoc.exists()) {
                    setPurchasedBook({ id: bookDoc.id, ...bookDoc.data() });
                    await updateDoc(userRef, {
                        purchasedBooks: arrayUnion(fallbackBookId)
                    });
                }
            } else {
                // Assume generic premium
                await updateDoc(userRef, { isPremium: true });
            }
        }
        
        // Clear referral after success
        localStorage.removeItem("referral_id");
        toast.success("Payment verified and account updated!");
      } catch (err: any) {
        console.error("Verification error:", err);
        setError(err.response?.data?.message || "Failed to verify your payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
    }

    if (user && verifying) {
        verifyPayment();
    }
  }, [user, status, tx_ref, transaction_id, verifying]);

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
