import React, { useState } from 'react';
import { HashRouter, useLocation } from 'react-router-dom';

// --- CUSTOM HOOK (LOGIC) ---
import { useAppData } from './hooks/useAppData';

// --- COMPONENTS ---
import LoginPage from './components/auth/LoginPage';
import LoadingScreen from './components/layout/LoadingScreen';
import AppSidebar from './components/layout/AppSidebar';
import AppHeader from './components/layout/AppHeader';
import AppRoutes from './components/layout/AppRoutes';
import PrintStyles from './components/layout/PrintStyles';

const MANAGEMENT_ROLES = ['admin', 'operator', 'pengelola'];
const LANDSCAPE_PRINT_PATHS = ['/cetak-manual', '/rekapan-tahunan'];

// === KOMPONEN UTAMA (YANG DIBUNGKUS ROUTER) ===
function MainContent() {
  const {
    appUser, employees, attendance, pendingAbsensi, settings, holidays, loading,
    biometricLoginEnabled, handleAppLogin, handleAppLogout, handleBiometricLogin,
    setBiometricLoginEnabled, fetchAttendanceByRange
  } = useAppData();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const location = useLocation();

  const onLogout = () => {
      handleAppLogout();
      setIsMobileMenuOpen(false);
  };

  if (loading) return <LoadingScreen />;

  if (!appUser) return (
    <LoginPage
      onLogin={handleAppLogin}
      settings={settings}
      biometricLoginEnabled={biometricLoginEnabled}
      onBiometricLogin={handleBiometricLogin}
    />
  );

  const isManagement = MANAGEMENT_ROLES.includes(appUser.role);
  const pendingCount = pendingAbsensi ? pendingAbsensi.length : 0;
  const isLandscape = LANDSCAPE_PRINT_PATHS.includes(location.pathname);

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white print:block print:h-auto text-slate-800 overflow-hidden font-sans">

      <AppSidebar
        appUser={appUser}
        onLogout={onLogout}
        settings={settings}
        pendingCount={pendingCount}
        isManagement={isManagement}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
      />

      {/* --- MAIN CONTENT WRAPPER --- */}
      <main id="main-content" className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 w-full">

        <AppHeader
          appUser={appUser}
          isManagement={isManagement}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
        />

        {/* CONTENT AREA (ROUTER VIEW) */}
        {/* Staf (bukan manajemen) SELALU full-screen mobile, tanpa padding container di ukuran layar manapun */}
        <div className={`flex-1 overflow-y-auto ${!isManagement ? 'p-0' : 'p-4 md:p-8'} print:p-0 print:overflow-visible bg-gray-50`}>
            <PrintStyles isLandscape={isLandscape} />

            <AppRoutes
              isManagement={isManagement}
              appUser={appUser}
              employees={employees}
              attendance={attendance}
              pendingAbsensi={pendingAbsensi}
              settings={settings}
              holidays={holidays}
              fetchAttendanceByRange={fetchAttendanceByRange}
              onLogout={onLogout}
              biometricLoginEnabled={biometricLoginEnabled}
              onSetBiometricLoginEnabled={setBiometricLoginEnabled}
            />
        </div>
      </main>
    </div>
  );
}

// === EXPORT DEFAULT: WRAPPER UTAMA ===
export default function App() {
    return (
        <HashRouter>
            <MainContent />
        </HashRouter>
    );
}
