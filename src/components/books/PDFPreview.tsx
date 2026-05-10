import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

// IMPORTANT: Set up the worker
// Using a reliable CDN for the worker that matches the version in package.json
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.7.284/pdf.worker.min.mjs`;

interface PDFPreviewProps {
  url: string;
  maxPages?: number;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ url, maxPages = 10 }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const loadPdf = async () => {
      if (!url) return;
      setLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        
        if (!active) return;

        const total = Math.min(pdf.numPages, maxPages);

        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Clear previous
          
          for (let i = 1; i <= total; i++) {
            if (!active) break;
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              canvas.className = "mb-8 w-full shadow-2xl rounded-sm border border-slate-200 bg-white opacity-0 transition-opacity duration-500";
              
              if (containerRef.current) {
                containerRef.current.appendChild(canvas);
              }
              
              await (page as any).render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              // Make the page visible after rendering
              canvas.classList.remove('opacity-0');
              
              // Hide loading indicator as soon as the first page is ready
              if (i === 1 && active) {
                setLoading(false);
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        if (active) {
          setError("Could not load preview. Please try again later.");
          setLoading(false);
        }
      } finally {
        // Ensure loading is false even if loop completes or breaks
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [url, maxPages]);

  return (
    <div className="relative min-h-[400px] w-full">
      {loading && (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rendering Manuscript...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-40 text-center px-6">
          <p className="text-sm font-medium text-slate-500">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="flex flex-col items-center px-4 md:px-20" />
      
      {!loading && !error && maxPages <= 10 && (
        <div className="h-40 bg-gradient-to-b from-transparent to-white flex flex-col justify-end items-center pb-12 sticky bottom-0 w-full pointer-events-none">
          <div className="bg-slate-900 text-white rounded-full px-8 py-4 shadow-2xl flex items-center gap-4 pointer-events-auto border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">End of Preview</p>
            </div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Unlock full access to continue</p>
          </div>
        </div>
      )}
    </div>
  );
};
