import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, User, ArrowRight, Check, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const OnboardingModal: React.FC = () => {
  const { user, profile } = useAuth();
  const [role, setRole] = useState<'reader' | 'author' | null>(null);
  const [loading, setLoading] = useState(false);

  // If already onboarded, don't show
  if (!user || profile?.onboarded !== false) return null;

  const handleComplete = async () => {
    if (!role) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        onboarded: true,
        isAuthor: role === 'author',
        role: role
      });
      
      if (role === 'author') {
        toast.success(`Welcome Creator! You can now publish manuscripts.`);
      } else {
        toast.success(`Welcome to JM BOOKS!`);
      }
    } catch (err) {
      toast.error("Failed to save selection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
      >
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white">
                   <BookOpen size={18} />
                </div>
                <span className="font-black uppercase tracking-tighter text-lg">JM BOOKS</span>
              </div>
              <h2 className="text-2xl font-black leading-tight">Your Journey Starts Here.</h2>
              <p className="mt-4 text-sm text-slate-400">Choose how you want to experience the future of digital literature.</p>
            </div>
            
            <div className="hidden md:block">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="h-1 w-8 bg-brand" />
                Step 01 of 01
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 md:p-12">
            <h3 className="text-xl font-black text-slate-900 mb-8">Tell us about yourself</h3>
            
            <div className="space-y-4">
              <button 
                onClick={() => setRole('reader')}
                className={`w-full flex items-center gap-6 p-6 rounded-2xl border-2 transition-all text-left ${
                  role === 'reader' 
                    ? 'border-brand bg-brand/5' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center transition-colors ${
                  role === 'reader' ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400'
                }`}>
                  <User size={28} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900">I am a Reader</p>
                  <p className="text-xs text-slate-500 mt-1">Explore thousands of premium manuscripts and build your library.</p>
                </div>
                {role === 'reader' && <div className="h-6 w-6 rounded-full bg-brand text-white flex items-center justify-center"><Check size={14} /></div>}
              </button>

              <button 
                onClick={() => setRole('author')}
                className={`w-full flex items-center gap-6 p-6 rounded-2xl border-2 transition-all text-left ${
                  role === 'author' 
                    ? 'border-brand bg-brand/5' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center transition-colors ${
                  role === 'author' ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400'
                }`}>
                  <BookOpen size={28} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900">I am an Author</p>
                  <p className="text-xs text-slate-500 mt-1">Publish your own work, reach global readers, and earn royalties.</p>
                </div>
                {role === 'author' && <div className="h-6 w-6 rounded-full bg-brand text-white flex items-center justify-center"><Check size={14} /></div>}
              </button>
            </div>

            <div className="mt-12 flex items-center justify-between">
               <p className="text-[10px] font-bold text-slate-400 uppercase max-w-[180px]">
                 You can change your role anytime in your profile settings.
               </p>
               <button 
                 disabled={!role || loading}
                 onClick={handleComplete}
                 className="flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-brand disabled:opacity-50 active:scale-95"
               >
                 {loading ? <Loader2 className="animate-spin" /> : (
                   <>
                     Complete Setup
                     <ArrowRight size={16} />
                   </>
                 )}
               </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
