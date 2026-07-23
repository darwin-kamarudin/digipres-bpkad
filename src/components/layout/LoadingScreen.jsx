import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const LOADING_QUOTES = [
  "Bekerjalah dengan hati, maka hasil akan mengikuti.",
  "Integritas adalah melakukan hal yang benar, walau tidak ada yang melihat.",
  "Disiplin adalah jembatan antara tujuan dan pencapaian.",
  "Pelayanan prima dimulai dari senyuman dan ketulusan.",
  "Waktu adalah aset berharga, gunakan untuk pengabdian terbaik.",
  "Kerja keras tidak akan mengkhianati hasil.",
  "Jujur, Disiplin, dan Bertanggung Jawab adalah kunci kesuksesan.",
  "Setiap langkah kecil membawa kita lebih dekat pada tujuan besar.",
  "Kesuksesan tidak datang dari apa yang kita lakukan sesekali, tapi apa yang kita lakukan secara konsisten.",
  "Mulai hari ini dengan semangat baru dan pikiran positif."
];

export default function LoadingScreen() {
  const [loadingQuote, setLoadingQuote] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_QUOTES.length);
    setLoadingQuote(LOADING_QUOTES[randomIndex]);
  }, []);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50 px-6 font-sans safe-top safe-bottom">
      <div className="text-center max-w-lg">
          <div className="relative mb-6 inline-block">
             <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
             <div className="relative bg-white p-4 rounded-full shadow-md">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
             </div>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2 leading-relaxed italic">"{loadingQuote}"</h3>
          <p className="text-xs text-slate-400 mt-4 uppercase tracking-widest font-semibold">Memuat Data Aplikasi...</p>
      </div>
    </div>
  );
}
