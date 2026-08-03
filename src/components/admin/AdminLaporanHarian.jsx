import React, { useState, useRef } from 'react';
import { Printer } from 'lucide-react';
import { getTodayString } from '../../utils/helpers';
import { getDailyStats, getApelRecapStats, getApelSheetRows } from '../../utils/statistics';
import useLampiranFotoHarian from '../../hooks/useLampiranFotoHarian';
import LampiranOptionsPanel from './LampiranOptionsPanel';
import LaporanHarianDocument from './LaporanHarianDocument';

// Halaman kontrol Laporan Harian (versi web): filter tanggal/sesi, pilihan
// model cetak (v1/v2), opsi TTD & lampiran, lalu menyerahkan seluruh badan
// dokumen ke LaporanHarianDocument. Logika lampiran foto (state + IndexedDB)
// diekstrak ke hook useLampiranFotoHarian supaya bisa dipakai ulang persis
// sama di versi admin-mobile & panel pegawai.
export default function AdminLaporanHarian({ employees, attendance, statusLocks = [], settings, holidays, isUserView = false }) {
  // --- FILTER TANGGAL & SESI ---
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => (new Date().getHours() >= 12 ? 'Sore' : 'Pagi'));

  // --- OPSI CETAK (hanya relevan untuk admin, disembunyikan di isUserView) ---
  const [printTemplate, setPrintTemplate] = useState('v2');
  const [showSignature, setShowSignature] = useState(true);
  const [showLampiranFoto, setShowLampiranFoto] = useState(false);
  const fotoInputRef = useRef(null);
  const { lampiranFotos, handleFotoChange, clearFotos } = useLampiranFotoHarian(date, session);

  // --- HARI LIBUR / WEEKEND ---
  const holidayData = holidays.find((h) => h.date === date);
  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
  const isNonEffective = isWeekend || !!holidayData;

  // --- DATA KEHADIRAN HARI INI (dikelompokkan & diurutkan untuk dokumen cetak) ---
  const { grouped, counts } = getDailyStats(date, session, employees, attendance, statusLocks, holidays);
  const hadirList = grouped.Hadir.sort((a, b) => (parseInt(a.no) || 99999) - (parseInt(b.no) || 99999));
  const sakitList = grouped.Sakit.sort((a, b) => a.nama.localeCompare(b.nama));
  const izinList = grouped.Izin.sort((a, b) => a.nama.localeCompare(b.nama));
  const cutiList = grouped.Cuti.sort((a, b) => a.nama.localeCompare(b.nama));
  const dlList = grouped['Dinas Luar'].sort((a, b) => a.nama.localeCompare(b.nama));
  const alpaList = grouped.Alpa.sort((a, b) => a.nama.localeCompare(b.nama));

  // Rekap ASN (format Daftar Hadir Apel) — dihitung dari KEDUA sesi, bukan
  // hanya sesi yang sedang dipilih, karena barisnya memisahkan apel pagi & sore.
  const apelRecap = getApelRecapStats(date, employees, attendance, statusLocks, holidays);
  const apelRows = getApelSheetRows(date, employees, attendance, statusLocks, holidays);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-bold block mb-1">Tanggal</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded" />
        </div>
        <div>
          <label className="text-xs font-bold block mb-1">Sesi</label>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="border p-2 rounded w-32">
            <option>Pagi</option>
            <option>Sore</option>
          </select>
        </div>

        {!isUserView && (
          <div className="flex gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Model Cetak</label>
              <select value={printTemplate} onChange={(e) => setPrintTemplate(e.target.value)} className="border p-2 rounded w-48 bg-yellow-50 border-yellow-300">
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

            {printTemplate === 'v1' && (
              <LampiranOptionsPanel
                showLampiranFoto={showLampiranFoto}
                onToggleLampiranFoto={setShowLampiranFoto}
                lampiranFotos={lampiranFotos}
                onPickFoto={handleFotoChange}
                onClearFoto={clearFotos}
                fotoInputRef={fotoInputRef}
              />
            )}
          </div>
        )}

        <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center ml-auto hover:bg-black">
          <Printer size={18} className="mr-2" /> Cetak Laporan
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
        apelRecap={apelRecap}
        apelRows={apelRows}
        hadirList={hadirList}
        sakitList={sakitList}
        izinList={izinList}
        cutiList={cutiList}
        dlList={dlList}
        alpaList={alpaList}
        showLampiranFoto={printTemplate === 'v1' && showLampiranFoto}
        lampiranFotos={lampiranFotos}
      />
    </div>
  );
}
