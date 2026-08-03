import React from 'react';
import { formatDateIndo } from '../../utils/helpers';
import LaporanHarianSignature from './LaporanHarianSignature';

// Halaman 2 (berdiri sendiri) khusus "Format Default" (v1): Foto Dokumentasi
// dipilih langsung saat cetak (tidak disimpan ke Firebase, hanya IndexedDB
// lokal — lihat useLampiranFotoHarian). object-contain (BUKAN object-cover)
// supaya foto tampil skala asli penuh, tidak terpotong/terkrop. Diekstrak
// keluar dari LaporanHarianV1 supaya halaman 1 bisa dibungkus AutoFitA4Page
// sendiri-sendiri dengan halaman ini (lihat LaporanHarianDocument.jsx — kelas
// page-break DAN pembungkus AutoFitA4Page diterapkan di situ, bukan di sini,
// supaya komponen ini tetap reusable terlepas dari "halaman keberapa" ia dipakai).
//
// Sesi (Pagi/Sore) TIDAK ditulis di sini: dokumen v1 sudah memuat apel pagi &
// sore sekaligus, jadi cukup hari/tanggalnya saja.
export default function LaporanHarianFotoLampiran({ settings, date, showSignature, lampiranFotos }) {
  return (
    <div>
      <h3 className="font-bold mb-1 text-sm uppercase underline text-center">Lampiran: Foto Dokumentasi</h3>
      <p className="font-medium text-center mb-3">Hari/Tanggal: {formatDateIndo(date)}</p>
      <div className="grid grid-cols-2 gap-4">
        {lampiranFotos.map((foto, i) => (
          <div key={i} className="border border-black p-2 flex items-center justify-center">
            <img src={foto} alt={`Dokumentasi ${i + 1}`} className="max-w-full max-h-[420px] w-auto h-auto object-contain" />
          </div>
        ))}
      </div>
      </div>
  );
}
