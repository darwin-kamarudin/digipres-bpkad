import React from 'react';
import { formatDateNoWeekday } from '../../utils/helpers';

// Blok tanda tangan bersama — dipakai oleh LaporanHarianV1 (tiap "halaman"
// Format Default punya TTD sendiri), LaporanHarianV2, dan kondisi hari libur
// di LaporanHarianDocument.jsx, supaya markup-nya tidak diduplikasi.
export default function LaporanHarianSignature({ settings, date }) {
  return (
    <div className="mt-4 flex justify-end text-center">
      <div className="min-w-[200px] w-auto px-4">
        <p className="mb-4">{settings.titimangsa || 'Bobong'}, {formatDateNoWeekday(date)}</p>

        <p>Mengetahui,</p>
        <p>{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>

        <br /><br /><br /><br />

        <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
        <p>NIP. {settings.kepalaNip || '..............................'}</p>
      </div>
    </div>
  );
}
