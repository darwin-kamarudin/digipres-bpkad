import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, FileText, CalendarRange } from 'lucide-react';

const TABS = [
  { path: '/laporan-bulanan', label: 'Rekap Bulanan', icon: CalendarDays },
  { path: '/laporan-bulanan/laporan', label: 'Laporan Harian', icon: FileText },
  { path: '/laporan-bulanan/tahunan', label: 'Rekap Tahunan', icon: CalendarRange },
];

// Bottom tab bar ala aplikasi native, khusus untuk 3 halaman cetak pegawai
// (Rekapan Bulanan / Laporan / Rekapan Tahunan). Dipasang mengambang di
// setiap halaman cetak itu sendiri (bukan di shell global) karena hanya
// bagian "Cetak" panel pegawai yang butuh navigasi tab seperti ini.
export default function UserCetakBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-red-700 border-t border-red-800 safe-bottom print:hidden">
      <div className="grid grid-cols-3 h-16">
        {TABS.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 active:bg-red-800 transition-colors ${active ? 'text-white' : 'text-red-200'}`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
