import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock3 } from 'lucide-react';
import { getTodayString, formatDateIndo, isNonEffectiveDate } from '../../utils/helpers';
import { loadLastLocationPing } from '../../lib/localDb';
import { computeJamKerja } from '../../utils/jamKerja';
import MobileHeader from './MobileHeader';

// Kolom "Check": Pagi & Siang (checkin siang) dihitung "Masuk", Sore (checkout
// pulang) dihitung "Keluar" — sesuai definisi yang diminta untuk tabel riwayat ini.
const CHECK_LABEL = { Pagi: 'Masuk', Siang: 'Masuk', Sore: 'Keluar' };

const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function UserRiwayat({ user, attendance, settings, holidays = [] }) {
  const dateInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('online');
  const [filterDate, setFilterDate] = useState(getTodayString());
  const [lastPing, setLastPing] = useState(null);

  useEffect(() => {
    loadLastLocationPing(user.id).then((p) => { if (p) setLastPing(p); });
  }, [user.id]);

  // Jam Kerja dihitung dari SELURUH log tanggal terpilih (bukan hanya tab
  // online/offline yang sedang aktif) supaya konsisten dengan Beranda.
  const dayLogs = attendance.filter(l => l.userId === user.id && l.date === filterDate);
  const checkInLog = dayLogs.find(l => l.session === 'Pagi');
  const checkOutLog = dayLogs.find(l => l.session === 'Sore');
  const { value: jamKerja, note: jamKerjaNote } = computeJamKerja({ checkInLog, checkOutLog, lastPing, settings });
  const { isNonEffective, holiday } = isNonEffectiveDate(filterDate, holidays);

  // Tabel riwayat: seluruh histori SAMPAI DENGAN tanggal terpilih (bukan cuma
  // tanggal itu saja) supaya beberapa hari terakhir tampil sekaligus, terbaru di atas.
  const myLogs = attendance
    .filter(l => l.userId === user.id)
    .filter(l => l.date <= filterDate)
    .filter(l => activeTab === 'online' ? l.connectionStatus !== 'offline' : l.connectionStatus === 'offline')
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans safe-bottom">
      <MobileHeader title="Riwayat Absensi" />

      <div className="max-w-2xl w-full mx-auto p-4 pb-8">

        {/* TABS ONLINE/OFFLINE */}
        <div className="grid grid-cols-2 rounded-xl overflow-hidden shadow-sm mb-4">
          <button
            onClick={() => setActiveTab('online')}
            className={`p-3 font-bold text-sm transition-colors active:scale-95 ${activeTab === 'online' ? 'bg-amber-200 text-slate-800' : 'bg-red-700 text-white'}`}
          >
            Riwayat Online
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`p-3 font-bold text-sm transition-colors active:scale-95 ${activeTab === 'offline' ? 'bg-amber-200 text-slate-800' : 'bg-red-700 text-white'}`}
          >
            Riwayat Offline
          </button>
        </div>

        {/* FILTER TANGGAL */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-red-700 text-white text-center font-bold py-3 rounded-xl">
            Tanggal : {toDDMMYYYY(filterDate)}
          </div>
          <button
            onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
            className="bg-red-700 text-white p-3 rounded-xl flex-shrink-0 active:scale-95 transition-transform"
            aria-label="Pilih tanggal"
          >
            <Calendar size={22} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="hidden"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        {/* RINGKASAN JAM KERJA / LIBUR TANGGAL TERPILIH */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 text-red-700">
            <Clock3 size={20} />
          </div>
          <div className="min-w-0">
            {isNonEffective ? (
              <>
                <p className="font-bold text-slate-800">Hari Libur</p>
                <p className="text-xs text-slate-500">{formatDateIndo(filterDate)} — {holiday ? holiday.desc : 'Libur Akhir Pekan'}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-800">Jam Kerja: {jamKerja} jam</p>
                <p className="text-xs text-slate-500">{formatDateIndo(filterDate)}{jamKerjaNote ? ` — ${jamKerjaNote}` : ''}</p>
              </>
            )}
          </div>
        </div>

        {/* TABEL RIWAYAT ABSENSI */}
        {myLogs.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 italic shadow-sm">
            {isNonEffective ? (holiday ? holiday.desc : 'Libur akhir pekan — tidak ada absensi.') : 'Belum ada riwayat pada tanggal ini.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-red-800 shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="p-2.5 font-bold border border-red-800">Device</th>
                  <th className="p-2.5 font-bold border border-red-800">Tgl</th>
                  <th className="p-2.5 font-bold border border-red-800">Jam</th>
                  <th className="p-2.5 font-bold border border-red-800">WF</th>
                  <th className="p-2.5 font-bold border border-red-800">Check</th>
                </tr>
              </thead>
              <tbody>
                {myLogs.map((l) => (
                  <tr key={l.id} className="bg-white even:bg-slate-50">
                    <td className="p-2.5 text-center border border-slate-200 text-slate-700">{l.device || 'web'}</td>
                    <td className="p-2.5 text-center border border-slate-200 text-slate-700">{toDDMMYYYY(l.date)}</td>
                    <td className="p-2.5 text-center border border-slate-200 text-slate-700">
                      {l.timestamp ? new Date(l.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                    </td>
                    <td className="p-2.5 text-center border border-slate-200 text-slate-700">{l.workMode || 'WFO'}</td>
                    <td className="p-2.5 text-center border border-slate-200 font-semibold text-slate-700">{CHECK_LABEL[l.session] || l.session}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
