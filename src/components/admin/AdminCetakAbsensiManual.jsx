import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { getTodayString, formatDateIndo, formatLocalDate, DEFAULT_LOGO_URL } from '../../utils/helpers';

export default function AdminCetakAbsensiManual({ employees, settings, holidays }) {
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(() => {
     const d = new Date();
     d.setDate(d.getDate() + 6); // Default 1 minggu kedepan
     return formatLocalDate(d);
  });
  
  const sortedEmployees = [...employees].filter(e=>e.role === 'user').sort((a, b) => {
    const noA = parseInt(a.no) || 99999;
    const noB = parseInt(b.no) || 99999;
    return noA - noB;
  });

  // --- LOGIKA BARU: MENGELOMPOKKAN PER MINGGU (MINGGU s/d SABTU) ---
  const generateWeeklyPages = () => {
    const pages = [];
    
    // 1. Tentukan Titik Awal Loop (Minggu terkini sebelum/sama dengan startDate)
    let currentLoop = new Date(startDate);
    const dayDiff = currentLoop.getDay(); // 0=Minggu, 1=Senin, dst.
    currentLoop.setDate(currentLoop.getDate() - dayDiff); // Mundur ke hari Minggu

    const limitDate = new Date(endDate);

    // Loop per minggu sampai melewati endDate
    while (currentLoop <= limitDate || (currentLoop <= limitDate && currentLoop.getDay() !== 0)) {
        
        // Tentukan Awal Minggu (Minggu) dan Akhir Minggu (Sabtu) untuk Label Header
        const weekStart = new Date(currentLoop);
        const weekEnd = new Date(currentLoop);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Cari hari kerja (Senin-Jumat/Sabtu) yang masuk dalam minggu ini
        // DAN juga masuk dalam rentang yang dipilih user
        const workDays = [];
        let d = new Date(weekStart);
        
        // Loop 7 hari dalam minggu ini (Minggu s/d Sabtu)
        for(let i=0; i<7; i++) {
            const dayNum = d.getDay();
            // Ambil hanya Senin (1) s/d Jumat (5) - Atau Sabtu(6) jika 6 hari kerja
            // Disini default Senin-Jumat
            if (dayNum >= 1 && dayNum <= 5) {
                // Pastikan tanggal ini juga >= startDate input user dan <= endDate input user
                // Agar tidak mencetak kolom kosong di luar range yg dipilih
                if (d >= new Date(startDate) && d <= new Date(endDate)) {
                    workDays.push(new Date(d));
                }
            }
            d.setDate(d.getDate() + 1);
        }

        // Jika dalam minggu ini ada hari kerja yang terpilih, masukkan ke pages
        if (workDays.length > 0 || (weekStart <= limitDate && weekEnd >= new Date(startDate))) {
             pages.push({
                 labelStart: weekStart,
                 labelEnd: weekEnd,
                 days: workDays
             });
        }
        
        // Maju 7 hari ke minggu berikutnya
        currentLoop.setDate(currentLoop.getDate() + 7);
        
        // Safety break jika loop kebablasan jauh (misal user input tahun 2050)
        if (currentLoop > limitDate && currentLoop.getDay() === 0) break; 
    }

    return pages;
  };

  const weeklyPages = generateWeeklyPages();

  return (
    <div className="space-y-6">
      {/* Tambahkan style khusus print agar background color tetap muncul */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap gap-4 items-end justify-between">
         <div className="flex gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Mulai Tanggal</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="border p-2 rounded"/>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Sampai Tanggal</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="border p-2 rounded"/>
            </div>
         </div>
         <div className="text-right">
           <button onClick={()=>window.print()} className="bg-slate-800 text-white px-6 py-2 rounded flex items-center hover:bg-black">
             <Printer size={18} className="mr-2"/> Cetak Tabel Manual
           </button>
           <p className="text-[10px] text-slate-500 mt-1">*Otomatis membagi per Minggu (Minggu - Sabtu)</p>
         </div>
      </div>

      <div className="print:w-full">
         {weeklyPages.length > 0 ? weeklyPages.map((week, pageIdx) => (
           <div key={pageIdx} className="bg-white p-4 mb-8 rounded shadow print:shadow-none print:w-full print:p-0 print:mb-0" style={{ pageBreakAfter: 'always' }}>
              
              {/* KOP SURAT */}
              <div className="flex border-b-2 border-black pb-2 mb-2 items-center justify-center relative">
                  <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-12 absolute left-0" alt="logo"/>
                  <div className="text-center px-12">
                     {/* UPDATED: Parent Agency size increased (text-lg) */}
                     <h3 className="text-lg font-bold uppercase">{settings.parentAgency}</h3>
                     {/* UPDATED: OPD Name size increased (text-2xl) */}
                     <h1 className="text-2xl font-bold uppercase">{settings.opdName}</h1>
                     {/* UPDATED: Address size decreased (text-sm) */}
                     <p className="text-sm italic">{settings.address}</p>
                  </div>
              </div>

              {/* JUDUL PERIODE PER MINGGU */}
              <div className="text-center mb-4">
                <h2 className="text-base font-bold uppercase underline">DAFTAR HADIR / ABSENSI MANUAL</h2>
                <p className="font-bold text-xs uppercase">
                    PERIODE: {formatDateIndo(formatLocalDate(week.labelStart))} s/d {formatDateIndo(formatLocalDate(week.labelEnd))}
                </p>
              </div>

              <table className="w-full border-collapse border border-black text-[10px]">
                 <thead>
                    <tr className="bg-gray-200 print:bg-gray-100">
                       <th className="border border-black p-[2px] w-6" rowSpan="2">No</th>
                       {/* Header Nama / NIP */}
                       <th className="border border-black p-[2px] w-auto" rowSpan="2">Nama / NIP</th>
                       
                       <th className="border border-black p-[2px] w-12" rowSpan="2">Status</th>
                       
                       {/* Header Jabatan */}
                       <th className="border border-black p-[2px] w-24" rowSpan="2">Jabatan</th>

                       {/* Render Header Tanggal Sesuai Hari Kerja di Minggu Tersebut */}
                       {week.days.length > 0 ? week.days.map((d, i) => (
                          <th key={i} className="border border-black p-[2px]" colSpan="2">
                             {d.toLocaleDateString('id-ID', {weekday:'long'})}, {d.getDate()}/{d.getMonth()+1}
                          </th>
                       )) : (
                          <th className="border border-black p-[2px]" colSpan="10">Tidak ada hari kerja (Senin-Jumat) pada rentang ini</th>
                       )}
                       
                       <th className="border border-black p-[2px] w-8" rowSpan="2">Keterangan</th>
                    </tr>
                    <tr className="bg-gray-200 print:bg-gray-100 text-[8px] uppercase text-center">
                       {week.days.map((_, i) => (
                          <React.Fragment key={i}>
                             <th className="border border-black p-[2px] w-auto">Pagi</th>
                             <th className="border border-black p-[2px] w-auto">Sore</th>
                          </React.Fragment>
                       ))}
                    </tr>
                 </thead>
                 <tbody>
                    {sortedEmployees.map((emp, i) => (
                       <tr key={emp.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                          <td className="border border-black p-[2px] text-center align-middle">{emp.no || i+1}</td>
                          
                          <td className="border border-black p-[2px] whitespace-nowrap w-px align-middle">
                             {/* Nama - Font size text-xs (sama dengan TTD) */}
                             <div className="font-bold text-black text-xs leading-normal">
                                 {emp.nama}
                             </div>
                             {/* NIP - Font size text-xs */}
                             <div className="text-xs text-slate-800 leading-normal">
                                 NIP. {emp.nip || '-'}
                             </div>
                          </td>

                          {/* Status Pegawai */}
                          <td className="border border-black p-[2px] text-center align-middle font-bold text-[9px] uppercase">
                             {emp.statusPegawai || '-'}
                          </td>

                          {/* Jabatan (Wraps Text) */}
                          <td className="border border-black p-[2px] align-middle text-[10px] leading-tight whitespace-normal w-24">
                              {emp.jabatan}
                          </td>

                          {/* Render Kolom Absensi Kosong / Libur */}
                          {week.days.map((d, idx) => {
                             const isoDate = formatLocalDate(d);
                             const isHoliday = holidays.find(h => h.date === isoDate);
                             
                             if(isHoliday) {
                                return (
                                   // PERBAIKAN: Hapus print:bg-gray-300 dan ganti dengan print:bg-red-200
                                   <td key={idx} colSpan="2" className="border border-black p-[2px] text-center bg-red-200 print:bg-red-200">
                                   </td>
                                );
                             }
                             return (
                                <React.Fragment key={idx}>
                                   <td className="border border-black p-[2px]"></td>
                                   <td className="border border-black p-[2px]"></td>
                                </React.Fragment>
                             );
                          })}
                          
                          {/* Jika minggu ini tidak ada hari kerja */}
                          {week.days.length === 0 && <td colSpan="10" className="border border-black p-[2px] bg-gray-100"></td>}

                          <td className="border border-black p-[2px]"></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              
              <div className="mt-4 flex justify-between items-start text-xs break-inside-avoid">
                 <div className="max-w-[60%] text-left">
                    {(() => {
                        const pageHolidayList = [];
                        const start = week.labelStart; 
                        const end = week.labelEnd;
                        
                        holidays.forEach(h => {
                            const hDate = new Date(h.date);
                            if (hDate >= start && hDate <= end) {
                                pageHolidayList.push({ date: hDate, desc: h.desc });
                            }
                        });
                        
                        if (pageHolidayList.length > 0) {
                            return (
                                <>
                                    <p className="font-bold underline mb-1">Keterangan Hari Libur Nasional / Cuti Bersama</p>
                                    <ul className="list-none pl-0">
                                        {pageHolidayList.map((h, hIdx) => (
                                            <li key={hIdx} className="mb-0.5">
                                                <span className="font-bold">- {formatDateIndo(h.date.toISOString())}</span> : {h.desc}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            );
                        }
                        return null;
                    })()}
                 </div>

                 <div className="min-w-[200px] w-auto text-center px-4">
                    <p>Mengetahui,</p>
                    <p>{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                    <br/><br/><br/>
                    <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '__________________'}</p>
                    <p>NIP. {settings.kepalaNip || '..............................'}</p>
                 </div>
              </div>
           </div>
         )) : (
             <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded text-gray-500">
                 Silakan pilih rentang tanggal untuk mencetak absensi mingguan.
             </div>
         )}
      </div>
    </div>
  );
}