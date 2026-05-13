import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Megaphone, ExternalLink } from "lucide-react";

interface AdSpaceProps {
  position: "home_hero" | "home_featured" | "store_sidebar" | "book_details_bottom";
  className?: string;
}

export const AdSpace: React.FC<AdSpaceProps> = ({ position, className = "" }) => {
  const { isAdmin } = useAuth();
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const q = query(
          collection(db, "ads"),
          where("position", "==", position),
          where("active", "==", true),
          limit(5) // Get a few to pick one randomly
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const ads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const randomAd = ads[Math.floor(Math.random() * ads.length)];
          setAd(randomAd);
        }
      } catch (err) {
        console.error("Ad fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [position]);

  // Effect to handle script execution if the ad code contains scripts
  useEffect(() => {
    if (ad && ad.code) {
      // Find all scripts in the ad code
      const div = document.getElementById(`ad-container-${position}`);
      if (div) {
        const scripts = div.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          const newScript = document.createElement("script");
          if (script.src) {
            newScript.src = script.src;
            newScript.async = true;
          } else {
            newScript.textContent = script.textContent;
          }
          document.body.appendChild(newScript);
        }
      }
    }
  }, [ad, position]);

  if (loading) return null;
  if (!ad && !isAdmin) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isAdmin && (
        <div className="absolute top-0 right-0 z-10 bg-brand/10 text-brand px-2 py-0.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border-b border-l border-brand/20">
          <Megaphone size={8} /> Ad Slot: {position.replace('_', ' ')}
        </div>
      )}
      
      {ad ? (
        <div 
          id={`ad-container-${position}`}
          className="ad-content w-full h-full flex items-center justify-center min-h-[50px]"
          dangerouslySetInnerHTML={{ __html: ad.code }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
          <Megaphone size={20} className="mb-2 opacity-20" />
          <p className="text-[10px] font-bold uppercase tracking-widest">No active ad for this slot</p>
        </div>
      )}
    </div>
  );
};
