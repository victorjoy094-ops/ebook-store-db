import React from "react";
import { motion } from "motion/react";
import { Shield, Lock, FileText, CheckCircle2 } from "lucide-react";

export function TermsAndPrivacy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-16"
      >
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-slate-900 italic">Terms & Privacy</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Last Updated: May 2024</p>
        </div>

        <section className="space-y-8">
          <div className="flex items-center gap-4 text-brand">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand/10">
              <Shield size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 border-b-4 border-brand">Privacy Policy</h2>
          </div>
          
          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <p>
              At JM BOOKS, we prioritize your digital privacy. This policy outlines how we handle your data when you interact with our decentralized publishing platform.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
               <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-4">What we collect</h4>
                  <ul className="space-y-2 text-sm italic">
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-brand" size={14} /> Basic Profile Info (Name, Email)</li>
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-brand" size={14} /> Transaction History</li>
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-brand" size={14} /> Reading Preferences & Library</li>
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-brand" size={14} /> Wallet Address (for Authors)</li>
                  </ul>
               </div>
               <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-4">How we use it</h4>
                  <ul className="space-y-2 text-sm italic">
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-green-500" size={14} /> Personalizing your library</li>
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-green-500" size={14} /> Secure payment routing</li>
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-green-500" size={14} /> Improving AI Audio services</li>
                    <li className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-green-500" size={14} /> Ensuring author royalties</li>
                  </ul>
               </div>
            </div>

            <p>
                Your data is never sold to third-party advertisers. We use industry-standard encryption (AES-256) and Firebase's secure infrastructure to protect your personal information.
            </p>
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4 text-accent">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent/10">
              <FileText size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 border-b-4 border-accent">Terms of Service</h2>
          </div>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <h3 className="text-lg font-black text-slate-900">1. Acceptance of Terms</h3>
            <p>By accessing JM BOOKS, you agree to be bound by these terms. If you do not agree, please do not use our services.</p>

            <h3 className="text-lg font-black text-slate-900">2. Author & Publisher Rules</h3>
            <p>Authors must own 100% of the copyright for any manuscript they upload. Plagiarism or copyright infringement will result in permanent account termination and forfeiture of earnings.</p>
            
            <h3 className="text-lg font-black text-slate-900">3. Journal Submissions</h3>
            <p>Scientific and academic journals require a $40 non-refundable vetting fee. Publication is not guaranteed and depends on the quality and integrity of the research.</p>

            <h3 className="text-lg font-black text-slate-900">4. Refund Policy</h3>
            <p>Digital downloads and subscriptions are generally non-refundable due to the nature of digital assets. However, if you encounter technical issues, contact our support team.</p>

            <h3 className="text-lg font-black text-slate-900">5. AI Services</h3>
            <p>Our AI-generated audiobooks are provided "as-is". We strive for perfection, but natural voice inflections may vary based on text complexity.</p>
          </div>
        </section>

        <div className="rounded-3xl bg-slate-900 p-12 text-center text-white space-y-6">
           <Lock className="mx-auto text-brand" size={40} />
           <h3 className="text-2xl font-black tracking-tight leading-tight">Your Trust is Our Foundation.</h3>
           <p className="text-slate-400 text-sm max-w-md mx-auto italic">
              JM BOOKS is committed to transparency. If we change our terms, we will notify all registered users via their primary email.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
