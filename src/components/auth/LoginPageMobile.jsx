import React, { useState, useEffect } from 'react';
import { Loader2, Quote, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../../utils/helpers';
import { isBiometricAvailable, authenticateWithBiometric } from '../../lib/biometric';

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

export default function LoginPageMobile({ onLogin, settings, biometricLoginEnabled, onBiometricLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const displayLogo = settings.logoUrl || DEFAULT_LOGO_URL;

  // Cek dukungan sidik jari/wajah perangkat HANYA jika user sudah pernah
  // login sebelumnya DAN mengaktifkan login sidik jari lewat menu Pengaturan.
  useEffect(() => {
    if (!biometricLoginEnabled) return;
    isBiometricAvailable().then(setBioAvailable);
  }, [biometricLoginEnabled]);

  const handleBiometricTap = async () => {
    setBioLoading(true);
    try {
      await authenticateWithBiometric('Masuk ke Aplikasi Absensi');
      const success = await onBiometricLogin();
      if (!success) {
        alert('Sesi login tersimpan sudah tidak valid. Silakan login manual dengan username & password.');
      }
    } catch (err) {
      // Dibatalkan user (userCancel/appCancel) -> tidak perlu tampilkan alert error
      if (err?.code && err.code !== 'userCancel' && err.code !== 'appCancel') {
        alert('Verifikasi sidik jari gagal. Silakan coba lagi atau login manual.');
      }
    } finally {
      setBioLoading(false);
    }
  };

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
    <div className="min-h-screen bg-red-700 flex flex-col font-sans safe-top">

      {/* HERO ATAS (BRANDING) */}
      <div className={`flex flex-col items-center text-white transition-all duration-500 ${isLoading ? 'justify-center flex-1 pb-6' : 'pt-10 pb-14 px-6'}`}>
        <div className="h-20 w-20 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2 mb-4">
          <img src={displayLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          <span className="text-white">Digi</span><span className="text-amber-300">Pres</span>
        </h1>
        <p className="text-xs font-bold text-red-100 uppercase tracking-wide mt-1 text-center px-4">{settings.opdName}</p>
      </div>

      {/* LEMBAR BAWAH (FORM / LOADING) */}
      <div className="flex-1 bg-slate-50 rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.2)] px-6 pt-8 pb-8 safe-bottom flex flex-col">
        {isLoading ? (
            // --- TAMPILAN SAAT LOADING ---
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 text-center py-4">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                    <Loader2 size={48} className="text-red-700 animate-spin relative z-10" />
                </div>

                <h3 className="text-lg font-bold text-slate-700 mb-2">Memproses Masuk...</h3>

                <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl max-w-xs mx-auto mt-4 shadow-sm transition-all duration-500">
                    <Quote size={20} className="text-red-300 mb-2 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                        "{QUOTES[quoteIndex]}"
                    </p>
                </div>
            </div>
        ) : (
            // --- TAMPILAN FORM LOGIN ---
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-black text-slate-800 mb-1">Masuk ke Akun</h2>
              <p className="text-xs text-slate-500 mb-4">Gunakan username &amp; password yang terdaftar.</p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                <input
                    className="w-full p-3.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                    value={u} onChange={e=>setU(e.target.value)} placeholder="Masukkan Username..."
                    autoCapitalize="none" autoCorrect="off"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full p-3.5 pr-11 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                      value={p} onChange={e=>setP(e.target.value)} placeholder="Masukkan Password..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 active:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button className="w-full bg-red-700 active:bg-red-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2">
                MASUK APLIKASI
              </button>

              {bioAvailable && (
                <>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase pt-1">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    atau
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBiometricTap}
                    disabled={bioLoading}
                    className="w-full border-2 border-red-700 text-red-700 font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 active:scale-95 active:bg-red-50 transition-all disabled:opacity-50"
                  >
                    {bioLoading ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={20} />}
                    LOGIN SIDIK JARI
                  </button>
                </>
              )}
            </form>
        )}

        {/* FOOTER (Selalu Tampil) */}
        {!isLoading && (
            <div className="mt-6 text-center text-xs text-slate-400">
               © {new Date().getFullYear()} {settings.opdShort}
            </div>
        )}
      </div>
    </div>
  );
}
