import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayString } from '../../utils/helpers';
import MobileHeader from './MobileHeader';
import AttendanceStatsView from '../shared/AttendanceStatsView';

// Tampilan statistik absensi (sama persis dengan kartu statistik di dashboard
// admin-mobile via AttendanceStatsView) tapi TANPA daftar "Belum Absen" &
// aksi kunci status — pegawai hanya bisa melihat, bukan mengubah data.
export default function UserStatistikAbsensi({ employees, attendance, statusLocks = [], settings, holidays = [] }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
    const h = new Date().getHours();
    return h >= 12 ? 'Sore' : 'Pagi';
  });

  return (
    <div className="min-h-full bg-slate-50">
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
      </div>
    </div>
  );
}
