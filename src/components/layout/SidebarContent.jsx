import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut, CheckSquare,
  ClipboardList, Printer, CalendarRange, BarChart3, Sliders
} from 'lucide-react';

// Struktur menu panel admin (grup + item), didefinisikan di luar komponen agar stabil.
const MENU_STRUCTURE = [
  {
    group: 'Absensi',
    icon: CheckSquare,
    color: 'text-red-400',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/manajemen-absensi', label: 'Manajemen Absensi', icon: CheckSquare },
    ],
  },
  {
    group: 'Rekapan Absensi',
    icon: BarChart3,
    color: 'text-amber-400',
    items: [
      { path: '/laporan-harian', label: 'Laporan Harian', icon: FileText },
      { path: '/laporan-bulanan', label: 'Rekapan Bulanan', icon: ClipboardList },
      { path: '/rekapan-tahunan', label: 'Rekapan Tahunan', icon: CalendarRange },
    ],
  },
  {
    group: 'Cetak',
    icon: Printer,
    color: 'text-slate-400',
    items: [
      { path: '/cetak-manual', label: 'Cetak Absensi Manual', icon: Printer },
    ],
  },
  {
    group: 'Pengaturan Sistem',
    icon: Sliders,
    color: 'text-slate-400',
    items: [
      { path: '/data-pegawai', label: 'Data Pegawai', icon: Users },
      { path: '/settings', label: 'Konfigurasi', icon: Settings },
    ],
  },
];

export default function SidebarContent({ user, onLogout, setIsMobileMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const goTo = (path) => {
    navigate(path);
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none overflow-hidden border-r border-slate-800">

      {/* HEADER: Identitas Pengguna */}
      <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center font-black text-white text-lg shadow-lg shrink-0">
          {user.nama.charAt(0)}
        </div>
        <div className="min-w-0">
          <h2 className="font-black text-white text-sm leading-tight truncate">{user.nama}</h2>
          <p className="text-[10px] text-amber-400 mt-0.5 font-bold uppercase tracking-wider truncate">
            {user.role === 'user' ? `NIP. ${user.nip || '-'}` : user.role}
          </p>
        </div>
      </div>

      {/* NAVIGASI TERKELOMPOK */}
      <nav className="flex-1 px-3 overflow-y-auto custom-sidebar-scroll pt-6 pb-6 space-y-4">
        {MENU_STRUCTURE.map((group) => (
          <div key={group.group} className="space-y-1">
            <span className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <group.icon className={`w-3.5 h-3.5 ${group.color}`} />
              {group.group}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => goTo(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-lg transition-all
                    ${isActive(item.path)
                      ? 'bg-red-700 text-white shadow-md shadow-red-700/20'
                      : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="truncate text-left">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER: Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold rounded-xl transition-all border border-red-500/10"
        >
          <LogOut size={16} /> Keluar Aplikasi
        </button>
      </div>

      <style>{`
        .custom-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .custom-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
