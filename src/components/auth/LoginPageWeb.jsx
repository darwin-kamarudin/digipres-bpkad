import React, { useState, useEffect } from 'react';
import { Loader2, Quote, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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

// Login versi WEB (browser desktop/mobile web) — layout split-screen mengikuti
// referensi UI/UX Dash BPKAD (src/pages/public/Login.jsx), direkolorasi ke tema
// merah/amber yang sama dengan panel absensi pegawai versi mobile. Sengaja dibuat
// terpisah dari LoginPageMobile.jsx (app native Capacitor) karena konteks
// penggunaannya berbeda: browser tidak perlu gaya bottom-sheet/native.
export default function LoginPageWeb({ onLogin, settings }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-red-700 selection:text-white">

      {/* SISI KIRI: Area Form dengan Corak Garis Kotak-Kotak */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white border-r border-slate-200 relative z-10 shadow-xl overflow-hidden">

        {/* Pola Kisi-Kisi Geometris di Latar Belakang Form */}
        <div className="absolute inset-0 opacity-[0.45] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:30px_30px] z-0"></div>

        {/* Soft Radial Gradient agar area tengah form tetap bersih dan fokus */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#ffffff_95%)] z-0"></div>

        <div className="mx-auto w-full max-w-sm space-y-8 relative z-10">

          {/* Identitas Instansi */}
          <div className="flex flex-col items-center text-center space-y-4">
            <img
              src={displayLogo}
              alt="Logo Instansi"
              className="h-20 w-auto object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]"
            />
            <div className="space-y-1.5">
              <h1 className="text-xl font-black tracking-tight uppercase sm:text-2xl">
                <span className="text-red-700">Digi</span><span className="text-amber-500">Pres</span>
              </h1>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                {settings.opdName || 'Sistem Absensi Digital'}
              </p>
            </div>
          </div>

          {isLoading ? (
            // --- TAMPILAN SAAT LOADING ---
            <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 text-center py-4">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                    <Loader2 size={40} className="text-red-700 animate-spin relative z-10" />
                </div>

                <h3 className="text-base font-bold text-slate-700 mb-2">Memproses Masuk...</h3>

                <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl max-w-xs mx-auto mt-2 shadow-sm">
                    <Quote size={18} className="text-red-300 mb-2 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                        "{QUOTES[quoteIndex]}"
                    </p>
                </div>
            </div>
          ) : (
            // --- FORM LOGIN ---
            <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-700 transition-colors duration-200">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={u}
                    onChange={(e) => setU(e.target.value)}
                    placeholder="Masukkan username..."
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-red-700 focus:ring-4 focus:ring-red-700/10 transition-all duration-300 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-700 transition-colors duration-200">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-12 py-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-red-700 focus:ring-4 focus:ring-red-700/10 transition-all duration-300 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md shadow-red-700/10 hover:shadow-xl hover:shadow-red-700/20 active:scale-[0.98] transition-all duration-300 cursor-pointer mt-2"
              >
                <span>Masuk Ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {!isLoading && (
            <div className="text-center pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              © {new Date().getFullYear()} {settings.opdShort}
            </div>
          )}
        </div>
      </div>

      {/* SISI KANAN: Hero Panel */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden items-center p-20 bg-gradient-to-br from-slate-950 via-red-950 to-red-900">

        {/* Aksen pola titik halus */}
        <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(#f59e0b_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-slate-950/40 to-transparent z-0"></div>

        <div className="relative z-10 w-full max-w-lg text-white mt-auto">
          <div className="w-12 h-1 bg-gradient-to-r from-red-600 to-amber-500 mb-6 rounded-full"></div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.15] mb-6 drop-shadow-md text-white">
            Kelola Kehadiran Pegawai Secara Digital &amp; Transparan
          </h2>
          <p className="text-sm font-medium text-slate-200 leading-relaxed max-w-md drop-shadow-sm">
            Pantau absensi, verifikasi biometrik wajah, validasi lokasi kehadiran, dan kelola laporan kepegawaian dalam satu sistem terintegrasi.
          </p>
        </div>
      </div>

    </div>
  );
}
