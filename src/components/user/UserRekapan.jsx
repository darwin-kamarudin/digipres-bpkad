import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { getTodayString, getWeekNumber, formatDateIndo, DEFAULT_LOGO_URL } from '../../utils/helpers';
import { mergeAttendanceWithLocks } from '../../utils/statistics';
import MobileHeader from './MobileHeader';
import PinchZoomView from '../shared/PinchZoomView';
import { printDocumentNode } from '../../lib/printDocument';

export default function UserRekapan({ user, attendance, statusLocks = [], settings, employees = [], holidays = [] }) {
   const navigate = useNavigate();
   const docRef = useRef(null);
   const [viewMode, setViewMode] = useState('bulanan');
   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
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

   const counts = {
      Hadir: filteredLogs.filter(l => l.status === 'Hadir').length,
      Sakit: filteredLogs.filter(l => l.status === 'Sakit').length,
      Izin: filteredLogs.filter(l => l.status === 'Izin').length,
      Cuti: filteredLogs.filter(l => l.status === 'Cuti').length,
      DL: filteredLogs.filter(l => l.status === 'Dinas Luar').length,
   };

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
                              <td className="font-bold w-32">Nama Pegawai</td>
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

            {/* STATISTICS (Hanya Tampil di Layar) */}
            <div className="grid grid-cols-5 gap-2 mb-6 text-center text-sm print:hidden">
               {Object.entries(counts).map(([k,v]) => (
                  <div key={k} className="bg-slate-50 border p-2 rounded">
                     <span className="block font-bold text-lg">{v}</span> {k}
                  </div>
               ))}
            </div>

            {/* TABEL DATA */}
            <table className="w-full border-collapse border border-black text-sm mb-8">
               <thead className="bg-slate-100 print:bg-transparent">
                  <tr>
                     <th className="border border-black p-2">Tanggal</th>
                     <th className="border border-black p-2">Sesi</th>
                     <th className="border border-black p-2">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredLogs.length > 0 ? (
                     filteredLogs.sort((a,b) => a.date.localeCompare(b.date)).map(l => (
                        <tr key={l.id}>
                           <td className="border border-black p-2 text-center">{formatDateIndo(l.date)}</td>
                           <td className="border border-black p-2 text-center">{l.session}</td>
                           <td className="border border-black p-2 text-center">{l.status}</td>
                        </tr>
                     ))
                  ) : (
                     <tr><td colSpan="3" className="border border-black p-4 text-center italic">Tidak ada data absensi pada periode ini.</td></tr>
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