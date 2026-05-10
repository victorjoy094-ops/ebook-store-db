import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ShoppingBag, User as UserIcon, LogOut, LayoutDashboard, BookOpen, Search } from "lucide-react";
import { motion } from "motion/react";

export function Navbar() {
  const { user, profile, signIn, logOut, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/store?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-2xl font-black tracking-tight text-brand-dark">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-brand text-white shadow-lg shadow-brand/20">
              <BookOpen size={24} />
            </div>
            <span className="hidden sm:inline">JM BOOKS</span>
          </Link>
          <div className="hidden items-center space-x-6 md:flex">
            <Link to="/store" className="text-sm font-medium text-slate-600 hover:text-brand">Browse</Link>
            <Link to="/subscriptions" className="text-sm font-bold text-accent hover:text-brand">Membership</Link>
            <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-brand">About</Link>
            <Link to="/publish" className="text-sm font-medium text-slate-600 hover:text-brand">Publish</Link>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <form onSubmit={handleSearch} className="relative hidden max-w-xs flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search books..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-full border-none bg-slate-100 py-2 pl-9 pr-4 text-xs outline-none ring-brand transition-all focus:ring-2"
            />
          </form>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <p className="text-xs font-bold text-slate-900">{profile?.isPremium ? "$5.00/mo Plan" : "Free Member"}</p>
                {profile?.isPremium && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Active Member</p>
                )}
              </div>
              <div className="h-8 w-[1px] bg-slate-200" />
              <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-brand ring-2 ring-transparent transition-all hover:ring-brand/20">
                {user.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || "JB"}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="p-2 text-slate-400 hover:text-brand" title="Admin Dashboard">
                  <LayoutDashboard size={20} />
                </Link>
              )}
              <button 
                onClick={logOut}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={signIn}
                className="hidden text-sm font-bold text-slate-600 hover:text-brand sm:block"
              >
                Sign In
              </button>
              <button
                onClick={signIn}
                className="rounded-full bg-slate-900 px-6 py-2 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand active:scale-95"
              >
                Join Now
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
