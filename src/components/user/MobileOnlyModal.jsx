import React from 'react';
import { Smartphone, Download, X, ArrowRight, Info } from 'lucide-react';

// Modal yang muncul saat pegawai mencoba mengakses absensi lewat browser padahal
// admin sudah mengaktifkan "Wajib Aplikasi Mobile" (settings.mobileOnlyAbsensi).
// Backdrop luar tetap `fixed inset-0` (supaya selalu menutupi apa pun yang sedang
// terlihat di layar, berapa pun posisi scroll halaman) — tapi konten "kartu"
// di dalamnya DIKUNCI ke lebar mobile (max-w-md, dipusatkan) persis seperti
// seluruh panel pegawai lainnya, jadi tidak melebar penuh saat dibuka di
// browser desktop. Memakai pola hero+lembar-putih yang sama dengan
// LoginPageMobile.jsx agar konsisten. Link download diisi admin secara dinamis
// lewat Pengaturan > Mode Aplikasi (settings.androidDownloadUrl) — saat ini
// hanya mendukung OS Android.
export default function MobileOnlyModal({ open, onClose, downloadUrl }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 flex justify-center font-sans print:hidden">
      <div className="w-full max-w-md bg-red-700 flex flex-col safe-top shadow-2xl">
        {/* HERO ATAS */}
        <div className="relative flex flex-col items-center text-white text-center pt-12 pb-10 px-6 flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-2 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-5">
            <Smartphone size={40} />
          </div>
          <h1 className="text-xl font-black leading-snug max-w-xs">Sekarang! Absensi Hanya Bisa Dilakukan Lewat Aplikasi Mobile</h1>
        </div>

        {/* LEMBAR BAWAH */}
        <div className="flex-1 bg-slate-50 rounded-t-[2rem] shadow-[0_-10px_30px_rgba(0,0,0,0.2)] px-6 pt-8 pb-8 safe-bottom flex flex-col overflow-y-auto">
          <p className="text-sm text-slate-600 text-center leading-relaxed mb-6">
            Silakan Unduh dan pasang aplikasi DigiPres (Digital Presensi) ke ponsel Anda untuk melanjutkan absensi mandiri.
          </p>

          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 bg-gradient-to-r from-red-700 to-amber-600 active:from-red-800 active:to-amber-700 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Download size={22} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-black leading-tight">Download Aplikasi</p>
                <p className="text-xs text-white/80 mt-0.5">Android &middot; File APK</p>
              </div>
              <ArrowRight size={20} className="flex-shrink-0" />
            </a>
          ) : (
            <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
              <Info size={18} className="flex-shrink-0 mt-0.5" />
              <p>Link download belum disediakan oleh admin. Hubungi admin instansi Anda.</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-200 active:bg-slate-300 text-slate-700 font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98]"
          >
            Tutup
          </button>

          <p className="text-center text-[11px] text-slate-400 mt-auto pt-6">Saat ini hanya mendukung OS Android.</p>
        </div>
      </div>
    </div>
  );
}
