import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { isNativePlatform } from '../../lib/geolocation';

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

// Layar ini dipakai baik di web maupun aplikasi native (Capacitor). Di aplikasi
// native ia berfungsi sebagai splashscreen lanjutan (setelah splash OS native
// hilang, sebelum data aplikasi siap) — footer "Powered by" HANYA ditampilkan
// saat isNativePlatform() true, tidak pernah muncul di versi web.
export default function LoadingScreen() {
  const [loadingQuote, setLoadingQuote] = useState("");
  const isNative = isNativePlatform();

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_QUOTES.length);
    setLoadingQuote(LOADING_QUOTES[randomIndex]);
  }, []);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50 px-6 font-sans safe-top safe-bottom">
      <div className="text-center max-w-lg flex-1 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tracking-tight mb-6">
            <span className="text-red-700">Digi</span><span className="text-amber-500">Pres</span>
          </span>

          <div className="relative mb-6 inline-block">
             <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
             <div className="relative bg-white p-4 rounded-full shadow-md">
                <Loader2 className="w-10 h-10 text-red-700 animate-spin" />
             </div>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-700 mb-2 leading-relaxed italic">"{loadingQuote}"</h3>
          <p className="text-xs text-slate-400 mt-4 uppercase tracking-widest font-semibold">Memuat Data Aplikasi...</p>
      </div>

      {isNative && (
        <p className="pb-6 text-[11px] text-slate-400 font-medium tracking-wide">
          Powered by <span className="font-bold text-slate-500">Darwin Kamarudin</span>
        </p>
      )}
    </div>
  );
}
