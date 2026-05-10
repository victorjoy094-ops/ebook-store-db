import React from "react";
import { motion } from "motion/react";
import { BookOpen, Users, Globe, Shield, Award, Zap } from "lucide-react";

export default function About() {
  return (
    <div className="bg-[#F5F5F0] min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 py-24 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-brand blur-3xl" />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-brand blur-3xl opacity-50" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Our Story</span>
            <h1 className="mt-6 text-5xl font-black tracking-tight sm:text-7xl">
              Redefining the <br /> <span className="text-brand">Reading Experience</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg text-slate-400">
              JM BOOKS was founded in 2024 with a simple mission: to bridge the gap between world-class authors and passionate readers through a premium digital platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-black text-slate-900 leading-tight">
                Empowering authors to share their <span className="text-brand italic">untold stories</span> with the world.
              </h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                We believe that every manuscript deserves a beautiful home. JM BOOKS provides an exclusive ecosystem where authors receive fair compensation and readers discover high-quality, curated literature.
              </p>
              
              <div className="mt-10 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-4xl font-black text-slate-900">10k+</p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Active Readers</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-slate-900">500+</p>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Verified Authors</p>
                </div>
              </div>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <Globe className="text-brand mb-4" size={32} />
                  <h3 className="font-bold text-slate-900">Global Reach</h3>
                  <p className="text-xs text-slate-500 mt-2">Connecting authors with readers across 150+ countries.</p>
                </div>
                <div className="rounded-3xl bg-slate-900 p-8 text-white">
                  <Shield className="text-brand mb-4" size={32} />
                  <h3 className="font-bold">Secure Access</h3>
                  <p className="text-xs text-slate-400 mt-2">Advanced DRM and secure payment processing via Flutterwave.</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="rounded-3xl bg-brand p-8 text-white">
                  <Zap className="text-white mb-4" size={32} />
                  <h3 className="font-bold">Instant Delivery</h3>
                  <p className="text-xs text-brand-50 mt-2">Immediate access to your library across all devices.</p>
                </div>
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <Award className="text-brand mb-4" size={32} />
                  <h3 className="font-bold">Premium Quality</h3>
                  <p className="text-xs text-slate-500 mt-2">Only the best manuscripts make it into our core collection.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-white py-24 border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand">Our Values</span>
          <h2 className="mt-4 text-4xl font-black text-slate-900">Built on Trust and Quality</h2>
          
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                title: "Author First",
                desc: "We provide industry-leading 70% royalties to ensure creators are rewarded for their brilliance.",
                icon: <Users className="mx-auto text-brand" size={40} />
              },
              {
                title: "Curated Excellence",
                desc: "Every book on JM BOOKS is vetted to ensure it meets our high standards of literary quality.",
                icon: <BookOpen className="mx-auto text-brand" size={40} />
              },
              {
                title: "Seamless Experience",
                desc: "From browsing to reading, we prioritize a minimal, distraction-free environment.",
                icon: <Zap className="mx-auto text-brand" size={40} />
              }
            ].map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-8"
              >
                {value.icon}
                <h3 className="mt-6 text-xl font-black text-slate-900">{value.title}</h3>
                <p className="mt-4 text-slate-500 line-height-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
