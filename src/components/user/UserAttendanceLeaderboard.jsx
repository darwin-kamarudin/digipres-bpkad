import React, { useState, useEffect } from 'react';
import { Trophy, Sunrise, Sunset, Clock3, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatLocalDate } from '../../utils/helpers';
import { getAttendanceLeaderboard } from '../../utils/statistics';
import UserStatistikBottomNav from './UserStatistikBottomNav';

const TOP_COUNT = 10;

const RANK_BADGE = {
  0: 'bg-amber-400 text-white',
  1: 'bg-slate-300 text-slate-700',
  2: 'bg-orange-400 text-white',
};

// Rentang tanggal untuk filter terpilih, SELALU relatif ke hari ini (bukan
// pemilihan minggu/bulan/tahun bebas) — sesuai maksud papan peringkat yang
// menampilkan performa kehadiran periode BERJALAN.
const getRangeForFilter = (filter) => {
  const today = new Date();
  if (filter === 'minggu') {
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Senin=1..Minggu=7
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: formatLocalDate(monday), end: formatLocalDate(sunday) };
  }
  if (filter === 'tahun') {
    const y = today.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  // bulan (default)
  const y = today.getFullYear();
  const m = today.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return { start: formatLocalDate(new Date(y, m, 1)), end: formatLocalDate(new Date(y, m, lastDay)) };
};

// Papan Peringkat Kehadiran — leaderboard pegawai berdasarkan persentase
// kehadiran (Pagi/Sore) & rata-rata jam kerja aktif, KHUSUS ditampilkan di
// panel pegawai (bukan di AttendanceStatsView bersama, supaya tidak ikut
// bocor ke dashboard admin-mobile). Default tampil 10 teratas, bisa
// diperluas ke seluruh pegawai lewat tombol "Lihat Semua Peringkat".
// Filter periode (Minggu/Bulan/Tahun) memakai bottom nav mengambang, gaya
// sama seperti panel Cetak (UserCetakBottomNav).
export default function UserAttendanceLeaderboard({ employees = [], holidays = [], fetchAttendanceByRange }) {
  const [filter, setFilter] = useState('bulan');
  const [board, setBoard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!fetchAttendanceByRange) return;
      setIsLoading(true);
      const { start, end } = getRangeForFilter(filter);
      const data = await fetchAttendanceByRange(start, end);
      if (!active) return;
      setBoard(getAttendanceLeaderboard(start, end, employees, data, holidays));
      setIsLoading(false);
    };
    load();
    return () => { active = false; };
  }, [filter, employees, holidays, fetchAttendanceByRange]);

  useEffect(() => { setShowAll(false); }, [filter]);

  const visibleBoard = showAll ? board : board.slice(0, TOP_COUNT);
  const hasMore = board.length > TOP_COUNT;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mt-5">
        {/* HEADER */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-700 flex items-center justify-center text-white flex-shrink-0">
            <Trophy size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm text-slate-800 leading-tight">Papan Peringkat Kehadiran</h3>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {showAll ? `Seluruh Pegawai (${board.length})` : `Top ${Math.min(TOP_COUNT, board.length)} Pegawai`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-8">
            <Loader2 size={16} className="animate-spin" /> Memuat peringkat...
          </div>
        ) : board.length === 0 ? (
          <div className="text-center text-sm text-slate-400 italic py-8">
            Belum ada data kehadiran pada periode ini.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {visibleBoard.map((row, idx) => (
                <div key={row.emp.id} className="flex items-center gap-3 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] flex-shrink-0 ${RANK_BADGE[idx] || 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-slate-800 truncate">{row.emp.nama}</p>
                      <p className="font-black text-sm text-red-700 flex-shrink-0">{row.percentage}%</p>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 mb-1.5">
                      <div className="h-full bg-red-700 rounded-full transition-all" style={{ width: `${row.percentage}%` }} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1"><Sunrise size={11} /> Pagi {row.pagiPercent}%</span>
                      <span className="flex items-center gap-1"><Sunset size={11} /> Sore {row.sorePercent}%</span>
                      <span className="flex items-center gap-1"><Clock3 size={11} /> {row.avgJamKerja} jam</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 pt-3 mt-1 border-t border-slate-100 active:bg-slate-50"
              >
                {showAll ? <>Tampilkan {TOP_COUNT} Teratas <ChevronUp size={14} /></> : <>Lihat Semua Peringkat ({board.length}) <ChevronDown size={14} /></>}
              </button>
            )}
          </>
        )}
      </div>

      <UserStatistikBottomNav filter={filter} onFilterChange={setFilter} />
    </>
  );
}
