import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import { isNativePlatform } from '../../lib/geolocation';

// Konversi mm -> px CSS pada referensi 96dpi — inilah satuan yang dipakai
// browser (Blink/Chromium, termasuk WebView Capacitor) untuk me-layout HTML
// baik di layar maupun saat merender halaman cetak, terlepas dari DPI fisik
// printer sesungguhnya.
const MM_TO_PX = 96 / 25.4;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;

// Memaksa konten yang dibungkus (mis. Laporan Harian halaman 1: kop surat +
// tabel rekapan + Lampiran Detail + TTD) selalu MUAT PENUH dalam SATU halaman
// cetak A4 portrait — dengan cara mengukur ukuran ASLI konten lalu
// menyusutkannya (scale <= 1, TIDAK PERNAH diperbesar) memakai CSS transform
// kalau ternyata lebih besar dari ruang yang tersedia (297mm x 210mm dikurangi
// margin cetak `marginMm` di tiap sisi — default 10mm, SAMA dengan
// `@page { margin: 10mm }` di PrintStyles.jsx supaya perhitungannya akurat
// terhadap margin cetak sesungguhnya).
//
// HANYA aktif di aplikasi native (Capacitor) — lihat isNativePlatform(). Di
// web (browser), dialog cetak browser SUDAH punya kontrol skala/"fit to page"
// manual sendiri, jadi memaksa scale di sini di web hanya akan membuat
// PREVIEW LAYAR ikut menyusut tanpa perlu — mengganggu tampilan biasa tanpa
// manfaat nyata. printDocumentNode (native) TIDAK punya dialog cetak
// interaktif seperti itu, makanya autofit paksa ini penting justru di sana.
//
// KENAPA LEBAR JUGA DISUSUTKAN (bukan cuma tinggi): Lampiran Detail sengaja
// TIDAK memotong/meng-ellipsis nama pegawai yang panjang (lihat
// ThreeColumnNameList di LaporanHarianV1.jsx) — kalau nama panjang, tabel itu
// boleh melebar secara alami (table-layout auto). Elemen lain (kop surat,
// tabel rekapan) memakai w-full sehingga OTOMATIS ikut lebar akhir yang
// ditentukan Lampiran Detail sebagai elemen terlebar (`width: 'fit-content'`
// di sini membuat pembungkus ini menciut/melebar mengikuti anak-anaknya).
// Supaya hasil akhirnya tetap 100% muat di kertas A4 walau lebar aslinya jadi
// lebih besar dari 210mm, scale dihitung dari YANG PALING KECIL antara
// skala-muat-lebar dan skala-muat-tinggi (letterbox fit standar) — jadi nama
// pegawai TETAP UTUH (tidak terpotong), tapi seluruh dokumen (kop, tabel,
// TTD) ikut menyusut proporsional bersama-sama supaya semuanya tetap seragam
// lebarnya DAN tetap 100% muat di satu halaman A4.
//
// `transform: scale()` HANYA mengubah tampilan visual (paint), bukan ukuran
// layout box elemen yang di-observe (`innerRef`) — jadi ResizeObserver di sini
// tidak akan terpicu ulang oleh scale yang kita terapkan sendiri (aman dari
// infinite loop), hanya bereaksi kalau KONTEN di dalamnya benar-benar berubah
// ukuran (mis. jumlah pegawai berubah). `overflow: hidden` WAJIB ada di
// pembungkus luar — tanpa ini, sisa konten yang "kelebihan" tetap ter-paint di
// luar batas kotak yang sudah disusutkan tinggi/lebarnya, TUMPANG TINDIH
// dengan elemen berikutnya.
//
// Scale & lebar disimpan sebagai inline style pada DOM sungguhan, jadi ikut
// terbawa oleh printDocumentNode (native Capacitor, yang mengambil
// node.outerHTML apa adanya) — preview di layar (setelah zoom-fit PinchZoomView
// sendiri) sudah mencerminkan persis tata letak hasil cetak.
export default function AutoFitA4Page({ children, marginMm = 10, className }) {
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const active = isNativePlatform();

  const measure = useCallback(() => {
    if (!active) return;
    const el = innerRef.current;
    if (!el) return;
    const width = el.scrollWidth;
    const height = el.scrollHeight;
    const availableWidthPx = (A4_WIDTH_MM - marginMm * 2) * MM_TO_PX;
    const availableHeightPx = (A4_HEIGHT_MM - marginMm * 2) * MM_TO_PX;
    const scaleX = width > availableWidthPx ? availableWidthPx / width : 1;
    const scaleY = height > availableHeightPx ? availableHeightPx / height : 1;
    setNaturalSize({ width, height });
    setScale(Math.min(scaleX, scaleY, 1));
  }, [marginMm, active]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, active]);

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        ...(scale < 1 ? { height: Math.ceil(naturalSize.height * scale), width: Math.ceil(naturalSize.width * scale) } : undefined),
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: 'fit-content',
          ...(scale < 1 ? { transform: `scale(${scale})`, transformOrigin: 'top left' } : undefined),
        }}
      >
        {children}
      </div>
    </div>
  );
}
