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
import AdminMobileShell from './components/admin-mobile/AdminMobileShell';
import { isNativePlatform } from './lib/geolocation';
import useIsMobileViewport from './hooks/useIsMobileViewport';

const MANAGEMENT_ROLES = ['admin', 'operator', 'pengelola'];
const LANDSCAPE_PRINT_PATHS = ['/cetak-manual', '/rekapan-tahunan'];

// === KOMPONEN UTAMA (YANG DIBUNGKUS ROUTER) ===
function MainContent() {
  const {
    appUser, employees, attendance, statusLocks, settings, holidays, loading,
    biometricLoginEnabled, handleAppLogin, handleAppLogout, handleBiometricLogin,
    setBiometricLoginEnabled, fetchAttendanceByRange
  } = useAppData();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const isMobileViewport = useIsMobileViewport();

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
  const isLandscape = LANDSCAPE_PRINT_PATHS.includes(location.pathname);
  // Panel admin pakai shell mobile-native terpisah (AdminMobileShell) baik saat
  // dibuka via aplikasi native (Capacitor) MAUPUN via browser di lebar layar HP
  // (<768px) — jadi bisa langsung dipratinjau di browser tanpa build APK dulu.
  const isMobileNativeAdmin = isManagement && (isNativePlatform() || isMobileViewport);

  if (isMobileNativeAdmin) {
    return (
      <div className="app-shell h-screen bg-slate-100 flex flex-col print:bg-white print:block print:h-auto text-slate-800 overflow-hidden font-sans">
        <AdminMobileShell onLogout={onLogout}>
          <PrintStyles isLandscape={isLandscape} />
          <AppRoutes
            isManagement={isManagement}
            mobileNativeAdmin={true}
            appUser={appUser}
            employees={employees}
            attendance={attendance}
            statusLocks={statusLocks}
            settings={settings}
            holidays={holidays}
            fetchAttendanceByRange={fetchAttendanceByRange}
            onLogout={onLogout}
            biometricLoginEnabled={biometricLoginEnabled}
            onSetBiometricLoginEnabled={setBiometricLoginEnabled}
          />
        </AdminMobileShell>
      </div>
    );
  }

  return (
    <div className="app-shell h-screen bg-slate-100 flex flex-col md:flex-row print:bg-white print:block print:h-auto text-slate-800 overflow-hidden font-sans">

      <AppSidebar
        appUser={appUser}
        onLogout={onLogout}
        isManagement={isManagement}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
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
        <div className={`app-content flex-1 overflow-y-auto ${!isManagement ? 'p-0 bg-gray-50' : 'p-6 md:p-8 bg-slate-100'} print:p-0 print:overflow-visible`}>
            <PrintStyles isLandscape={isLandscape} />

            <AppRoutes
              isManagement={isManagement}
              mobileNativeAdmin={false}
              appUser={appUser}
              employees={employees}
              attendance={attendance}
              statusLocks={statusLocks}
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
