import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// === KOMPONEN ADMIN (lazy-loaded — dipakai bareng exceljs/xlsx/tinymce/leaflet
// yang berat, supaya pegawai biasa TIDAK ikut mengunduh/mengeksekusi kode ini
// di awal aplikasi. Chunk terpisah ini baru diunduh saat admin membuka rutenya). ===
const AdminDashboard = lazy(() => import('../admin/AdminDashboard'));
const AdminManajemenAbsensi = lazy(() => import('../admin/AdminManajemenAbsensi'));
const AdminLaporanHarian = lazy(() => import('../admin/AdminLaporanHarian'));
const AdminRekapanBulanan = lazy(() => import('../admin/AdminRekapanBulanan'));
const AdminDataPegawai = lazy(() => import('../admin/AdminDataPegawai'));
const AdminSettings = lazy(() => import('../admin/AdminSettings'));
const AdminCetakAbsensiManual = lazy(() => import('../admin/AdminCetakAbsensiManual'));
const AdminRekapanTahunan = lazy(() => import('../admin/AdminRekapanTahunan'));

// === KOMPONEN ADMIN MOBILE-NATIVE (Capacitor), lazy-loaded juga ===
const AdminMobileDashboard = lazy(() => import('../admin-mobile/AdminMobileDashboard'));
const AdminMobileManajemenAbsensi = lazy(() => import('../admin-mobile/AdminMobileManajemenAbsensi'));
const AdminMobileLaporanHarian = lazy(() => import('../admin-mobile/AdminMobileLaporanHarian'));

// === KOMPONEN USER (tetap statis — ringan, dipakai mayoritas pengguna) ===
import UserHome from '../user/UserHome';
import UserAbsensi from '../user/UserAbsensi';
import UserRiwayat from '../user/UserRiwayat';
import UserRekapan from '../user/UserRekapan';
import UserPengaturan from '../user/UserPengaturan';
import UserStatusLokasi from '../user/UserStatusLokasi';
import UserStatistikAbsensi from '../user/UserStatistikAbsensi';
import UserCetakLaporanHarian from '../user/UserCetakLaporanHarian';
import UserRekapanTahunan from '../user/UserRekapanTahunan';

// Fallback ringan saat chunk rute lazy (admin) sedang diunduh — hanya kelihatan
// sekilas di navigasi PERTAMA ke tiap halaman admin (chunk lalu di-cache browser).
const RouteFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="animate-spin text-red-700" size={32} />
  </div>
);

export default function AppRoutes({
  isManagement, mobileNativeAdmin, appUser, employees, attendance, statusLocks, settings, holidays,
  fetchAttendanceByRange, onLogout, biometricLoginEnabled, onSetBiometricLoginEnabled,
}) {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
        {isManagement ? (
            <>
                <Route path="/" element={mobileNativeAdmin
                    ? <AdminMobileDashboard employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />
                    : <AdminDashboard employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />
                } />
                <Route path="/manajemen-absensi" element={mobileNativeAdmin
                    ? <AdminMobileManajemenAbsensi employees={employees} statusLocks={statusLocks} attendance={attendance} />
                    : <AdminManajemenAbsensi employees={employees} statusLocks={statusLocks} attendance={attendance} />
                } />
                <Route path="/laporan-harian" element={mobileNativeAdmin
                    ? <AdminMobileLaporanHarian employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />
                    : <AdminLaporanHarian employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />
                } />
                <Route path="/laporan-bulanan" element={<AdminRekapanBulanan employees={employees} attendance={attendance} settings={settings} user={appUser} holidays={holidays} fetchAttendanceByRange={fetchAttendanceByRange} />} />
                <Route path="/rekapan-tahunan" element={<AdminRekapanTahunan employees={employees} attendance={attendance} settings={settings} holidays={holidays} fetchAttendanceByRange={fetchAttendanceByRange} />} />
                <Route path="/cetak-manual" element={<AdminCetakAbsensiManual employees={employees} settings={settings} holidays={holidays} />} />
                <Route path="/data-pegawai" element={<AdminDataPegawai employees={employees} currentUser={appUser} />} />
                <Route path="/settings" element={<AdminSettings settings={settings} holidays={holidays} employees={employees} user={appUser} />} />
            </>
        ) : (
            /* --- HALAMAN USER BIASA --- */
            <>
                <Route path="/" element={<UserHome user={appUser} attendance={attendance} settings={settings} />} />
                <Route path="/input-absensi" element={<Navigate to="/absensi-mandiri" />} />
                <Route path="/absensi-mandiri" element={<UserAbsensi user={appUser} attendance={attendance} holidays={holidays} settings={settings} />} />
                <Route path="/riwayat-absensi" element={<UserRiwayat user={appUser} attendance={attendance} settings={settings} holidays={holidays} />} />
                <Route path="/status-lokasi" element={<UserStatusLokasi settings={settings} />} />
                <Route path="/statistik-absensi" element={<UserStatistikAbsensi employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} fetchAttendanceByRange={fetchAttendanceByRange} />} />
                <Route path="/laporan-bulanan" element={<UserRekapan user={appUser} attendance={attendance} statusLocks={statusLocks} settings={settings} employees={employees} holidays={holidays} />} />
                <Route path="/laporan-bulanan/laporan" element={<UserCetakLaporanHarian employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />} />
                <Route path="/laporan-bulanan/tahunan" element={<UserRekapanTahunan user={appUser} employees={employees} settings={settings} holidays={holidays} fetchAttendanceByRange={fetchAttendanceByRange} />} />
                <Route path="/pengaturan" element={<UserPengaturan user={appUser} settings={settings} onLogout={onLogout} biometricLoginEnabled={biometricLoginEnabled} onSetBiometricLoginEnabled={onSetBiometricLoginEnabled} />} />
            </>
        )}

        {/* Fallback jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </Suspense>
  );
}
