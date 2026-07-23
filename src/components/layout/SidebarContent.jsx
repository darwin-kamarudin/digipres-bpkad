import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // IMPORT HOOKS ROUTER
import {
  LayoutDashboard, Users, FileText, Settings, LogOut, CheckSquare,
  FileCheck, ClipboardList, Printer, CalendarRange, ChevronDown,
  BarChart3, Sliders, PanelLeftClose, X, MapPinCheck
} from 'lucide-react';

export default function SidebarContent({ 
  user, 
  onLogout, 
  settings, 
  pendingCount,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  setIsMobileMenuOpen
}) {
  const navigate = useNavigate(); // Hook untuk pindah halaman
  const location = useLocation(); // Hook untuk tahu URL saat ini
  
  const isManagement = ['admin', 'operator', 'pengelola'].includes(user.role);
  
  // State dropdown grup
  const [openGroups, setOpenGroups] = useState({
    laporan: true,
    pengaturan: false,
    userRekapan: true
  });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Helper untuk mengecek apakah menu sedang aktif berdasarkan URL
  const isActive = (path) => location.pathname === path;

  /**
   * Komponen NavItem: Menerima 'path' (URL) bukan ID lagi
   */
  const NavItem = ({ path, icon: Icon, label, badge, isSubItem = false }) => (
    <button 
      onClick={() => {
        navigate(path); // Pindah URL
        if (window.innerWidth < 768) setIsMobileMenuOpen(false);
      }} 
      className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 justify-between group/item ${
        isActive(path)
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' 
          : 'hover:bg-slate-800 text-slate-400 hover:text-white'
      } text-sm`}
    >
      <div className="flex items-center min-w-0">
        <Icon size={20} className={`mr-3 flex-shrink-0 transition-colors ${isActive(path) ? 'text-white' : 'group-hover/item:text-blue-400'}`} /> 
        <span className="font-semibold break-words text-left">{label}</span>
      </div>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse ring-2 ring-slate-900 ml-2 flex-shrink-0">
          {badge}
        </span>
      )}
    </button>
  );

  const GroupHeader = ({ id, label, icon: Icon }) => {
    const isOpen = openGroups[id];
    return (
      <button 
        onClick={() => toggleGroup(id)}
        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 mb-1 group ${
          isOpen ? 'bg-slate-800/30 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        <div className="flex items-center text-sm min-w-0">
          <Icon size={20} className={`mr-3 flex-shrink-0 transition-colors ${isOpen ? 'text-blue-400' : 'group-hover:text-blue-400'}`} />
          <span className="font-bold tracking-wide break-words text-left">{label}</span>
        </div>
        <div className={`transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
           <ChevronDown size={18} className="opacity-50 group-hover:opacity-100" />
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none overflow-hidden border-r border-slate-800 relative">
       
       {/* HEADER: Profil & Kontrol Sidebar */}
       <div className="p-6 bg-slate-950/50 border-b border-slate-800 relative group/header">
          <div className="flex items-center gap-4 mb-4">
             <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-xl shadow-xl border border-blue-400/20 text-white transform transition-transform hover:scale-105">
                   {user.nama.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
             </div>
             
             <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-100 leading-tight break-words whitespace-normal">
                   {user.nama}
                </p>
                <p className="text-[11px] text-blue-400 font-medium tracking-wide mt-1 truncate uppercase">
                   {user.role === 'user' ? `NIP. ${user.nip || '-'}` : user.role}
                </p>
             </div>
          </div>
       </div>

       {/* BODY: Navigasi Utama */}
       <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-sidebar-scroll scroll-smooth">
          
          <NavItem path="/" icon={LayoutDashboard} label="Dashboard" />

          {isManagement ? (
             <div className="pt-2 space-y-4">
               
               {/* MENU TUNGGAL */}
               <div className="animate-in fade-in slide-in-from-left-2 duration-300 space-y-2">
                  <NavItem path="/verifikasi-absensi" icon={FileCheck} label="Verifikasi Absensi" badge={pendingCount} />
                  <NavItem path="/input-absensi" icon={CheckSquare} label="Input Absensi" />
               </div>

               {/* GRUP REKAPAN ABSENSI */}
               <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                 <GroupHeader id="laporan" label="Rekapan Absensi" icon={BarChart3} />
                 {openGroups.laporan && (
                   <div className="space-y-1 mt-1 ml-4 border-l-2 border-slate-800 pl-2 animate-in slide-in-from-top-2 duration-300">
                      <NavItem path="/laporan-harian" icon={FileText} label="Laporan Harian" isSubItem />
                      <NavItem path="/laporan-bulanan" icon={ClipboardList} label="Rekapan Bulanan" isSubItem />
                      <NavItem path="/rekapan-tahunan" icon={CalendarRange} label="Rekapan Tahunan" isSubItem />
                   </div>
                 )}
               </div>

               {/* MENU MANDIRI */}
               <div className="animate-in fade-in slide-in-from-left-2 duration-700">
                  <NavItem path="/cetak-manual" icon={Printer} label="Cetak Absensi Manual" />
               </div>

               {/* GRUP PENGATURAN */}
               <div className="animate-in fade-in slide-in-from-left-2 duration-700">
                 <GroupHeader id="pengaturan" label="Pengaturan" icon={Sliders} />
                 {openGroups.pengaturan && (
                   <div className="space-y-1 mt-1 ml-4 border-l-2 border-slate-800 pl-2 animate-in slide-in-from-top-2 duration-300">
                      <NavItem path="/data-pegawai" icon={Users} label="Data Pegawai" isSubItem />
                      <NavItem path="/settings" icon={Settings} label="Konfigurasi" isSubItem />
                   </div>
                 )}
               </div>
             </div>
          ) : (
             /* TAMPILAN USER BIASA */
             <div className="pt-2 space-y-1 animate-in fade-in duration-500">
                <NavItem path="/absensi-mandiri" icon={CheckSquare} label="Absensi Mandiri" />
                <NavItem path="/riwayat-absensi" icon={FileCheck} label="Riwayat Absensi" />
                <NavItem path="/status-lokasi" icon={MapPinCheck} label="Status Lokasi" />
                <NavItem path="/laporan-bulanan" icon={ClipboardList} label="Rekapan Bulanan" />
                <NavItem path="/pengaturan" icon={Settings} label="Pengaturan" />
             </div>
          )}
       </nav>

       {/* FOOTER */}
       <div className="p-4 bg-slate-950/80 border-t border-slate-800">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-center p-3 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white font-bold transition-all duration-300 group/logout shadow-sm mb-2"
          >
             <LogOut size={18} className="mr-2 group-hover/logout:-translate-x-1 transition-transform" /> 
             <span className="text-sm">Keluar</span>
          </button>
          
          <div className="flex justify-center items-center gap-2 opacity-20 hover:opacity-50 transition-opacity">
             <span className="w-1 h-1 rounded-full bg-slate-400"></span>
             <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 italic">v2.0 Router</p>
             <span className="w-1 h-1 rounded-full bg-slate-400"></span>
          </div>
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