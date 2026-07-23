import React from 'react';
import SidebarContent from './SidebarContent';

export default function AppSidebar({
  appUser, onLogout, settings, pendingCount, isManagement,
  isMobileMenuOpen, setIsMobileMenuOpen, isDesktopSidebarOpen, setIsDesktopSidebarOpen,
}) {
  return (
    <>
      {/* --- BACKDROP MOBILE --- */}
      {isMobileMenuOpen && (
        <div
            className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      {/* Staf (bukan manajemen) SELALU pakai UI mobile — sidebar admin disembunyikan total di semua ukuran layar */}
      <div id="sidebar-container" className={`
          fixed md:relative inset-y-0 left-0 z-[70]
          w-64 bg-slate-900 text-white shadow-xl transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDesktopSidebarOpen ? 'md:translate-x-0' : 'md:-translate-x-full md:w-0'}
          ${!isManagement ? 'hidden' : 'flex'} flex-col h-full print:hidden
      `}>
         <SidebarContent
            user={appUser}
            onLogout={onLogout}
            settings={settings}
            pendingCount={pendingCount}
            isDesktopSidebarOpen={isDesktopSidebarOpen}
            setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
         />
      </div>
    </>
  );
}
