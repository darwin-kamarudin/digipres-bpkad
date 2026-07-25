import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { getTodayString, getWeekNumber, formatDateIndo, isNonEffectiveDate, formatLocalDate, DEFAULT_LOGO_URL } from '../../utils/helpers';
import { mergeAttendanceWithLocks } from '../../utils/statistics';
import MobileHeader from './MobileHeader';
import PinchZoomView from '../shared/PinchZoomView';
import { printDocumentNode } from '../../lib/printDocument';

export default function UserRekapan({ user, attendance, statusLocks = [], settings, employees = [], holidays = [] }) {
   const navigate = useNavigate();
   const docRef = useRef(null);
   const [viewMode, setViewMode] = useState('bulanan');
   const [month, setMonth] = useState(formatLocalDate(new Date()).slice(0, 7));
   const [week, setWeek] = useState(getTodayString());

   // State untuk Opsi Tanda Tangan
   const [showSecretary, setShowSecretary] = useState(true);
   const [showLeader, setShowLeader] = useState(true);

   // --- LOGIKA MENCARI DATA SEKRETARIS (DINAMIS DARI DATA PEGAWAI) ---
   // Mencari pegawai yang jabatannya mengandung kata "Sekretaris" tapi bukan "Staf"
   const secretary = employees.find(e => 
      e.jabatan && e.jabatan.toLowerCase().includes('sekretaris') && !e.jabatan.toLowerCase().includes('staf')
   );

   // --- LOGIKA FILTER DATA ---
   // Gabungkan absensi mandiri dengan kunci status admin (Izin/Sakit/Cuti/DL).
   // Absensi mandiri menang -> hari yang diabsen tampil Hadir (buka kunci otomatis).
   const rangeYear = (viewMode === 'bulanan' ? month : week).slice(0, 4);
   const mergedLogs = mergeAttendanceWithLocks(attendance, statusLocks, `${rangeYear}-01-01`, `${rangeYear}-12-31`, holidays);

   const filteredLogs = mergedLogs.filter(l => {
      const isUser = l.userId === user.id && l.statusApproval === 'approved';
      if(!isUser) return false;
      if(viewMode === 'bulanan') return l.date.startsWith(month);
      else {
         const logWeek = getWeekNumber(new Date(l.date));
         const selectedWeek = getWeekNumber(new Date(week));
         return logWeek === selectedWeek && l.date.substring(0,4) === week.substring(0,4);
      }
   });

   // --- HARI EFEKTIF DALAM PERIODE TERPILIH (untuk deteksi Alpa & persentase kehadiran) ---
   // Sabtu/Minggu/hari libur admin BUKAN hari kerja -> tidak dihitung sebagai Alpa
   // ataupun masuk pembagi persentase kehadiran (lihat isNonEffectiveDate di utils/helpers.js).
   // Tanggal MASA DEPAN (belum benar-benar terjadi) juga TIDAK dihitung -> supaya
   // bulan berjalan tidak langsung dianggap "Alpa" untuk hari-hari yang belum tiba.
   const today = getTodayString();
   const effectiveDatesInPeriod = (() => {
      if (viewMode === 'bulanan') {
         const [y, m] = month.split('-').map(Number);
         const lastDay = new Date(y, m, 0).getDate();
         const out = [];
         for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            if (dateStr > today) break;
            if (!isNonEffectiveDate(dateStr, holidays).isNonEffective) out.push(dateStr);
         }
         return out;
      }
      // Mingguan: 7 hari dari Senin s/d Minggu pada minggu yang dipilih.
      const base = new Date(`${week}T00:00:00`);
      const dayOfWeek = base.getDay() === 0 ? 7 : base.getDay(); // Senin=1..Minggu=7
      const monday = new Date(base);
      monday.setDate(base.getDate() - (dayOfWeek - 1));
      const out = [];
      for (let i = 0; i < 7; i++) {
         const d = new Date(monday);
         d.setDate(monday.getDate() + i);
         const dateStr = formatLocalDate(d);
         if (dateStr > today) break;
         if (!isNonEffectiveDate(dateStr, holidays).isNonEffective) out.push(dateStr);
      }
      return out;
   })();

   // Alpa: hari efektif dalam periode yang TIDAK punya catatan absensi/kunci status sama sekali.
   const recordedDates = new Set(filteredLogs.map(l => l.date));
   const alpaDates = effectiveDatesInPeriod.filter(d => !recordedDates.has(d));

   // Dihitung per HARI (bukan per baris log) supaya tidak dobel saat satu hari
   // punya beberapa sesi (Pagi/Siang/Sore) berstatus sama.
   const hadirDates = new Set(filteredLogs.filter(l => l.status === 'Hadir').map(l => l.date));
   const dlDates = new Set(filteredLogs.filter(l => l.status === 'Dinas Luar').map(l => l.date));

   const counts = {
      Hadir: filteredLogs.filter(l => l.status === 'Hadir').length,
      Sakit: filteredLogs.filter(l => l.status === 'Sakit').length,
      Izin: filteredLogs.filter(l => l.status === 'Izin').length,
      Cuti: filteredLogs.filter(l => l.status === 'Cuti').length,
      DL: filteredLogs.filter(l => l.status === 'Dinas Luar').length,
      Alpa: alpaDates.length,
   };

   // Persentase kehadiran = (hari Hadir + hari Dinas Luar) / total hari efektif periode ini.
   // Dibatasi maksimal 100% (mis. kalau ada absensi nyata di hari non-efektif/di
   // luar pembagi, jangan sampai persentase tampil lebih dari 100%).
   const persentaseKehadiran = effectiveDatesInPeriod.length > 0
      ? Math.min(100, Math.round(((hadirDates.size + dlDates.size) / effectiveDatesInPeriod.length) * 1000) / 10)
      : 0;

   // Semua tanggal dalam periode (efektif MAUPUN non-efektif) untuk baris tabel
   // per-hari, dibatasi s/d hari ini (tanggal masa depan tidak ditampilkan).
   const allDatesInPeriod = (() => {
      if (viewMode === 'bulanan') {
         const [y, m] = month.split('-').map(Number);
         const lastDay = new Date(y, m, 0).getDate();
         const out = [];
         for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            if (dateStr > today) break;
            out.push(dateStr);
         }
         return out;
      }
      const base = new Date(`${week}T00:00:00`);
      const dayOfWeek = base.getDay() === 0 ? 7 : base.getDay();
      const monday = new Date(base);
      monday.setDate(base.getDate() - (dayOfWeek - 1));
      const out = [];
      for (let i = 0; i < 7; i++) {
         const d = new Date(monday);
         d.setDate(monday.getDate() + i);
         const dateStr = formatLocalDate(d);
         if (dateStr > today) break;
         out.push(dateStr);
      }
      return out;
   })();

   const findSessionLog = (date, session) => filteredLogs.find(l => l.date === date && l.session === session);
   // Belum ada catatan sama sekali untuk sesi itu -> dianggap Alpa (tanpa keterangan).
   const sessionStatusOf = (log) => log ? log.status : 'Alpa';
   const displayStatus = (s) => s === 'Dinas Luar' ? 'DL' : s;

   const rangeText = viewMode === 'bulanan'
      ? new Date(month+'-01').toLocaleDateString('id-ID', {month:'long', year:'numeric'})
      : `Minggu ke-${getWeekNumber(new Date(week))} (${new Date(week).getFullYear()})`;

   return (
      <div className="min-h-full bg-slate-50">
         <MobileHeader title="Rekapan Bulanan" onBack={() => navigate('/')} />

         <div className="space-y-6 animate-in fade-in duration-300 p-4">
         {/* CONTROLS (Non-Print) */}
         <div className="bg-white p-4 rounded shadow print:hidden flex flex-col gap-4">
             <div className="flex flex-wrap gap-4 items-end justify-between">
                <div className="flex gap-4">
                   <div>
                      <label className="block text-xs font-bold mb-1">Tipe Rekapan</label>
                      <select className="border p-2 rounded w-32 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={viewMode} onChange={e=>setViewMode(e.target.value)}>
                         <option value="bulanan">Bulanan</option>
                         <option value="mingguan">Mingguan</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold mb-1">{viewMode === 'bulanan' ? 'Pilih Bulan' : 'Pilih Tanggal (Dalam Minggu)'}</label>
                      {viewMode === 'bulanan' ? (
                         <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                      ) : (
                         <input type="date" value={week} onChange={e=>setWeek(e.target.value)} className="border p-2 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                      )}
                   </div>
                </div>
                <button onClick={() => printDocumentNode(docRef.current, `Rekapan Absensi - ${user.nama} - ${rangeText}`)} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-black transition-colors shadow-sm active:scale-95">
                    <Printer size={16} className="mr-2"/> Cetak
                </button>
             </div>

             {/* OPSI TANDA TANGAN */}
             <div className="flex gap-6 border-t pt-3">
                 <span className="text-xs font-bold text-slate-500 flex items-center">Opsi Tanda Tangan:</span>
                 <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                    <input 
                        type="checkbox" 
                        checked={showSecretary} 
                        onChange={(e) => setShowSecretary(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    TTD Sekretaris
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                    <input 
                        type="checkbox" 
                        checked={showLeader} 
                        onChange={(e) => setShowLeader(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    TTD Pimpinan
                 </label>
             </div>
         </div>

         {/* REPORT AREA */}
         <p className="text-center text-[11px] text-slate-400 print:hidden">Cubit (pinch) untuk perbesar, geser untuk lihat detail. Ketuk dua kali untuk reset.</p>
         <PinchZoomView contentWidth={640}>
         <div ref={docRef} className="bg-white p-8 rounded shadow print:shadow-none print:w-full">

            {/* KOP SURAT */}
            <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
               <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0" alt="logo"/>
               <div className="text-center px-20">
                  <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
                  <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
                  <p className="text-sm italic">{settings.address}</p>
               </div>
            </div>

            {/* JUDUL */}
            <div className="text-center pb-4 mb-6">
               <h3 className="text-xl font-bold underline uppercase">REKAPAN ABSENSI PEGAWAI</h3>
               <p className="uppercase font-medium">PERIODE: {rangeText}</p>
            </div>

            {/* INFO PEGAWAI */}
            <div className="mb-6 text-sm">
                  <table className="w-full">
                      <tbody>
                          <tr>
                              <td className="font-bold w-32">Nama</td>
                              <td>: {user.nama}</td>
                              <td className="font-bold w-32">Status</td>
                              <td>: {user.statusPegawai || '-'}</td>
                          </tr>
                          <tr>
                              <td className="font-bold">NIP</td>
                              <td>: {user.nip || '-'}</td>
                              <td className="font-bold">Jabatan</td>
                              <td>: {user.jabatan}</td>
                          </tr>
                      </tbody>
                  </table>
            </div>

            {/* KARTU TOTAL PERSENTASE KEHADIRAN — ikut tercetak (warna dipertahankan saat print) */}
            <div className="bg-gradient-to-r from-red-700 to-amber-600 text-white rounded-lg px-4 py-2.5 mb-3 flex items-center justify-between gap-3 print:break-inside-avoid">
               <p className="text-xs uppercase tracking-wide text-white/80 leading-tight">Total Persentase<br/>Kehadiran</p>
               <p className="text-2xl font-black flex-shrink-0">{persentaseKehadiran}%</p>
            </div>

            {/* STATISTICS (Hanya Tampil di Layar) */}
            <div className="grid grid-cols-6 gap-1 mb-6 text-center text-[11px] print:hidden">
               {Object.entries(counts).map(([k,v]) => (
                  <div key={k} className="bg-slate-50 border p-1.5 rounded">
                     <span className="block font-bold text-base leading-tight">{v}</span> {k}
                  </div>
               ))}
            </div>

            {/* TABEL DATA — 1 baris per hari (hemat ruang cetak), bukan per sesi */}
            <table className="w-full border-collapse border border-black text-sm mb-8">
               <thead className="bg-slate-100 print:bg-transparent">
                  <tr>
                     <th className="border border-black p-2">Tanggal</th>
                     <th className="border border-black p-2">Sesi Pagi</th>
                     <th className="border border-black p-2">Sesi Siang</th>
                     <th className="border border-black p-2">Sesi Sore</th>
                     <th className="border border-black p-2">%</th>
                  </tr>
               </thead>
               <tbody>
                  {allDatesInPeriod.length > 0 ? (
                     allDatesInPeriod.map((date) => {
                        const { isNonEffective, holiday } = isNonEffectiveDate(date, holidays);
                        if (isNonEffective) {
                           return (
                              <tr key={date} className="bg-slate-100 print:bg-transparent">
                                 <td className="border border-black p-2 text-center font-bold">{formatDateIndo(date)}</td>
                                 <td colSpan={4} className="border border-black p-2 text-center italic text-slate-500">
                                    {holiday ? holiday.desc : 'Libur Akhir Pekan (Non Efektif)'}
                                 </td>
                              </tr>
                           );
                        }

                        const pagiLog = findSessionLog(date, 'Pagi');
                        const siangLog = findSessionLog(date, 'Siang');
                        const soreLog = findSessionLog(date, 'Sore');

                        const pagiStatus = sessionStatusOf(pagiLog);
                        const soreStatus = sessionStatusOf(soreLog);
                        // Pagi & Sore sama-sama Hadir ATAU sama-sama Dinas Luar -> Siang otomatis
                        // ikut status yang sama (walau tidak ada catatan checkin siang tersendiri;
                        // khusus DL memang selalu dipastikan berlaku sepanjang hari). Kalau Pagi
                        // TIDAK Hadir/DL (Izin/Sakit/Cuti/Alpa), Siang tetap pakai catatan aslinya.
                        const siangStatus = (pagiStatus === soreStatus && (pagiStatus === 'Hadir' || pagiStatus === 'Dinas Luar'))
                           ? pagiStatus
                           : sessionStatusOf(siangLog);

                        const sessionStatuses = [pagiStatus, siangStatus, soreStatus];
                        const hadirLikeCount = sessionStatuses.filter(s => s === 'Hadir' || s === 'Dinas Luar').length;
                        const dayPercent = Math.round((hadirLikeCount / 3) * 1000) / 10;
                        const isAlpaDay = sessionStatuses.every(s => s === 'Alpa');

                        return (
                           <tr key={date} className={isAlpaDay ? 'bg-red-50 print:bg-transparent' : ''}>
                              <td className="border border-black p-2 text-center">{formatDateIndo(date)}</td>
                              <td className="border border-black p-2 text-center">{displayStatus(pagiStatus)}</td>
                              <td className="border border-black p-2 text-center">{displayStatus(siangStatus)}</td>
                              <td className="border border-black p-2 text-center">{displayStatus(soreStatus)}</td>
                              <td className={`border border-black p-2 text-center font-bold ${dayPercent === 100 ? 'text-green-700 print:text-black' : 'text-red-600 print:text-black'}`}>{dayPercent}%</td>
                           </tr>
                        );
                     })
                  ) : (
                     <tr><td colSpan={5} className="border border-black p-4 text-center italic">Tidak ada data pada periode ini.</td></tr>
                  )}
               </tbody>
            </table>

            {/* BAGIAN TANDA TANGAN */}
            <div className="mt-4 flex justify-between text-center text-sm break-inside-avoid">
                {/* LOGIKA KIRI: Tampil jika Sekretaris & Pimpinan ON */}
                {showSecretary && showLeader && (
                    <div className="min-w-[200px] w-auto px-4 mt-4">
                        <p>Mengetahui,</p>
                        <p className="mb-20 font-bold">{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                        <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
                        <p>NIP. {settings.kepalaNip || '..............................'}</p>
                    </div>
                )}

                {/* Spacer jika Kiri Kosong agar Kanan tetap di kanan */}
                {!(showSecretary && showLeader) && <div></div>}

                {/* LOGIKA KANAN */}
                <div className="min-w-[200px] w-auto px-4">
                   <p className="mb-4">{settings.titimangsa || 'Bobong'}, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month:'long', year:'numeric'})}</p>
                   
                   {/* KONDISI 1 & 2: Jika Sekretaris ON (Baik Pimpinan ON atau OFF) -> Kanan = Sekretaris */}
                   {showSecretary ? (
                       secretary ? (
                           <>
                               <p className="mb-20 font-bold">{secretary.jabatan}</p>
                               <p className="font-bold underline whitespace-nowrap">{secretary.nama}</p>
                               <p>NIP. {secretary.nip || '-'}</p>
                           </>
                       ) : (
                           <div className="mt-10 italic text-gray-400 text-sm">(Data Sekretaris tidak ditemukan)</div>
                       )
                   ) : 
                   
                   /* KONDISI 3: Hanya Pimpinan ON (Sekretaris OFF) -> Kanan = Pimpinan */
                   showLeader ? (
                       <>
                           <p className="mb-20 font-bold">{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                           <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
                           <p>NIP. {settings.kepalaNip || '..............................'}</p>
                       </>
                   ) : 
                   
                   /* KONDISI 4: Keduanya OFF -> Kanan = Pegawai YBS */
                   (
                        <>
                           <p className="mb-20 font-bold">Pegawai Yang Bersangkutan</p>
                           <p className="font-bold underline whitespace-nowrap">{user.nama}</p>
                           <p>NIP. {user.nip || '-'}</p>
                        </>
                   )}
                </div>
             </div>
         </div>
         </PinchZoomView>
         </div>
      </div>
   );
}