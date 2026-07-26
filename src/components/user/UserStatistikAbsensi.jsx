import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayString } from '../../utils/helpers';
import MobileHeader from './MobileHeader';
import AttendanceStatsView from '../shared/AttendanceStatsView';
import UserAttendanceLeaderboard from './UserAttendanceLeaderboard';

// Tampilan statistik absensi (sama persis dengan kartu statistik di dashboard
// admin-mobile via AttendanceStatsView) tapi TANPA daftar "Belum Absen" &
// aksi kunci status — pegawai hanya bisa melihat, bukan mengubah data.
// Di bawahnya ditambahkan Papan Peringkat Kehadiran (UserAttendanceLeaderboard)
// yang KHUSUS tampil di panel pegawai ini saja (bukan di AttendanceStatsView
// bersama), supaya tidak ikut muncul di dashboard admin-mobile.
export default function UserStatistikAbsensi({ employees, attendance, statusLocks = [], settings, holidays = [], fetchAttendanceByRange }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
    const h = new Date().getHours();
    return h >= 12 ? 'Sore' : 'Pagi';
  });

  return (
    <div className="min-h-full bg-slate-50 pb-20 print:pb-0">
      <MobileHeader title="Statistik Absensi" onBack={() => navigate('/')} />
      <div className="p-4">
        <AttendanceStatsView
          employees={employees}
          attendance={attendance}
          statusLocks={statusLocks}
          settings={settings}
          date={date}
          session={session}
          onDateChange={setDate}
          onSessionChange={setSession}
          holidays={holidays}
        />
        <UserAttendanceLeaderboard
          employees={employees}
          holidays={holidays}
          fetchAttendanceByRange={fetchAttendanceByRange}
        />
      </div>
    </div>
  );
}
