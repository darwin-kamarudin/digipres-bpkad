import React, { useState, useRef } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { getTodayString, formatDateIndo } from '../../utils/helpers';
import { getDailyStats } from '../../utils/statistics';
import LaporanHarianDocument from '../admin/LaporanHarianDocument';
import PinchZoomView from './PinchZoomView';
import { printDocumentNode } from '../../lib/printDocument';

// Versi mobile-native dari AdminLaporanHarian.jsx. Panel kontrol (tanggal,
// sesi, opsi cetak) dirombak jadi kartu bergaya aplikasi native; badan
// dokumen laporan (format resmi utk dicetak) TETAP dipakai dari komponen
// bersama LaporanHarianDocument agar hasil cetak identik dengan versi web.
export default function AdminMobileLaporanHarian({ employees, attendance, statusLocks = [], settings, holidays }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
    const h = new Date().getHours();
    return h >= 12 ? 'Sore' : 'Pagi';
  });
  const [printTemplate, setPrintTemplate] = useState('v2');
  const [showSignature, setShowSignature] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const docRef = useRef(null);

  const selectedDate = new Date(date);
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
  const holidayData = holidays.find(h => h.date === date);
  const isNonEffective = isWeekend || !!holidayData;

  const { grouped, counts } = getDailyStats(date, session, employees, attendance, statusLocks);

  const hadirList = grouped.Hadir.sort((a, b) => (parseInt(a.no) || 99999) - (parseInt(b.no) || 99999));
  const sakitList = grouped.Sakit.sort((a, b) => a.nama.localeCompare(b.nama));
  const izinList = grouped.Izin.sort((a, b) => a.nama.localeCompare(b.nama));
  const cutiList = grouped.Cuti.sort((a, b) => a.nama.localeCompare(b.nama));
  const dlList = grouped['Dinas Luar'].sort((a, b) => a.nama.localeCompare(b.nama));
  const alpaList = grouped.Alpa.sort((a, b) => a.nama.localeCompare(b.nama));

  const listTidakHadir = [
    ...grouped.Alpa.map(e => ({ ...e, status: 'Alpa (Tanpa Ket.)' })),
    ...grouped['Dinas Luar'].map(e => ({ ...e, status: 'Dinas Luar' })),
    ...grouped.Izin.map(e => ({ ...e, status: 'Izin' })),
    ...grouped.Sakit.map(e => ({ ...e, status: 'Sakit' })),
    ...grouped.Cuti.map(e => ({ ...e, status: 'Cuti' })),
  ];
  const statusPriority = { 'Alpa (Tanpa Ket.)': 1, 'Dinas Luar': 2, 'Izin': 3, 'Sakit': 4, 'Cuti': 5 };
  listTidakHadir.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));

  return (
    <div className="p-4 pb-24 space-y-4 font-sans print:p-0 print:pb-0">
      {/* PANEL KONTROL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 print:hidden">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Sesi</label>
            <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm">
              <option>Pagi</option>
              <option>Sore</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-500"
        >
          Opsi Cetak
          <ChevronDown size={16} className={`transition-transform ${showOptions ? 'rotate-180' : ''}`} />
        </button>

        {showOptions && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <select
              value={printTemplate}
              onChange={(e) => setPrintTemplate(e.target.value)}
              className="w-full p-2.5 border border-amber-300 bg-amber-50 rounded-xl outline-none text-sm font-bold"
            >
              <option value="v2">Format BKPSDMA</option>
              <option value="v1">Format Default</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={showSignature}
                onChange={(e) => setShowSignature(e.target.checked)}
                className="w-5 h-5 text-red-700 rounded border-gray-300 focus:ring-red-600"
              />
              TTD Pimpinan
            </label>
          </div>
        )}

        <button
          onClick={() => printDocumentNode(docRef.current, `Laporan Absensi Harian - ${formatDateIndo(date)}`)}
          className="w-full flex items-center justify-center gap-2 bg-red-700 active:bg-red-800 text-white p-3 rounded-xl font-bold"
        >
          <Printer size={18} /> Cetak Laporan
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-400 -mb-1 print:hidden">Cubit (pinch) untuk perbesar, geser untuk lihat detail. Ketuk dua kali untuk reset.</p>

      <PinchZoomView contentWidth={640}>
        <div ref={docRef}>
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
      </PinchZoomView>
    </div>
  );
}
