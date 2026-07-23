import React, { useState, useEffect } from 'react';
import { Loader2, Quote } from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../../utils/helpers';

// Daftar Kata-Kata Bijak / Filosofi
const QUOTES = [
  "Bekerjalah dengan hati, maka hasil akan mengikuti.",
  "Integritas adalah melakukan hal yang benar, walau tidak ada yang melihat.",
  "Disiplin adalah jembatan antara tujuan dan pencapaian.",
  "Pelayanan prima dimulai dari senyuman dan ketulusan.",
  "Waktu adalah aset berharga, gunakan untuk pengabdian terbaik.",
  "Kerja keras tidak akan mengkhianati hasil.",
  "Jujur, Disiplin, dan Bertanggung Jawab adalah kunci kesuksesan.",
];

// Login versi WEB (browser desktop/mobile web) — kartu terpusat, klasik.
// Sengaja dibuat terpisah dari LoginPageMobile.jsx (app native Capacitor) karena
// konteks penggunaannya berbeda: browser tidak perlu gaya bottom-sheet/native.
export default function LoginPageWeb({ onLogin, settings }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const displayLogo = settings.logoUrl || DEFAULT_LOGO_URL;

  // Efek untuk mengganti quote setiap 2.5 detik saat loading
  useEffect(() => {
    let interval;
    if (isLoading) {
      setQuoteIndex(0);
      interval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!u || !p) return alert("Mohon isi username dan password");

    setIsLoading(true);

    // Simulasi delay 3 detik agar user sempat membaca quote/nasehat
    setTimeout(() => {
        const success = onLogin(u, p);
        if (!success) {
            setIsLoading(false);
        }
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4 font-sans" style={{
      backgroundImage: `url('https://www.transparenttextures.com/patterns/cubes.png')`
    }}>
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-red-700 min-h-[400px] flex flex-col justify-center relative transition-all duration-500">

        {/* HEADER LOGO (Selalu Tampil) */}
        <div className={`text-center transition-all duration-500 ${isLoading ? 'mb-4 scale-90 opacity-80' : 'mb-8'}`}>
           <div className="h-24 w-full flex items-center justify-center mb-4">
              <img src={displayLogo} alt="Logo" className="max-h-full object-contain drop-shadow-md"/>
           </div>
           <h1 className="text-xl font-black uppercase tracking-wider">
             <span className="text-red-700">Digi</span><span className="text-amber-500">Pres</span>
           </h1>
           <p className="text-sm font-semibold text-slate-600 uppercase">{settings.opdName}</p>
        </div>

        {/* KONTEN BERUBAH: FORM vs LOADING QUOTE */}
        {isLoading ? (
            // --- TAMPILAN SAAT LOADING ---
            <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 text-center py-4">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                    <Loader2 size={48} className="text-red-700 animate-spin relative z-10" />
                </div>

                <h3 className="text-lg font-bold text-slate-700 mb-2">Memproses Masuk...</h3>

                <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded max-w-xs mx-auto mt-4 shadow-sm transition-all duration-500">
                    <Quote size={20} className="text-red-300 mb-2 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                        "{QUOTES[quoteIndex]}"
                    </p>
                </div>
            </div>
        ) : (
            // --- TAMPILAN FORM LOGIN (ASLI) ---
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                <input
                    className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-red-600 outline-none transition-all hover:border-red-400"
                    value={u} onChange={e=>setU(e.target.value)} placeholder="Masukkan Username..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <input
                    type="password" className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-red-600 outline-none transition-all hover:border-red-400"
                    value={p} onChange={e=>setP(e.target.value)} placeholder="Masukkan Password..."
                />
              </div>
              <button className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded shadow-lg transition-transform transform hover:scale-105 active:scale-95 flex justify-center items-center gap-2 group">
                LOGIN APLIKASI
              </button>
            </form>
        )}

        {/* FOOTER (Selalu Tampil) */}
        {!isLoading && (
            <div className="mt-6 text-center text-xs text-gray-400">
               © {new Date().getFullYear()} {settings.opdShort}
            </div>
        )}
      </div>
    </div>
  );
}
