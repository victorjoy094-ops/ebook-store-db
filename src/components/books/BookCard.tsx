import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Star, Headphones } from "lucide-react";

interface BookCardProps {
  book: any;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative flex flex-col"
    >
      <Link 
        to={`/book/${book.id}`} 
        className="relative aspect-[3/4] overflow-hidden rounded shadow-sm transition-shadow hover:shadow-md"
      >
        <img
          src={book.coverUrl || `https://picsum.photos/seed/${book.id}/300/400`}
          alt={book.title}
          className="h-full w-full object-cover grayscale-[0.2] transition-transform duration-500 group-hover:scale-105 group-hover:grayscale-0"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded px-1.5 py-0.5 text-[9px] font-medium italic text-slate-500 border border-slate-100">
          {book.isbn13 || "978-0000000000"}
        </div>
        {book.hasAudiobook && (
          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-lg animate-pulse" title="Audiobook Available">
            <Headphones size={12} />
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-brand rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          {book.price === 0 ? "FREE" : `$${book.price.toFixed(2)}`}
        </div>
      </Link>
      
      <div className="mt-3 flex flex-col">
        <h3 className="text-xs font-black text-slate-900 group-hover:text-brand truncate">
          <Link to={`/book/${book.id}`}>{book.title}</Link>
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-500 font-medium">
          By {book.authorId ? (
            <Link to={`/author/${book.authorId}`} className="hover:text-brand hover:underline">{book.author}</Link>
          ) : book.author}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{book.category}</span>
          <div className="flex items-center gap-1 opacity-60">
            <Star size={10} className="fill-brand text-brand" />
            <span className="text-[10px] font-bold text-slate-600">4.8</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
