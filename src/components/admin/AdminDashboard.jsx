import React, { useState } from 'react';
import { Users, UserCheck, XCircle, Activity, FileText, Calendar, Briefcase, UserX, ChevronRight } from 'lucide-react';
import { getTodayString, DEFAULT_LOGO_URL } from '../../utils/helpers';
import { getDailyStats } from '../../utils/statistics'; // Import Logic Baru
import AdminQuickStatusModal from './AdminQuickStatusModal';

export default function AdminDashboard({ employees, attendance, statusLocks = [], settings, holidays = [] }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
     const h = new Date().getHours();
     return h >= 12 ? 'Sore' : 'Pagi';
  });
  // Pegawai yang sedang dipilih untuk dicatatkan absensinya oleh admin
  const [pickedEmployee, setPickedEmployee] = useState(null);

  // GUNAKAN LOGIC TERPUSAT (dengan kunci status admin)
  const { counts, grouped } = getDailyStats(date, session, employees, attendance, statusLocks, holidays);
  const alpaList = grouped.Alpa.slice().sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="p-2 md:p-6 animate-in fade-in duration-500">
       <div className="bg-slate-800 text-white p-6 rounded-xl flex items-center gap-6 mb-8 shadow-xl">
          <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="w-20 h-20 bg-white rounded-full p-1 object-contain" alt="Logo"/>
          <div>
             <h2 className="text-xl font-bold uppercase">{settings.opdName}</h2>
             <p className="text-slate-400 text-sm uppercase tracking-wide">{settings.parentAgency}</p>
             <p className="text-xs text-slate-500 mt-1">{settings.address}</p>
          </div>
       </div>

       <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold text-slate-800">Dashboard Statistik</h1>
             <p className="text-slate-500">Ringkasan Data Absensi: <span className="font-bold text-amber-600">{session}</span></p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border">
                <span className="text-sm font-bold text-slate-600">Sesi:</span>
                <select value={session} onChange={e=>setSession(e.target.value)} className="outline-none text-slate-700 bg-transparent font-bold">
                   <option>Pagi</option>
                   <option>Sore</option>
                </select>
             </div>
             <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border">
                <span className="text-sm font-bold text-slate-600">Tanggal:</span>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="outline-none text-slate-700"/>
             </div>
          </div>
       </div>

       {/* CARD STATISTICS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-amber-100 uppercase text-xs tracking-wider">Total Pegawai</h3>
                   <Users className="text-amber-200" size={24}/>
                </div>
                <p className="text-4xl font-bold">{counts.TotalPegawai}</p>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                <Users size={100}/>
             </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-green-100 uppercase text-xs tracking-wider">Hadir ({session})</h3>
                   <UserCheck className="text-green-200" size={24}/>
                </div>
                <p className="text-4xl font-bold">{counts.Hadir}</p>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                <UserCheck size={100}/>
             </div>
          </div>

          <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-red-100 uppercase text-xs tracking-wider">Belum Absen</h3>
                   <XCircle className="text-red-200" size={24}/>
                </div>
                <p className="text-4xl font-bold">{counts.Alpa}</p>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                <XCircle size={100}/>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Sakit</p>
                <p className="text-2xl font-bold text-slate-700">{counts.Sakit}</p>
             </div>
             <Activity className="text-yellow-500 opacity-50"/>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Izin</p>
                <p className="text-2xl font-bold text-slate-700">{counts.Izin}</p>
             </div>
             <FileText className="text-orange-500 opacity-50"/>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Cuti</p>
                <p className="text-2xl font-bold text-slate-700">{counts.Cuti}</p>
             </div>
             <Calendar className="text-purple-500 opacity-50"/>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Dinas Luar</p>
                <p className="text-2xl font-bold text-slate-700">{counts.DL}</p>
             </div>
             <Briefcase className="text-teal-500 opacity-50"/>
          </div>
       </div>

       {/* DAFTAR PEGAWAI BELUM ABSEN — KLIK UNTUK DICATATKAN ADMIN.
           Fitur yang sama dengan panel admin mobile, hanya daftarnya dibuat 3
           kolom karena layar web jauh lebih lega. */}
       <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserX size={18} className="text-red-600"/> Belum Absen ({alpaList.length})
             </h3>
             <p className="text-xs text-slate-500">Klik nama pegawai untuk mencatat kehadiran / status</p>
          </div>

          {alpaList.length === 0 ? (
             <div className="text-center p-8 text-slate-400 text-sm">
                Semua pegawai sudah tercatat pada sesi {session}.
             </div>
          ) : (
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {alpaList.map((emp) => (
                   <button
                      key={emp.id}
                      type="button"
                      onClick={() => setPickedEmployee(emp)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-left hover:bg-slate-50 hover:border-red-300 transition"
                   >
                      <div className="w-9 h-9 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                         {emp.nama.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="font-bold text-sm text-slate-700 truncate">{emp.nama}</div>
                         <div className="text-[11px] text-slate-500 truncate">{emp.nip ? `NIP: ${emp.nip}` : 'NIP: -'}</div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 flex-shrink-0"/>
                   </button>
                ))}
             </div>
          )}
       </div>

       <AdminQuickStatusModal
          open={!!pickedEmployee}
          employee={pickedEmployee}
          date={date}
          session={session}
          onClose={() => setPickedEmployee(null)}
       />
    </div>
  );
}