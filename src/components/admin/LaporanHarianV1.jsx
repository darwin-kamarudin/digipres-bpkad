import React from 'react';
import LaporanHarianSignature from './LaporanHarianSignature';

// 3 kelompok resmi status kepegawaian untuk rekap "Format Default" (v1),
// berurutan sesuai permintaan: 1. PNS, 2. PPPK, 3. PPPK PW.
const STATUS_GROUPS = [
  { key: 'PNS', label: 'PNS' },
  { key: 'PPPK', label: 'PPPK' },
  { key: 'PPPK PW', label: 'PPPK PW' },
];

// Kode keterangan — sama persis dengan dokumen Cetak Daftar Hadir Apel
const KODE_KETERANGAN = [
  { kode: 'S', label: 'Sakit' },
  { kode: 'DL', label: 'Dinas Luar' },
  { kode: 'TK', label: 'Tanpa Keterangan' },
  { kode: 'I', label: 'Izin' },
  { kode: 'C', label: 'Cuti' },
];

// Jam apel, mengikuti dokumen Cetak Daftar Hadir Apel
const JAM_APEL_PAGI = '08.00-08.15';
const JAM_APEL_SORE = '16.30-16.45';

// Baris uraian tabel rekapitulasi (baris 2 dst)
const URAIAN_KEYS = [
  { label: 'Hadir Apel Pagi', key: 'hadirPagi' },
  { label: 'Hadir Apel Sore', key: 'hadirSore' },
  { label: 'Sakit', key: 'sakit' },
  { label: 'Izin', key: 'izin' },
  { label: 'Dinas Luar', key: 'dl' },
  { label: 'Cuti', key: 'cuti' },
  { label: 'Tanpa Keterangan', key: 'tk', highlight: true },
];

// Isi satu sel "Tanda Tangan" — pada dokumen manual kolom ini ditandatangani,
// di laporan harian ini diisi status presensi yang TERCATAT pada sesi tersebut.
// Sumber pencatatan (mandiri/oleh admin) sengaja TIDAK ditulis: cukup statusnya.
const PresensiCell = ({ cell }) => {
  if (cell.status === 'Alpa') {
    return <span className="text-red-600 font-bold">TK</span>;
  }
  return <span className="font-bold">{cell.status}</span>;
};

// "Format Default" (v1) — SATU halaman: daftar hadir bergaya dokumen "Cetak
// Daftar Hadir Apel" (AdminCetakAbsensiApel.jsx) yang kolom tanda tangannya
// TIDAK kosong, melainkan sudah terisi status presensi tercatat + sumbernya,
// lalu keterangan kode dan tabel Rekapitulasi Kehadiran ASN. Dibungkus
// AutoFitA4Page oleh LaporanHarianDocument.jsx supaya selalu muat 1 halaman A4.
export default function LaporanHarianV1({
  settings, date, apelRecap, apelRows = [],
  showSignature,
}) {
  const recap = apelRecap || {};

  // Rincian "Jumlah ASN": 3 kelompok resmi, plus baris "Lainnya" HANYA bila ada
  // pegawai berstatus di luar ketiganya (mis. CPNS) supaya totalnya tetap
  // rekonsiliasi dengan Jumlah Pegawai keseluruhan.
  const asnRows = [
    ...STATUS_GROUPS.map((g) => ({ label: g.label, value: recap.jumlahAsn?.[g.key] ?? 0 })),
    ...(recap.jumlahLainnya > 0
      ? [{ label: 'Lainnya (CPNS/dst)', value: recap.jumlahLainnya }]
      : []),
  ];

  return (
    <div className="text-sm">
      {/* DAFTAR HADIR — struktur kolom identik dengan dokumen Cetak Daftar
          Hadir Apel; hanya isi kolom tanda tangannya yang sudah tercatat. */}
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-gray-100 text-center align-middle">
            <th className="border border-black p-1 w-8">No.</th>
            <th className="border border-black p-1 w-px whitespace-nowrap">Nama</th>
            <th className="border border-black p-1 w-px whitespace-nowrap">
              Jabatan
              <div className="italic font-normal text-[10px]">(Sesuai SK)</div>
            </th>
            <th className="border border-black p-1 w-auto">
              Tanda Tangan
              <div>Apel Pagi</div>
              <div className="font-normal text-[10px]">({JAM_APEL_PAGI})</div>
            </th>
            <th className="border border-black p-1 w-auto">
              Tanda Tangan
              <div>Apel Sore</div>
              <div className="font-normal text-[10px]">({JAM_APEL_SORE})</div>
            </th>
            <th className="border border-black p-1 w-20 whitespace-nowrap">Status</th>
            <th className="border border-black p-1 w-20 whitespace-nowrap">Ket.</th>
          </tr>
        </thead>
        <tbody>
          {apelRows.map((row, i) => (
            <tr key={row.emp.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <td className="border border-black p-1 text-center align-middle">{row.emp.no || i + 1}</td>
              <td className="border border-black p-1 align-middle w-px whitespace-nowrap font-bold">{row.emp.nama}</td>
              <td className="border border-black p-1 align-middle w-px whitespace-nowrap">{row.emp.jabatan}</td>
              <td className="border border-black p-1 align-middle text-center">
                <PresensiCell cell={row.pagi} />
              </td>
              <td className="border border-black p-1 align-middle text-center">
                <PresensiCell cell={row.sore} />
              </td>
              <td className="border border-black p-1 text-center align-middle uppercase text-[10px] font-bold w-20 whitespace-nowrap">
                {row.emp.statusPegawai || '-'}
              </td>
              <td className={`border border-black p-1 text-center align-middle font-bold w-20 ${row.ket === 'TK' ? 'text-red-600' : ''}`}>
                {row.ket}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* KETERANGAN KODE STATUS */}
      <div className="mt-3 text-xs break-inside-avoid">
        <p className="font-bold">Keterangan :</p>
        <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-0.5">
          {KODE_KETERANGAN.map((k) => (
            <span key={k.kode}>&bull; {k.kode} = {k.label}</span>
          ))}
        </div>
      </div>

      {/* REKAPITULASI KEHADIRAN ASN — kolom Jumlah terisi otomatis dari data
          absensi hari tersebut (pada dokumen manual kolom ini dikosongkan). */}
      <div className="mt-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <p className="font-bold uppercase text-left mb-1 text-xs">Rekapitulasi Kehadiran ASN</p>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th className="border border-black p-1 w-10">No.</th>
              <th className="border border-black p-1" colSpan={2}>Uraian</th>
              <th className="border border-black p-1 w-2/5">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {asnRows.map((row, idx) => (
              <tr key={row.label}>
                {idx === 0 && (
                  <>
                    <td className="border border-black p-1 text-center align-middle" rowSpan={asnRows.length}>1</td>
                    <td className="border border-black p-1 text-center align-middle font-bold" rowSpan={asnRows.length}>Jumlah ASN</td>
                  </>
                )}
                <td className="border border-black p-1 w-32">{row.label}</td>
                <td className="border border-black p-1">{row.value}</td>
              </tr>
            ))}
            {URAIAN_KEYS.map((row, idx) => (
              <tr key={row.key}>
                <td className="border border-black p-1 text-center align-middle">{idx + 2}</td>
                <td className="border border-black p-1" colSpan={2}>{row.label}</td>
                <td className={`border border-black p-1 ${row.highlight && (recap[row.key] ?? 0) > 0 ? 'font-bold text-red-600' : ''}`}>
                  {recap[row.key] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TTD HALAMAN 1. TTD Lampiran Foto (halaman 2) ditangani sendiri oleh
          LaporanHarianFotoLampiran.jsx. */}
      {showSignature && <LaporanHarianSignature settings={settings} date={date} showTitimangsa={false} />}
    </div>
  );
}
