import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// === KOMPONEN ADMIN ===
import AdminDashboard from '../admin/AdminDashboard';
import AdminInputAbsensi from '../admin/AdminInputAbsensi';
import AdminLaporanHarian from '../admin/AdminLaporanHarian';
import AdminRekapanBulanan from '../admin/AdminRekapanBulanan';
import AdminTerimaAbsensi from '../admin/AdminTerimaAbsensi';
import AdminDataPegawai from '../admin/AdminDataPegawai';
import AdminSettings from '../admin/AdminSettings';
import AdminCetakAbsensiManual from '../admin/AdminCetakAbsensiManual';
import AdminRekapanTahunan from '../admin/AdminRekapanTahunan';

// === KOMPONEN USER ===
import UserHome from '../user/UserHome';
import UserAbsensi from '../user/UserAbsensi';
import UserRiwayat from '../user/UserRiwayat';
import UserRekapan from '../user/UserRekapan';
import UserPengaturan from '../user/UserPengaturan';
import UserStatusLokasi from '../user/UserStatusLokasi';

export default function AppRoutes({
  isManagement, appUser, employees, attendance, pendingAbsensi, settings, holidays,
  fetchAttendanceByRange, onLogout, biometricLoginEnabled, onSetBiometricLoginEnabled,
}) {
  return (
    <Routes>
        {isManagement ? (
            <>
                <Route path="/" element={<AdminDashboard employees={employees} attendance={attendance} settings={settings} />} />
                <Route path="/verifikasi-absensi" element={<AdminTerimaAbsensi employees={employees} pendingAbsensi={pendingAbsensi} />} />
                <Route path="/input-absensi" element={<AdminInputAbsensi employees={employees} attendance={attendance} />} />
                <Route path="/laporan-harian" element={<AdminLaporanHarian employees={employees} attendance={attendance} settings={settings} holidays={holidays} />} />
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
                <Route path="/laporan-bulanan" element={<UserRekapan user={appUser} attendance={attendance} settings={settings} employees={employees} />} />
                <Route path="/pengaturan" element={<UserPengaturan user={appUser} onLogout={onLogout} biometricLoginEnabled={biometricLoginEnabled} onSetBiometricLoginEnabled={onSetBiometricLoginEnabled} />} />
            </>
        )}

        {/* Fallback jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
