import { motion } from "motion/react";
import { Check, ShieldCheck, Zap, BookOpen } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function Subscriptions() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = (tier: string, price: number) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      signIn();
      return;
    }

    if (!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY) {
      toast.error("Payment system not configured.");
      return;
    }

    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `jmbooks-sub-${tier}-${Date.now()}`,
      amount: price,
      currency: "USD",
      payment_options: "card,mobilemoney,ussd",
      customer: {
        email: user?.email || "",
        phone_number: "",
        name: user?.displayName || "Guest Reader",
      },
      customizations: {
        title: "JM Books Subscription",
        description: "Unlimited reading access",
        logo: "https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-abstract-symbol-book-icon-vector.jpg",
      },
      meta: {
        type: "subscription",
        tier: tier,
        referral_id: localStorage.getItem("referral_id") || ""
      },
      callback: (response: any) => {
        if (response.status === "successful") {
          navigate(`/payment-success?status=successful&tx_ref=${response.tx_ref}&transaction_id=${response.transaction_id}`);
        } else {
          toast.error("Subscription payment unsuccessful.");
        }
      },
      onclose: () => {
        console.log("Subscription modal closed");
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 pb-40 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand">Exclusive Membership</h2>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-brand-dark md:text-6xl">Unlimited Reading.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
          Get instant access to 50,000+ titles with our professional library subscription. One simple tool for serious readers.
        </p>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Monthly */}
        <motion.div
          whileHover={{ y: -8 }}
          className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-10 shadow-sm"
        >
          <div className="mb-8 border-b border-slate-100 pb-8">
            <h3 className="text-xl font-bold text-slate-900">Monthly Plan</h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-black tracking-tighter text-slate-900">$5.00</span>
              <span className="ml-2 text-sm font-bold text-slate-400 uppercase tracking-widest">/ Month</span>
            </div>
          </div>

          <ul className="mb-10 space-y-4">
            {[
              "Full Catalog Access",
              "New Releases Included",
              "Cross-Device Syncing",
              "Cancel Anytime"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <div className="h-1.5 w-1.5 rounded-full bg-brand" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSubscribe("monthly", 5)}
            className="w-full rounded bg-slate-100 py-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-200"
          >
            Start Monthly Plan
          </button>
        </motion.div>

        {/* Yearly */}
        <motion.div
          whileHover={{ y: -8 }}
          className="relative flex flex-col rounded-2xl border-2 border-brand bg-white p-10 shadow-lg"
        >
          <div className="absolute right-0 top-0 rounded-bl-lg bg-accent px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
            Best Value
          </div>
          <div className="mb-8 border-b border-slate-100 pb-8">
            <h3 className="text-xl font-bold text-brand-dark">Annual Plan</h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-black tracking-tighter text-slate-900">$60.00</span>
              <span className="ml-2 text-sm font-bold text-slate-400 uppercase tracking-widest">/ Year</span>
            </div>
          </div>

          <ul className="mb-10 space-y-4">
            {[
              "Everything in Monthly Plan",
              "Annual savings included",
              "Exclusive Author Events",
              "Priority Customer Support"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSubscribe("yearly", 60)}
            className="w-full rounded bg-brand py-4 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90"
          >
            Sart Annual Reading
          </button>
        </motion.div>
      </div>

      <div className="mt-20 flex flex-wrap items-center justify-center gap-12 py-12 border-t border-slate-200 grayscale opacity-40">
        <ShieldCheck size={32} />
        <Zap size={32} />
        <BookOpen size={32} />
        <Check size={32} />
      </div>
    </div>
  );
}
