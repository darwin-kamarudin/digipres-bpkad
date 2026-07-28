import React from 'react';
import { AlertTriangle } from 'lucide-react';
import LaporanHarianKopJudul from './LaporanHarianKopJudul';
import LaporanHarianV1 from './LaporanHarianV1';
import LaporanHarianV2 from './LaporanHarianV2';
import LaporanHarianFotoLampiran from './LaporanHarianFotoLampiran';
import LaporanHarianSignature from './LaporanHarianSignature';
import AutoFitA4Page from './AutoFitA4Page';

// Badan dokumen Laporan Absensi Harian (kop surat, kondisi hari libur, lalu
// menyerahkan isi tabel ke LaporanHarianV1/LaporanHarianV2 sesuai model cetak
// terpilih). Diekstrak dari AdminLaporanHarian.jsx supaya bisa dipakai bersama
// oleh versi web dan versi mobile-native (AdminMobileLaporanHarian.jsx) tanpa
// duplikasi logika cetak/format dokumen resmi ini.
//
// KHUSUS "Format Default" (v1) pada hari efektif: kop surat + judul +
// LaporanHarianV1 (tabel rekapan + Lampiran Detail + TTD) dibungkus
// AutoFitA4Page supaya SELALU muat penuh dalam SATU halaman cetak A4 (lihat
// AutoFitA4Page.jsx). Lampiran Foto (kalau ada) SENGAJA ditempatkan di LUAR
// pembungkus itu sebagai halaman 2 tersendiri (page-break), supaya foto tetap
// tampil skala asli tanpa ikut disusutkan oleh perhitungan autofit halaman 1.
export default function LaporanHarianDocument({
  settings, date, session, isNonEffective, holidayData,
  printTemplate, showSignature, counts,
  hadirList, sakitList, izinList, cutiList, dlList, alpaList,
  showLampiranDetail = false, showLampiranFoto = false, lampiranFotos = [],
}) {
  const isAutoFitCase = printTemplate === 'v1' && !isNonEffective;

  const holidayNotice = (
    <div className="border-2 border-dashed border-red-400 bg-red-50 p-12 rounded-lg text-center my-8">
      <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-red-700 uppercase mb-2">
        {holidayData ? "INFORMASI HARI LIBUR NASIONAL / CUTI BERSAMA" : "HARI NON-EFEKTIF (LIBUR AKHIR PEKAN)"}
      </h3>
      <p className="text-lg font-medium text-slate-700">
        {holidayData ? `Keterangan: ${holidayData.desc}` : "Tidak Ada Data Absensi untuk Hari Minggu dan Hari Sabtu karena merupakan hari Non-Efektif."}
      </p>
      <p className="text-sm text-slate-500 mt-2 italic">(Sistem tidak mencatat absensi pada hari ini)</p>
    </div>
  );

  return (
    <div className="bg-white p-10 rounded shadow-lg print:bg-white print:shadow-none print:rounded-none print:w-full print:p-0">
      {isAutoFitCase ? (
        <AutoFitA4Page>
          <LaporanHarianKopJudul settings={settings} date={date} session={session} />
          <LaporanHarianV1
            settings={settings}
            date={date}
            counts={counts}
            hadirList={hadirList}
            sakitList={sakitList}
            izinList={izinList}
            cutiList={cutiList}
            dlList={dlList}
            alpaList={alpaList}
            showSignature={showSignature}
            showLampiranDetail={showLampiranDetail}
          />
        </AutoFitA4Page>
      ) : (
        <>
          <LaporanHarianKopJudul settings={settings} date={date} session={session} />
          {isNonEffective ? holidayNotice : (
            <LaporanHarianV2
              settings={settings}
              session={session}
              counts={counts}
              hadirList={hadirList}
              sakitList={sakitList}
              izinList={izinList}
              cutiList={cutiList}
              dlList={dlList}
              alpaList={alpaList}
            />
          )}
          {showSignature && <LaporanHarianSignature settings={settings} date={date} />}
        </>
      )}

      {isAutoFitCase && showLampiranFoto && lampiranFotos.length > 0 && (
        <AutoFitA4Page className="mt-8 print:break-before-page">
          <LaporanHarianFotoLampiran
            settings={settings}
            date={date}
            session={session}
            showSignature={showSignature}
            lampiranFotos={lampiranFotos}
          />
        </AutoFitA4Page>
      )}
    </div>
  );
}
