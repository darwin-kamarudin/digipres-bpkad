import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// === KOMPONEN ADMIN ===
import AdminDashboard from '../admin/AdminDashboard';
import AdminManajemenAbsensi from '../admin/AdminManajemenAbsensi';
import AdminLaporanHarian from '../admin/AdminLaporanHarian';
import AdminRekapanBulanan from '../admin/AdminRekapanBulanan';
import AdminDataPegawai from '../admin/AdminDataPegawai';
import AdminSettings from '../admin/AdminSettings';
import AdminCetakAbsensiManual from '../admin/AdminCetakAbsensiManual';
import AdminRekapanTahunan from '../admin/AdminRekapanTahunan';

// === KOMPONEN ADMIN MOBILE-NATIVE (Capacitor) ===
import AdminMobileDashboard from '../admin-mobile/AdminMobileDashboard';
import AdminMobileManajemenAbsensi from '../admin-mobile/AdminMobileManajemenAbsensi';
import AdminMobileLaporanHarian from '../admin-mobile/AdminMobileLaporanHarian';

// === KOMPONEN USER ===
import UserHome from '../user/UserHome';
import UserAbsensi from '../user/UserAbsensi';
import UserRiwayat from '../user/UserRiwayat';
import UserRekapan from '../user/UserRekapan';
import UserPengaturan from '../user/UserPengaturan';
import UserStatusLokasi from '../user/UserStatusLokasi';

export default function AppRoutes({
  isManagement, mobileNativeAdmin, appUser, employees, attendance, statusLocks, settings, holidays,
  fetchAttendanceByRange, onLogout, biometricLoginEnabled, onSetBiometricLoginEnabled,
}) {
  return (
    <Routes>
        {isManagement ? (
            <>
                <Route path="/" element={mobileNativeAdmin
                    ? <AdminMobileDashboard employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} />
                    : <AdminDashboard employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} />
                } />
                <Route path="/manajemen-absensi" element={mobileNativeAdmin
                    ? <AdminMobileManajemenAbsensi employees={employees} statusLocks={statusLocks} />
                    : <AdminManajemenAbsensi employees={employees} statusLocks={statusLocks} />
                } />
                <Route path="/laporan-harian" element={mobileNativeAdmin
                    ? <AdminMobileLaporanHarian employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />
                    : <AdminLaporanHarian employees={employees} attendance={attendance} statusLocks={statusLocks} settings={settings} holidays={holidays} />
                } />
                <Route path="/laporan-bulanan" element={<AdminRekapanBulanan employees={employees} attendance={attendance} settings={settings} user={appUser} holidays={holidays} fetchAttendanceByRange={fetchAttendanceByRange} />} />
                <Route path="/rekapan-tahunan" element={<AdminRekapanTahunan employees={employees} attendance={attendance} settings={settings} fetchAttendanceByRange={fetchAttendanceByRange} />} />
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
                <Route path="/riwayat-absensi" element={<UserRiwayat user={appUser} attendance={attendance} />} />
                <Route path="/status-lokasi" element={<UserStatusLokasi settings={settings} />} />
                <Route path="/laporan-bulanan" element={<UserRekapan user={appUser} attendance={attendance} statusLocks={statusLocks} settings={settings} employees={employees} />} />
                <Route path="/pengaturan" element={<UserPengaturan user={appUser} onLogout={onLogout} biometricLoginEnabled={biometricLoginEnabled} onSetBiometricLoginEnabled={onSetBiometricLoginEnabled} />} />
            </>
        )}

        {/* Fallback jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
