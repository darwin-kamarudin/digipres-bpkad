import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function MobileHeader({ title, onBack, right, className = '' }) {
  const navigate = useNavigate();

  return (
    <div className={`sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 safe-top print:hidden ${className}`}>
      <div className="flex items-center h-14 px-1">
        <button
          onClick={onBack || (() => navigate(-1))}
          aria-label="Kembali"
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={26} className="text-slate-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-slate-800 text-base truncate px-1">{title}</h1>
        <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">{right}</div>
      </div>
    </div>
  );
}
