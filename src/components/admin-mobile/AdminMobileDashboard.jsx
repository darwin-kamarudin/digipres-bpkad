import React, { useState } from 'react';
import { ChevronRight, UserX } from 'lucide-react';
import { getTodayString } from '../../utils/helpers';
import { getDailyStats } from '../../utils/statistics';
import AttendanceStatsView from '../shared/AttendanceStatsView';
import AdminMobileQuickStatusSheet from './AdminMobileQuickStatusSheet';

// Versi mobile-native (Capacitor) dari AdminDashboard.jsx, dipisah total agar
// versi web tetap memakai tampilan kartu grid responsif yang sudah ada.
// Kartu statistik dipakai dari AttendanceStatsView (dipakai bersama dengan
// UserStatistikAbsensi.jsx di panel pegawai); daftar "Belum Absen" + aksi
// cepat kunci status HANYA ada di sini (fitur khusus admin).
export default function AdminMobileDashboard({ employees, attendance, statusLocks = [], settings, holidays = [] }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
    const h = new Date().getHours();
    return h >= 12 ? 'Sore' : 'Pagi';
  });
  const [pickedEmployee, setPickedEmployee] = useState(null);

  const { grouped } = getDailyStats(date, session, employees, attendance, statusLocks, holidays);
  const alpaList = grouped.Alpa.slice().sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="p-4 pb-6 font-sans">
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

      {/* DAFTAR PEGAWAI BELUM ABSEN (ALPA) — TAP UNTUK AKSI CEPAT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-5">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <UserX size={16} className="text-red-600" /> Belum Absen ({alpaList.length})
          </h3>
        </div>
        {alpaList.length === 0 ? (
          <div className="text-center p-6 text-slate-400 text-sm">
            Semua pegawai sudah tercatat pada sesi ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alpaList.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => setPickedEmployee(emp)}
                className="w-full flex items-center gap-3 p-3.5 text-left active:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {emp.nama.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-700 truncate">{emp.nama}</div>
                  <div className="text-[11px] text-slate-500 truncate">{emp.nip ? `NIP: ${emp.nip}` : 'NIP: -'}</div>
                </div>
                <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <AdminMobileQuickStatusSheet
        open={!!pickedEmployee}
        employee={pickedEmployee}
        date={date}
        session={session}
        onClose={() => setPickedEmployee(null)}
      />
    </div>
  );
}
