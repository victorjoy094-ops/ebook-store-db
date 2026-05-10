import { Facebook, Twitter, Instagram, Mail, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-slate-900 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-8 border-b border-white/10 pb-10 md:flex-row">
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-brand text-white shadow-lg">
                <BookOpen size={18} />
              </div>
              <span className="text-xl font-black tracking-tight">JM BOOKS</span>
            </div>
            <span className="text-sm text-slate-400">© 2026 JM Books Store</span>
            <div className="flex gap-6 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <Link to="/about" className="hover:text-white">About</Link>
              <Link to="/contact" className="hover:text-white">Contact</Link>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Privacy</a>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">Secured by</span>
              <div className="flex items-center rounded bg-white px-2 py-0.5 font-black italic text-slate-900 text-[10px]">
                FLUTTERWAVE <span className="ml-1 text-[8px] text-accent">USD</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-slate-400 uppercase tracking-widest font-black">Follow Us:</span>
              <div className="flex gap-4">
                <a href="#" className="text-slate-400 hover:text-brand transition-colors">
                  <Twitter size={18} />
                </a>
                <a href="#" className="text-slate-400 hover:text-brand transition-colors">
                  <Facebook size={18} />
                </a>
                <a href="#" className="text-slate-400 hover:text-brand transition-colors">
                  <Instagram size={18} />
                </a>
                <a href="#" className="text-slate-400 hover:text-brand transition-colors">
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-[10px] text-slate-500">
          Professional Ebook Store & Metadata SEO Optimized Frontend.
        </p>
      </div>
    </footer>
  );
}
