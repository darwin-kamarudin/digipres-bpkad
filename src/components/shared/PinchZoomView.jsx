import React, { useRef, useState, useEffect, useCallback } from 'react';

// Pembungkus generik: menampilkan anak (dengan lebar tetap/natural, mis.
// dokumen cetak format A4) yang otomatis diskalakan kecil (autofit) supaya
// muat penuh di lebar layar HP, lalu bisa diperbesar dengan pinch dua jari
// (dan digeser dengan drag satu jari saat sedang diperbesar) untuk membaca
// detail dokumen. Saat dicetak, transform dilepas (lihat kelas print:) agar
// hasil cetak tetap memakai ukuran asli, bukan versi skala-kecil ini.
// Dipakai bersama oleh panel admin mobile & panel pegawai (user).
export default function PinchZoomView({ children, contentWidth = 640 }) {
  const containerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [contentHeight, setContentHeight] = useState(0);
  const gestureRef = useRef({ mode: null, startDist: 0, startScale: 1, startTranslate: { x: 0, y: 0 }, startPoint: { x: 0, y: 0 } });

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const contentEl = el.querySelector('[data-pinch-content]');
    if (!contentEl) return;
    const containerWidth = el.clientWidth;
    const naturalWidth = contentEl.scrollWidth || contentWidth;
    const naturalHeight = contentEl.scrollHeight;
    const nextFit = containerWidth > 0 ? containerWidth / naturalWidth : 1;
    setFitScale(nextFit);
    setScale((prev) => (prev <= 1.001 ? nextFit : prev));
    setContentHeight(naturalHeight);
  }, [contentWidth]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const dist = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      gestureRef.current = { mode: 'pinch', startDist: dist(e.touches), startScale: scale, startTranslate: translate, startPoint: { x: 0, y: 0 } };
    } else if (e.touches.length === 1 && scale > fitScale + 0.001) {
      gestureRef.current = { mode: 'pan', startDist: 0, startScale: scale, startTranslate: translate, startPoint: { x: e.touches[0].clientX, y: e.touches[0].clientY } };
    } else {
      gestureRef.current.mode = null;
    }
  };

  const handleTouchMove = (e) => {
    const g = gestureRef.current;
    if (g.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const ratio = dist(e.touches) / (g.startDist || 1);
      setScale(Math.min(Math.max(g.startScale * ratio, fitScale), fitScale * 4));
    } else if (g.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - g.startPoint.x;
      const dy = e.touches[0].clientY - g.startPoint.y;
      setTranslate({ x: g.startTranslate.x + dx, y: g.startTranslate.y + dy });
    }
  };

  const handleTouchEnd = () => { gestureRef.current.mode = null; };

  const handleDoubleClick = () => {
    if (scale > fitScale * 1.05) {
      setScale(fitScale);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(fitScale * 2);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden print:!h-auto print:!overflow-visible"
      style={{ height: contentHeight ? contentHeight * scale : 'auto', touchAction: scale > fitScale + 0.001 ? 'none' : 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        data-pinch-content
        className="print:!w-full print:!transform-none"
        style={{ width: contentWidth, transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}
