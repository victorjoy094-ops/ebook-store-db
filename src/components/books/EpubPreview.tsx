import React, { useEffect, useRef, useState } from 'react';
import ePub, { Rendition } from 'epubjs';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface EpubPreviewProps {
  url: string;
  maxPages?: number; // In EPUB, we might limit by chapters or "locations"
}

export const EpubPreview: React.FC<EpubPreviewProps> = ({ url, maxPages = 10 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    let book: any = null;

    const loadEpub = async () => {
      if (!url) return;
      setLoading(true);
      setError(null);

      try {
        book = ePub(url);
        
        await book.ready;
        if (!active) return;

        const meta = await book.loaded.metadata;
        setMetadata(meta);

        if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
          const newRendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
            manager: 'default',
          });

          setRendition(newRendition);

          await newRendition.display();
          
          newRendition.on('relocated', (location: any) => {
            setLocation(location);
            if (location.start) {
              const { displayed, total } = location.start;
              // Some books don't provide reliable page numbers easily
              // but we can try to estimate
            }
          });
        }
      } catch (err: any) {
        console.error("Error loading EPUB:", err);
        if (active) setError("Could not load preview. Please try again later.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadEpub();

    return () => {
      active = false;
      if (book) {
        book.destroy();
      }
    };
  }, [url]);

  const next = () => rendition?.next();
  const prev = () => rendition?.prev();

  return (
    <div className="relative flex flex-col w-full h-[80vh] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opening Digital Book...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <p className="text-sm font-medium text-slate-500">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      {!loading && !error && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-brand/10 flex items-center justify-center text-brand">
              <Settings size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reading Mode</p>
              <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{metadata?.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={prev}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-500">
               Navigation
            </div>
            <button 
              onClick={next}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      <div ref={viewerRef} className="flex-1 w-full epub-viewer" />
      
      {/* Footer Info */}
      {!loading && !error && (
        <div className="px-6 py-2 bg-white border-t border-slate-100 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Drag or Use Arrows to Navigate
          </p>
        </div>
      )}

      <style>{`
        .epub-viewer iframe {
          border: none !important;
        }
      `}</style>
    </div>
  );
};
