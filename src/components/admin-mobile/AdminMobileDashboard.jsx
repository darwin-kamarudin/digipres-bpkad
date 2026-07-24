import React, { useState } from 'react';
import { Users, UserCheck, XCircle, Activity, FileText, Calendar, Briefcase, ChevronRight, UserX } from 'lucide-react';
import { getTodayString, DEFAULT_LOGO_URL } from '../../utils/helpers';
import { getDailyStats } from '../../utils/statistics';
import AdminMobileQuickStatusSheet from './AdminMobileQuickStatusSheet';

// Versi mobile-native (Capacitor) dari AdminDashboard.jsx, dipisah total agar
// versi web tetap memakai tampilan kartu grid responsif yang sudah ada.
export default function AdminMobileDashboard({ employees, attendance, statusLocks = [], settings }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
    const h = new Date().getHours();
    return h >= 12 ? 'Sore' : 'Pagi';
  });
  const [pickedEmployee, setPickedEmployee] = useState(null);

  const { counts, grouped } = getDailyStats(date, session, employees, attendance, statusLocks);
  const alpaList = grouped.Alpa.slice().sort((a, b) => a.nama.localeCompare(b.nama));

  const miniStats = [
    { label: 'Sakit', value: counts.Sakit, icon: Activity, border: 'border-yellow-500', text: 'text-yellow-600' },
    { label: 'Izin', value: counts.Izin, icon: FileText, border: 'border-orange-500', text: 'text-orange-600' },
    { label: 'Cuti', value: counts.Cuti, icon: Calendar, border: 'border-purple-500', text: 'text-purple-600' },
    { label: 'Dinas Luar', value: counts.DL, icon: Briefcase, border: 'border-teal-500', text: 'text-teal-600' },
  ];

  return (
    <div className="p-4 pb-6 font-sans">
      {/* IDENTITAS INSTANSI */}
      <div className="bg-slate-800 text-white p-5 rounded-2xl flex items-center gap-4 mb-5 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="w-11 h-11 object-contain" alt="Logo" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase leading-tight break-words">{settings.opdName}</h2>
          <p className="text-slate-400 text-[11px] uppercase tracking-wide break-words">{settings.parentAgency}</p>
        </div>
      </div>

      {/* FILTER SESI & TANGGAL */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500">Sesi</span>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="outline-none text-slate-800 bg-transparent font-bold text-sm flex-1">
            <option>Pagi</option>
            <option>Sore</option>
          </select>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
          <span className="text-xs font-bold text-slate-500">Tgl</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="outline-none text-slate-800 font-bold text-sm flex-1 min-w-0" />
        </div>
      </div>

      {/* KARTU STATISTIK UTAMA (3 KOLOM BERDAMPINGAN) */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-gradient-to-br from-amber-600 to-amber-500 p-3 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <Users className="text-amber-200 mb-1" size={18} />
            <p className="text-xl font-black leading-tight">{counts.TotalPegawai}</p>
            <h3 className="font-bold text-amber-100 uppercase text-[9px] tracking-wider leading-tight">Total Pegawai</h3>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-500 p-3 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <UserCheck className="text-green-200 mb-1" size={18} />
            <p className="text-xl font-black leading-tight">{counts.Hadir}</p>
            <h3 className="font-bold text-green-100 uppercase text-[9px] tracking-wider leading-tight">Hadir ({session})</h3>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-500 p-3 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <XCircle className="text-red-200 mb-1" size={18} />
            <p className="text-xl font-black leading-tight">{counts.Alpa}</p>
            <h3 className="font-bold text-red-100 uppercase text-[9px] tracking-wider leading-tight">Belum Absen</h3>
          </div>
        </div>
      </div>

      {/* KARTU STATISTIK LAINNYA */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {miniStats.map((s) => (
          <div key={s.label} className={`bg-white p-3.5 rounded-xl shadow-sm border-l-4 ${s.border} flex items-center justify-between`}>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{s.label}</p>
              <p className="text-xl font-black text-slate-700">{s.value}</p>
            </div>
            <s.icon className={`${s.text} opacity-60`} size={22} />
          </div>
        ))}
      </div>

      {/* DAFTAR PEGAWAI BELUM ABSEN (ALPA) — TAP UNTUK AKSI CEPAT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
