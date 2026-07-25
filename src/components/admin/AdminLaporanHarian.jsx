import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { getTodayString } from '../../utils/helpers';
import { getDailyStats } from '../../utils/statistics'; // Import Logic Baru
import LaporanHarianDocument from './LaporanHarianDocument';

export default function AdminLaporanHarian({ employees, attendance, statusLocks = [], settings, holidays, isUserView = false }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
     const h = new Date().getHours();
     return h >= 12 ? 'Sore' : 'Pagi';
  });
  const [printTemplate, setPrintTemplate] = useState('v2');
  const [showSignature, setShowSignature] = useState(true);

  // --- LOGIKA HARI LIBUR & WEEKEND ---
  const selectedDate = new Date(date);
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6; // 0=Minggu, 6=Sabtu
  const holidayData = holidays.find(h => h.date === date);
  const isNonEffective = isWeekend || !!holidayData;

  // --- GUNAKAN LOGIC TERPUSAT ---
  const { grouped, counts } = getDailyStats(date, session, employees, attendance, statusLocks, holidays);

  // Sorting Khusus untuk Laporan (Hadir berdasarkan No, Sisanya Default/Nama)
  const hadirList = grouped.Hadir.sort((a, b) => (parseInt(a.no) || 99999) - (parseInt(b.no) || 99999));
  const sakitList = grouped.Sakit.sort((a, b) => a.nama.localeCompare(b.nama));
  const izinList = grouped.Izin.sort((a, b) => a.nama.localeCompare(b.nama));
  const cutiList = grouped.Cuti.sort((a, b) => a.nama.localeCompare(b.nama));
  const dlList = grouped['Dinas Luar'].sort((a, b) => a.nama.localeCompare(b.nama));
  const alpaList = grouped.Alpa.sort((a, b) => a.nama.localeCompare(b.nama));

  // Menggabungkan list tidak hadir untuk Template V1
  const listTidakHadir = [
      ...grouped.Alpa.map(e => ({...e, status: 'Alpa (Tanpa Ket.)'})),
      ...grouped['Dinas Luar'].map(e => ({...e, status: 'Dinas Luar'})),
      ...grouped.Izin.map(e => ({...e, status: 'Izin'})),
      ...grouped.Sakit.map(e => ({...e, status: 'Sakit'})),
      ...grouped.Cuti.map(e => ({...e, status: 'Cuti'}))
  ];

  const statusPriority = { 'Alpa (Tanpa Ket.)': 1, 'Dinas Luar': 2, 'Izin': 3, 'Sakit': 4, 'Cuti': 5 };
  listTidakHadir.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap items-end gap-4">
         <div>
           <label className="text-xs font-bold block mb-1">Tanggal</label>
           <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded"/>
         </div>
         <div>
           <label className="text-xs font-bold block mb-1">Sesi</label>
           <select value={session} onChange={e=>setSession(e.target.value)} className="border p-2 rounded w-32">
             <option>Pagi</option>
             <option>Sore</option>
           </select>
         </div>
         {!isUserView && (
             <div className="flex gap-4">
                <div>
                    <label className="text-xs font-bold block mb-1">Model Cetak</label>
                    <select value={printTemplate} onChange={e=>setPrintTemplate(e.target.value)} className="border p-2 rounded w-48 bg-yellow-50 border-yellow-300">
                    <option value="v2">Format BKPSDMA</option>
                    <option value="v1">Format Default</option>
                    </select>
                </div>
                
                <div className="flex flex-col justify-end pb-2">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={showSignature} 
                            onChange={(e) => setShowSignature(e.target.checked)}
                            className="w-5 h-5 text-red-700 rounded border-gray-300 focus:ring-red-600"
                        />
                        <span className="text-sm font-bold text-slate-700">TTD Pimpinan</span>
                    </label>
                </div>
             </div>
         )}
         <button onClick={()=>window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center ml-auto hover:bg-black">
            <Printer size={18} className="mr-2"/> Cetak Laporan
         </button>
      </div>

      <LaporanHarianDocument
        settings={settings}
        date={date}
        session={session}
        isNonEffective={isNonEffective}
        holidayData={holidayData}
        printTemplate={printTemplate}
        showSignature={showSignature}
        counts={counts}
        hadirList={hadirList}
        sakitList={sakitList}
        izinList={izinList}
        cutiList={cutiList}
        dlList={dlList}
        alpaList={alpaList}
        listTidakHadir={listTidakHadir}
      />
    </div>
  );
}