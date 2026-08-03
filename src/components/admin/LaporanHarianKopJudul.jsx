import React from 'react';
import { formatDateIndo, DEFAULT_LOGO_URL } from '../../utils/helpers';

// Kop surat + judul "Laporan Absensi Harian" — diekstrak supaya bisa dipakai
// ulang baik di alur normal (v2/hari libur) maupun di dalam AutoFitA4Page
// (v1 hari efektif, lihat LaporanHarianDocument.jsx) tanpa duplikasi markup.
//
// variant 'apel' (dipakai Format Default/v1): mengikuti dokumen Cetak Daftar
// Hadir Apel — TANPA judul dokumen, dan di bawah kop hanya baris HARI/TANGGAL
// rata kiri. Sesi tidak ditulis karena tabel v1 memuat apel pagi & sore sekaligus.
export default function LaporanHarianKopJudul({ settings, date, session, variant = 'default' }) {
  const isApel = variant === 'apel';
  return (
    <>
      <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
        <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0" alt="Logo" />
        <div className="text-center px-20">
          <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
          <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
          <p className="text-sm italic">{settings.address}</p>
        </div>
      </div>

      {isApel ? (
        <div className="text-left mb-2">
          <p className="text-sm font-bold uppercase">HARI/TANGGAL : {formatDateIndo(date)}</p>
        </div>
      ) : (
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold underline uppercase">Laporan Absensi Harian</h2>
          <p className="font-medium">Hari/Tanggal: {formatDateIndo(date)} - Sesi {session}</p>
        </div>
      )}
    </>
  );
}
