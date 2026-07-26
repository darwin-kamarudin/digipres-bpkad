import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { DEFAULT_LOGO_URL, isNonEffectiveDate } from '../../utils/helpers';
import { getYearlyStats } from '../../utils/statistics';
import MobileHeader from './MobileHeader';
import UserCetakBottomNav from './UserCetakBottomNav';
import PinchZoomView from '../shared/PinchZoomView';
import { printDocumentNode } from '../../lib/printDocument';

// Tab "Rekapan Tahunan" pada panel cetak pegawai — rekapitulasi 1 tahun
// penuh untuk pegawai yang sedang login (tanpa pilihan pegawai lain, beda
// dengan versi admin yang bisa memilih pegawai mana pun). Data tahunan
// diambil langsung dari Firestore lewat fetchAttendanceByRange karena state
// `attendance` global hanya menyimpan data bulan berjalan.
export default function UserRekapanTahunan({ user, employees = [], settings, holidays = [], fetchAttendanceByRange }) {
  const navigate = useNavigate();
  const docRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const startYear = 2024;
  const yearsList = [];
  for (let y = startYear; y <= currentYear + 1; y++) yearsList.push(y);

  const [year, setYear] = useState(currentYear.toString());
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSecretary, setShowSecretary] = useState(true);
  const [showLeader, setShowLeader] = useState(true);

  useEffect(() => {
    let active = true;
    const loadYearlyData = async () => {
      if (!fetchAttendanceByRange) return;
      setIsLoading(true);
      const data = await fetchAttendanceByRange(`${year}-01-01`, `${year}-12-31`);
      if (active) {
        setReportData(data);
        setIsLoading(false);
      }
    };
    loadYearlyData();
    return () => { active = false; };
  }, [year, fetchAttendanceByRange]);

  const secretary = employees.find(e =>
    e.jabatan && e.jabatan.toLowerCase().includes('sekretaris') && !e.jabatan.toLowerCase().includes('staf')
  );

  // reportData sudah hasil fetchAttendanceByRange (sudah tergabung kunci status),
  // jadi statusLocks dibiarkan kosong di sini agar tidak dobel (lihat catatan di statistics.js).
  const yearlyData = getYearlyStats(year, reportData, user.id, [], holidays);

  const yearCalendarStats = (() => {
    let effektif = 0, nonEfektif = 0;
    for (let m = 1; m <= 12; m++) {
      const lastDay = new Date(Number(year), m, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (isNonEffectiveDate(dateStr, holidays).isNonEffective) nonEfektif++; else effektif++;
      }
    }
    return { effektif, nonEfektif };
  })();

  // CATATAN: stats.Hadir/DL/Sakit/Izin/Cuti/alpa SEMUANYA dihitung PER SESI (Pagi &
  // Sore terpisah), jadi 1 hari penuh menyumbang 2 (Pagi+Sore). Supaya SATUAN "hari"
  // konsisten di seluruh catatan (Efektif MAUPUN Non-Efektif), jumlah sesi mentah
  // untuk KEDUA sisi dibagi 2 di sini — bukan hanya Total Efektif.
  const totalAlpaSesiTahun = yearlyData.reduce((acc, m) => acc + m.alpa.p + m.alpa.s, 0);
  const totalIzinSesiTahun = yearlyData.reduce((acc, m) => acc + m.stats.Izin.p + m.stats.Izin.s, 0);
  const totalSakitSesiTahun = yearlyData.reduce((acc, m) => acc + m.stats.Sakit.p + m.stats.Sakit.s, 0);
  const totalCutiSesiTahun = yearlyData.reduce((acc, m) => acc + m.stats.Cuti.p + m.stats.Cuti.s, 0);
  const totalHadirSesiTahun = yearlyData.reduce((acc, m) => acc + m.totalEfektif, 0);

  const totalEfektifKinerja = Math.round((totalHadirSesiTahun / 2) * 10) / 10;
  const totalAlpaTahun = Math.round((totalAlpaSesiTahun / 2) * 10) / 10;
  const totalIzinTahun = Math.round((totalIzinSesiTahun / 2) * 10) / 10;
  const totalSakitTahun = Math.round((totalSakitSesiTahun / 2) * 10) / 10;
  const totalCutiTahun = Math.round((totalCutiSesiTahun / 2) * 10) / 10;
  // Dibagi dari total sesi gabungan (bukan menjumlahkan hasil bagi per kategori yang
  // sudah dibulatkan) supaya tidak ada selisih pembulatan ganda.
  const totalNonEfektifSesiTahun = totalAlpaSesiTahun + totalIzinSesiTahun + totalSakitSesiTahun + totalCutiSesiTahun;
  const totalNonEfektifKinerja = Math.round((totalNonEfektifSesiTahun / 2) * 10) / 10;

  const getFormattedDate = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-full bg-slate-50 pb-20 print:pb-0">
      <MobileHeader title="Rekapan Tahunan" onBack={() => navigate('/')} />

      <div className="space-y-6 animate-in fade-in duration-300 p-4">
        {/* CONTROLS (Non-Print) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 print:hidden">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Tahun</label>
            <select value={year} onChange={e => setYear(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white focus:ring-2 focus:ring-red-600">
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-500">Opsi Tanda Tangan</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 select-none">
                <input type="checkbox" checked={showSecretary} onChange={(e) => setShowSecretary(e.target.checked)} className="w-5 h-5 text-red-700 rounded border-gray-300 focus:ring-red-600" />
                TTD Sekretaris
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 select-none">
                <input type="checkbox" checked={showLeader} onChange={(e) => setShowLeader(e.target.checked)} className="w-5 h-5 text-red-700 rounded border-gray-300 focus:ring-red-600" />
                TTD Pimpinan
              </label>
            </div>
          </div>

          <button
            onClick={() => printDocumentNode(docRef.current, `Rekapan Tahunan - ${user.nama} - ${year}`)}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-700 active:bg-red-800 disabled:bg-slate-300 text-white p-3 rounded-xl font-bold"
          >
            <Printer size={18} /> {isLoading ? 'Memuat Data...' : 'Cetak Rekapan'}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 print:hidden">Cubit (pinch) untuk perbesar, geser untuk lihat detail. Ketuk dua kali untuk reset.</p>

        <PinchZoomView contentWidth={960}>
          <div ref={docRef} className="bg-white p-8 rounded shadow print:shadow-none print:w-full">

            {/* KOP SURAT */}
            <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
              <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0" alt="logo" />
              <div className="text-center px-20">
                <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
                <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
                <p className="text-sm italic">{settings.address}</p>
              </div>
            </div>

            {/* JUDUL */}
            <div className="text-center pb-4 mb-6">
              <h3 className="text-xl font-bold underline uppercase">REKAPITULASI ABSENSI TAHUNAN</h3>
              <p className="uppercase font-medium">PERIODE TAHUN: {year}</p>
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

            {/* TABEL DATA 12 BULAN */}
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-slate-100 print:bg-transparent">
                  <th className="border border-black p-1 align-middle w-10" rowSpan="2">No</th>
                  <th className="border border-black p-1 align-middle text-left w-[1%] whitespace-nowrap" rowSpan="2">Bulan</th>
                  <th className="border border-black p-1 text-center" colSpan="2">Hadir</th>
                  <th className="border border-black p-1 text-center" colSpan="2">DL</th>
                  <th className="border border-black p-1 text-center" colSpan="2">Sakit</th>
                  <th className="border border-black p-1 text-center" colSpan="2">Izin</th>
                  <th className="border border-black p-1 text-center" colSpan="2">Cuti</th>
                  <th className="border border-black p-1 text-center" colSpan="2">Alpa</th>
                  <th className="border border-black p-1 text-center w-16" rowSpan="2">Total Hadir</th>
                </tr>
                <tr className="bg-slate-50 print:bg-transparent text-[10px] uppercase text-center">
                  <th className="border border-black p-0.5 bg-green-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-green-100 print:bg-transparent">Sore</th>
                  <th className="border border-black p-0.5 bg-orange-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-orange-100 print:bg-transparent">Sore</th>
                  <th className="border border-black p-0.5 bg-yellow-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-yellow-100 print:bg-transparent">Sore</th>
                  <th className="border border-black p-0.5 bg-blue-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-blue-100 print:bg-transparent">Sore</th>
                  <th className="border border-black p-0.5 bg-purple-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-purple-100 print:bg-transparent">Sore</th>
                  <th className="border border-black p-0.5 bg-red-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-red-100 print:bg-transparent">Sore</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((data, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1 text-center">{i + 1}</td>
                    <td className="border border-black p-1 font-bold whitespace-nowrap">{data.monthName}</td>
                    <td className="border border-black p-1 text-center bg-green-50 print:bg-transparent">{data.stats.Hadir.p}</td><td className="border border-black p-1 text-center bg-green-100 print:bg-transparent">{data.stats.Hadir.s}</td>
                    <td className="border border-black p-1 text-center bg-orange-50 print:bg-transparent">{data.stats['Dinas Luar'].p}</td><td className="border border-black p-1 text-center bg-orange-100 print:bg-transparent">{data.stats['Dinas Luar'].s}</td>
                    <td className="border border-black p-1 text-center bg-yellow-50 print:bg-transparent">{data.stats.Sakit.p}</td><td className="border border-black p-1 text-center bg-yellow-100 print:bg-transparent">{data.stats.Sakit.s}</td>
                    <td className="border border-black p-1 text-center bg-blue-50 print:bg-transparent">{data.stats.Izin.p}</td><td className="border border-black p-1 text-center bg-blue-100 print:bg-transparent">{data.stats.Izin.s}</td>
                    <td className="border border-black p-1 text-center bg-purple-50 print:bg-transparent">{data.stats.Cuti.p}</td><td className="border border-black p-1 text-center bg-purple-100 print:bg-transparent">{data.stats.Cuti.s}</td>
                    <td className="border border-black p-1 text-center font-bold bg-red-50 print:bg-transparent">{data.alpa.p}</td><td className="border border-black p-1 text-center font-bold bg-red-100 print:bg-transparent">{data.alpa.s}</td>
                    <td className="border border-black p-1 text-center font-bold bg-slate-100 print:bg-transparent">{data.totalEfektif}</td>
                  </tr>
                ))}
                <tr className="bg-gray-200 print:bg-gray-100 font-bold border-t-2 border-black">
                  <td colSpan="2" className="border border-black p-1 text-right pr-4">TOTAL TAHUNAN</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Hadir.p, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Hadir.s, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats['Dinas Luar'].p, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats['Dinas Luar'].s, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Sakit.p, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Sakit.s, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Izin.p, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Izin.s, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Cuti.p, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Cuti.s, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.alpa.p, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.alpa.s, 0)}</td>
                  <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.totalEfektif, 0)}</td>
                </tr>
              </tbody>
            </table>

            {/* CATATAN RINGKASAN TAHUN */}
            <div className="mt-4 mb-6 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 print:bg-transparent space-y-1.5">
              <p>
                <b>Total Hari Efektif Tahun {year}:</b> {yearCalendarStats.effektif + yearCalendarStats.nonEfektif} hari kalender &minus; {yearCalendarStats.nonEfektif} hari non-efektif (Sabtu/Minggu/hari libur) = <b>{yearCalendarStats.effektif} hari efektif (hari kerja).</b>
              </p>
              <p>
                <b>Rekap Kinerja:</b> Total Efektif Kinerja = <b>{totalEfektifKinerja} hari</b> (Hadir/Dinas Luar) &middot; Total Non-Efektif Kinerja = <b>{totalNonEfektifKinerja} hari</b> (Alpa: {totalAlpaTahun}, Izin: {totalIzinTahun}, Sakit: {totalSakitTahun}, Cuti: {totalCutiTahun}).
              </p>
            </div>

            {/* BAGIAN TANDA TANGAN — mengikuti pola 4 kondisi yang sama dengan Rekapan Bulanan */}
            <div className="mt-4 flex justify-between text-center text-sm break-inside-avoid">
              {showSecretary && showLeader && (
                <div className="min-w-[200px] w-auto px-4 mt-4">
                  <p>Mengetahui,</p>
                  <p className="mb-20 font-bold">{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                  <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
                  <p>NIP. {settings.kepalaNip || '..............................'}</p>
                </div>
              )}

              {!(showSecretary && showLeader) && <div></div>}

              <div className="min-w-[200px] w-auto px-4">
                <p className="mb-4">{settings.titimangsa || 'Bobong'}, {getFormattedDate()}</p>

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
                ) : showLeader ? (
                  <>
                    <p className="mb-20 font-bold">{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                    <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
                    <p>NIP. {settings.kepalaNip || '..............................'}</p>
                  </>
                ) : (
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

      <UserCetakBottomNav />
    </div>
  );
}
