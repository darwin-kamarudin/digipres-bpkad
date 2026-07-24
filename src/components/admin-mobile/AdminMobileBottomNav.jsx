import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lock, FileText, LogOut } from 'lucide-react';

const TABS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/manajemen-absensi', label: 'Kunci Status', icon: Lock },
  { path: '/laporan-harian', label: 'Laporan', icon: FileText },
];

// Bottom tab bar ala aplikasi native untuk shell admin mobile. Untuk tahap
// ini SENGAJA hanya menu utama (Dashboard, Manajemen Absensi, Laporan Harian)
// + Keluar yang dimunculkan, sisanya menyusul bertahap.
export default function AdminMobileBottomNav({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom print:hidden">
      <div className="grid grid-cols-4 h-16">
        {TABS.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 active:bg-slate-50 transition-colors ${active ? 'text-red-700' : 'text-slate-400'}`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center gap-1 active:bg-red-50 transition-colors text-red-600"
        >
          <LogOut size={22} />
          <span className="text-[10px] font-bold">Keluar</span>
        </button>
      </div>
    </nav>
  );
}
