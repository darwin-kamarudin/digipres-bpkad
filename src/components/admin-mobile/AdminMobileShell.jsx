import React from 'react';
import AdminMobileBottomNav from './AdminMobileBottomNav';

// Shell UI/UX khusus panel admin saat dibuka lewat aplikasi native (Capacitor)
// atau browser di lebar layar HP. Terpisah total dari AppSidebar/AppHeader
// (versi web) sesuai permintaan agar tampilan web tidak ikut berubah.
// Tanpa top header (dihilangkan sesuai permintaan) — hanya bottom nav dengan
// menu utama (Dashboard, Manajemen Absensi, Laporan Harian) + Keluar.
export default function AdminMobileShell({ onLogout, children }) {
  return (
    <div className="flex flex-col h-full w-full bg-slate-100">
      <div className="flex-1 overflow-y-auto safe-top pb-20 print:pb-0 print:overflow-visible">
        {children}
      </div>

      <AdminMobileBottomNav onLogout={onLogout} />
    </div>
  );
}
