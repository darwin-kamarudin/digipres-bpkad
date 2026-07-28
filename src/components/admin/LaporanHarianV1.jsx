import React from 'react';
import LaporanHarianSignature from './LaporanHarianSignature';

// 3 kelompok resmi status kepegawaian untuk rekap "Format Default" (v1),
// berurutan sesuai permintaan: 1. PNS, 2. PPPK, 3. PPPK PW.
const STATUS_GROUPS = [
  { key: 'PNS', label: 'PNS' },
  { key: 'PPPK', label: 'PPPK' },
  { key: 'PPPK PW', label: 'PPPK PW' },
];

// Baris metrik "Lampiran Detail" (2-7), berurutan sesuai permintaan.
const DETAIL_ROWS = [
  { key: 'hadir', label: 'Hadir' },
  { key: 'izin', label: 'Izin' },
  { key: 'sakit', label: 'Sakit' },
  { key: 'tk', label: 'TK' },
  { key: 'dl', label: 'DL' },
  { key: 'cuti', label: 'Cuti' },
];

// Rekap per kelompok status kepegawaian, dihitung dari 6 bucket kehadiran yang
// SUDAH mempartisi seluruh pegawai tepat ke satu bucket per hari itu (Hadir/
// Sakit/Izin/Cuti/Dinas Luar/Alpa) — jadi cukup difilter per statusPegawai
// tanpa perlu prop `employees` terpisah. Pegawai dengan status di luar 3
// kelompok resmi (mis. CPNS) dikumpulkan ke kelompok "Lainnya" supaya total
// tetap rekonsiliasi dengan Jumlah Pegawai keseluruhan (tidak ada yang
// "hilang"). Dipakai BERSAMA oleh tabel ringkasan maupun Lampiran Detail — di
// sini disimpan sebagai daftar pegawai lengkap (bukan cuma angka) supaya bisa
// dipakai untuk kebutuhan keduanya.
const buildStatusGroups = (hadirList, izinList, sakitList, alpaList, dlList, cutiList) => {
  const filterKey = (list, key) => list.filter((e) => (e.statusPegawai || 'PNS') === key);

  const groups = STATUS_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    hadir: filterKey(hadirList, g.key),
    izin: filterKey(izinList, g.key),
    sakit: filterKey(sakitList, g.key),
    tk: filterKey(alpaList, g.key),
    dl: filterKey(dlList, g.key),
    cuti: filterKey(cutiList, g.key),
  }));

  const knownKeys = STATUS_GROUPS.map((g) => g.key);
  const isOther = (e) => !knownKeys.includes(e.statusPegawai || 'PNS');
  const otherGroup = {
    key: 'LAINNYA', label: 'Lainnya (CPNS/dst)',
    hadir: hadirList.filter(isOther),
    izin: izinList.filter(isOther),
    sakit: sakitList.filter(isOther),
    tk: alpaList.filter(isOther),
    dl: dlList.filter(isOther),
    cuti: cutiList.filter(isOther),
  };
  const hasOther = DETAIL_ROWS.some((r) => otherGroup[r.key].length > 0);

  return hasOther ? [...groups, otherGroup] : groups;
};

const groupTotalCount = (g) => DETAIL_ROWS.reduce((acc, r) => acc + g[r.key].length, 0);

// Pecah daftar nama jadi 3 kolom sejajar (bernomor lanjut), supaya hemat ruang
// cetak dibanding 1 kolom panjang ke bawah. Dirender sebagai <table>
// (table-layout AUTO, BUKAN dipaksa fixed) supaya kolom benar-benar "autofit"
// mengikuti nama terpanjang — nama TIDAK pernah dipotong/di-ellipsis.
// Konsekuensinya: kalau nama pegawai panjang, tabel ini (dan Lampiran Detail
// secara keseluruhan) bisa jadi LEBIH LEBAR dari kop surat/tabel rekapan di
// atasnya — ini SENGAJA dibiarkan terjadi, karena AutoFitA4Page.jsx yang
// membungkus semuanya-lah yang bertanggung jawab menyamakan lebar (kop surat
// & tabel rekapan lain memakai w-full, otomatis mengikuti lebar akhir yang
// ditentukan oleh Lampiran Detail sebagai elemen terlebar), BUKAN dengan
// memotong nama di sini.
const ThreeColumnNameList = ({ list, highlightRed = false }) => {
  if (list.length === 0) return <span className="italic text-gray-500">- Nihil -</span>;
  const size = Math.ceil(list.length / 3);
  const columns = [list.slice(0, size), list.slice(size, size * 2), list.slice(size * 2)];
  return (
    <table className="border-collapse">
      <tbody>
        <tr>
          {columns.map((col, ci) => (
            col.length > 0 && (
              <td key={ci} className="align-top pr-5">
                <ol className="list-decimal list-inside pl-1 m-0" start={ci * size + 1}>
                  {col.map((emp) => (
                    <li key={emp.id} className={`whitespace-nowrap font-medium ${highlightRed ? 'text-red-600' : 'text-slate-800'}`}>
                      {emp.nama}
                    </li>
                  ))}
                </ol>
              </td>
            )
          ))}
        </tr>
      </tbody>
    </table>
  );
};

// "Format Default" (v1) — HALAMAN 1 SAJA: tabel rekap per kelompok status
// kepegawaian (PNS/PPPK/PPPK PW) + Lampiran Detail + TTD. Dibungkus
// AutoFitA4Page oleh LaporanHarianDocument.jsx supaya selalu muat 1 halaman
// A4. Halaman 2 (Lampiran Foto) SENGAJA dipisah ke komponen tersendiri
// (LaporanHarianFotoLampiran.jsx) supaya tidak ikut terukur/tersusutkan oleh
// AutoFitA4Page — foto dokumentasi tetap tampil skala asli di halamannya sendiri.
export default function LaporanHarianV1({
  settings, date, counts,
  hadirList, sakitList, izinList, cutiList, dlList, alpaList,
  showSignature,
  showLampiranDetail,
}) {
  const groupRows = buildStatusGroups(hadirList, izinList, sakitList, alpaList, dlList, cutiList);
  const groupTotal = (field) => groupRows.reduce((acc, r) => acc + r[field].length, 0);

  return (
    <div className="text-sm">
      <div className="flex justify-between items-center border-2 border-black px-4 py-2 mb-4 font-bold uppercase bg-gray-50">
        <span>Jumlah Pegawai (Keseluruhan)</span>
        <span>{counts.TotalPegawai} Orang</span>
      </div>

      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left" rowSpan={2}>Kelompok Pegawai</th>
            <th className="border border-black p-2" rowSpan={2}>Jumlah</th>
            <th className="border border-black p-2" colSpan={6}>Jenis Laporan</th>
          </tr>
          <tr className="bg-gray-100">
            <th className="border border-black p-2">Hadir</th>
            <th className="border border-black p-2">Izin</th>
            <th className="border border-black p-2">Sakit</th>
            <th className="border border-black p-2">TK</th>
            <th className="border border-black p-2">DL</th>
            <th className="border border-black p-2">Cuti</th>
          </tr>
        </thead>
        <tbody>
          {groupRows.map((g, i) => (
            <tr key={g.key}>
              <td className="border border-black p-2 font-bold">{i + 1}. {g.label}</td>
              <td className="border border-black p-2 text-center font-bold">{groupTotalCount(g)} Orang</td>
              <td className="border border-black p-2 text-center">{g.hadir.length}</td>
              <td className="border border-black p-2 text-center">{g.izin.length}</td>
              <td className="border border-black p-2 text-center">{g.sakit.length}</td>
              <td className={`border border-black p-2 text-center ${g.tk.length > 0 ? 'font-bold text-red-600' : ''}`}>{g.tk.length}</td>
              <td className="border border-black p-2 text-center">{g.dl.length}</td>
              <td className="border border-black p-2 text-center">{g.cuti.length}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-black p-2">Total</td>
            <td className="border border-black p-2 text-center">{groupTotal('hadir') + groupTotal('izin') + groupTotal('sakit') + groupTotal('tk') + groupTotal('dl') + groupTotal('cuti')} Orang</td>
            <td className="border border-black p-2 text-center">{groupTotal('hadir')}</td>
            <td className="border border-black p-2 text-center">{groupTotal('izin')}</td>
            <td className="border border-black p-2 text-center">{groupTotal('sakit')}</td>
            <td className="border border-black p-2 text-center">{groupTotal('tk')}</td>
            <td className="border border-black p-2 text-center">{groupTotal('dl')}</td>
            <td className="border border-black p-2 text-center">{groupTotal('cuti')}</td>
          </tr>
        </tbody>
      </table>

      {/* LAMPIRAN DETAIL: rincian nama pegawai per kelompok status kepegawaian
          — TETAP di halaman 1, langsung di bawah tabel rekapan di atas (bukan
          halaman terpisah). Baris status yang NIHIL (tidak ada pegawai
          tercatat) DIHILANGKAN dari tabel untuk menghemat ruang cetak — lihat
          catatan Keterangan di bawah tabel untuk penjelasannya. */}
      {showLampiranDetail && (() => {
        // Per kelompok, hanya sisakan baris status yang benar-benar punya data
        // (list.length > 0). Kalau SEMUA baris di kelompok itu nihil, tetap
        // tampilkan 1 baris "Nihil" supaya kelompoknya tidak kosong melompong.
        const visibleGroups = groupRows.map((g) => ({
          ...g,
          rows: DETAIL_ROWS.filter((row) => g[row.key].length > 0),
        }));
        const anyRowHidden = groupRows.some((g) => DETAIL_ROWS.some((row) => g[row.key].length === 0));

        return (
          <div className="mt-6">
            <h3 className="font-bold mb-3 text-sm uppercase underline text-center">Lampiran Detail — Status Presensi Pegawai</h3>
            <table className="w-full border-collapse border border-black text-sm">
              <tbody>
                {visibleGroups.map((g, gi) => (
                  <React.Fragment key={g.key}>
                    <tr className="bg-gray-200">
                      <td colSpan={2} className="border border-black p-2 font-bold uppercase">{gi + 1}. {g.label}</td>
                    </tr>
                    {g.rows.length > 0 ? (
                      g.rows.map((row) => (
                        <tr key={row.key}>
                          <td className="border border-black p-2 font-bold align-top w-32">{row.label}</td>
                          <td className="border border-black p-2 align-top">
                            <ThreeColumnNameList list={g[row.key]} highlightRed={row.key === 'tk'} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="border border-black p-2 italic text-gray-500 text-center">- Nihil -</td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {anyRowHidden && (
              <div className="mt-3 border border-black rounded p-3 text-xs bg-gray-50">
                <p className="font-bold mb-1">Keterangan:</p>
                <p className="text-gray-700">
                  Baris jenis laporan status presensi yang tidak ditampilkan menandakan tidak ada pegawai tercatat pada status presensi tersebut.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* TTD HALAMAN 1: khusus untuk halaman tabel rekapan + lampiran detail di
          atas. TTD Lampiran Foto (halaman 2) ditangani sendiri oleh
          LaporanHarianFotoLampiran.jsx. */}
      {showSignature && <LaporanHarianSignature settings={settings} date={date} />}
    </div>
  );
}
