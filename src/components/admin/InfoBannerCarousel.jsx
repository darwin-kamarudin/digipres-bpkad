import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Carousel generik untuk kartu pemberitahuan (info banner) yang bergeser
// otomatis bergantian, sekaligus bisa digeser manual (swipe di layar sentuh,
// atau tombol panah/dot di desktop). Dipakai supaya beberapa notifikasi tidak
// menumpuk memakan tempat, cukup satu slot yang berganti-ganti.
export default function InfoBannerCarousel({ items, intervalMs = 6000 }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const total = items.length;

  const goTo = (i) => setIndex(((i % total) + total) % total);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % total), intervalMs);
    return () => clearInterval(timer);
  }, [total, intervalMs, index]);

  if (total === 0) return null;

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next(); else prev();
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative mb-5 select-none">
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item, i) => (
            <div key={i} className="w-full flex-shrink-0">
              {item}
            </div>
          ))}
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Sebelumnya"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 border border-slate-200 shadow flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Berikutnya"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 border border-slate-200 shadow flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            <ChevronRight size={16} />
          </button>
          <div className="flex justify-center gap-1.5 mt-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-red-700' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
