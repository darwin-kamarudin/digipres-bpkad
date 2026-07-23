import React from 'react';
import { List } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getHeaderTitle } from '../../utils/helpers';

export default function AppHeader({
  appUser,
  isManagement,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
}) {
  const location = useLocation();
  const title = getHeaderTitle(location.pathname);

  return (
    <header className={`bg-white shadow-sm h-16 items-center justify-between px-4 md:px-6 flex-shrink-0 print:hidden z-10 sticky top-0 ${!isManagement ? 'hidden' : 'flex'}`}>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <List size={24}/>
            </button>
            <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="hidden md:block p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <List size={24}/>
            </button>
            <h2 className="font-bold text-lg text-slate-800 line-clamp-1 md:block hidden">{title}</h2>
            <h2 className="font-bold text-md text-slate-800 md:hidden">{title}</h2>
        </div>

        {/* INFO USER */}
        <div className="flex items-center gap-3">
            <div className="text-right">
                <p className="text-sm font-bold text-slate-700 leading-tight">{appUser.nama}</p>
                <p className="text-[10px] md:text-xs text-slate-500 uppercase">{appUser.role === 'user' ? `NIP. ${appUser.nip || '-'}` : appUser.role}</p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm border border-blue-200 flex-shrink-0">
                {appUser.nama.charAt(0)}
            </div>
        </div>
    </header>
  );
}
