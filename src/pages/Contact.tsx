import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    setSubmitted(true);
    toast.success("Message sent successfully!");
  };

  return (
    <div className="bg-[#F5F5F0] min-h-screen py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Left Side: Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-brand">Contact Us</span>
            <h1 className="mt-6 text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Get in touch with our <br /> <span className="text-brand">Support Team</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-md">
              Have questions about your subscription, author application, or a specific title? We're here to help you.
            </p>

            <div className="mt-12 space-y-8">
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-brand">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Email Us</p>
                  <p className="text-lg font-black text-slate-900 mt-1">support@jmbooks.store</p>
                </div>
              </div>
              
              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-brand">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Call Us</p>
                  <p className="text-lg font-black text-slate-900 mt-1">+1 (555) 000-1234</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-brand">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Visit Us</p>
                  <p className="text-lg font-black text-slate-900 mt-1">Lagos, Nigeria | Remote Worldwide</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side: Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[2.5rem] bg-white p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100"
          >
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <CheckCircle className="text-green-500 mb-6" size={80} />
                <h2 className="text-2xl font-black text-slate-900">Message Received!</h2>
                <p className="mt-4 text-slate-500">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-8 text-sm font-black uppercase tracking-widest text-brand hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</label>
                  <select 
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  >
                    <option>General Inquiry</option>
                    <option>Subscription Help</option>
                    <option>Author Application</option>
                    <option>Content Removal</option>
                    <option>Technical Issue</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                  <textarea 
                    required
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/5 resize-none"
                    placeholder="How can we help you today?"
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-full bg-slate-900 py-5 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-brand disabled:opacity-50 active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                      Send Message
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
