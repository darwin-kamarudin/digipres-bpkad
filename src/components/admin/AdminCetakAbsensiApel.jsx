import React, { useState } from 'react';
import { Printer, FileDown, Loader2 } from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../../utils/helpers';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Kode keterangan yang dipakai di kolom "Ket." pada tabel daftar hadir
const KODE_KETERANGAN = [
  { kode: 'S', label: 'Sakit' },
  { kode: 'DL', label: 'Dinas Luar' },
  { kode: 'TK', label: 'Tanpa Keterangan' },
  { kode: 'I', label: 'Izin' },
  { kode: 'C', label: 'Cuti' },
];

// Baris tabel rekapitulasi di bawah daftar hadir
const JENIS_ASN = ['PNS', 'PPPK', 'PPPK PW'];
const URAIAN_REKAP = [
  'Hadir Apel Pagi',
  'Hadir Apel Sore',
  'Sakit',
  'Izin',
  'Dinas Luar',
  'Cuti',
  'Tanpa Keterangan',
];

// Jam apel pada dokumen manual (bukan jam toleransi absensi digital di Pengaturan)
const JAM_APEL_PAGI = '08.00-08.15';
const JAM_APEL_SORE = '16.30-16.45';

// --- HELPER EKSPOR EXCEL ---
const THIN = { style: 'thin' };
const BOX_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// Logo default aplikasi berformat SVG, sedangkan Excel hanya menerima PNG/JPEG.
// Gambar digambar ulang ke <canvas> lalu diambil sebagai PNG supaya logo apa pun
// (SVG maupun PNG) tetap muncul di file hasil ekspor.
const loadLogoPngBuffer = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const size = 240;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Jaga rasio asli logo, diletakkan di tengah kanvas transparan
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Konversi logo gagal'));
        blob.arrayBuffer().then(resolve).catch(reject);
      }, 'image/png');
    } catch (err) { reject(err); }
  };
  img.onerror = () => reject(new Error('Logo tidak dapat dimuat'));
  img.src = url;
});

// Model cetak absensi manual "Apel Pagi / Apel Sore" (1 halaman = 1 hari).
// Berbeda dengan model mingguan (AdminCetakAbsensiManual) yang mencetak
// kolom tanggal Senin-Jumat dalam satu tabel landscape.
export default function AdminCetakAbsensiApel({ employees, settings }) {
  // Teks HARI/TANGGAL. Default KOSONG karena dokumen ini dicetak untuk diisi
  // tulis tangan; administrator boleh mengisinya bila ingin sudah tercetak.
  const [tanggalManual, setTanggalManual] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const labelTanggal = tanggalManual.trim();

  const sortedEmployees = [...employees].filter(e => e.role === 'user').sort((a, b) => {
    const noA = parseInt(a.no) || 99999;
    const noB = parseInt(b.no) || 99999;
    return noA - noB;
  });

  // === EKSPOR EXCEL (tata letak dibuat identik dengan dokumen cetak di layar) ===
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Daftar Hadir Apel', {
        pageSetup: {
          paperSize: 9,           // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
        },
      });

      // Lebar kolom mengikuti proporsi tabel di layar (A..G)
      ws.columns = [
        { width: 5 },   // A: No.
        { width: 28 },  // B: Nama
        { width: 32 },  // C: Jabatan
        { width: 18 },  // D: TTD Apel Pagi
        { width: 18 },  // E: TTD Apel Sore
        { width: 12 },  // F: Status
        { width: 12 },  // G: Ket.
      ];
      const LAST_COL = 7;

      // --- KOP SURAT (logo di kolom A, teks rata tengah B..G) ---
      try {
        const buffer = await loadLogoPngBuffer(settings.logoUrl || DEFAULT_LOGO_URL);
        const imageId = wb.addImage({ buffer, extension: 'png' });
        ws.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 64, height: 64 } });
      } catch (err) { console.warn('Gagal memuat logo untuk Excel:', err); }

      const kop = [
        { text: (settings.parentAgency || '').toUpperCase(), size: 11, bold: true, italic: false },
        { text: (settings.opdName || '').toUpperCase(), size: 14, bold: true, italic: false },
        { text: settings.address || '', size: 8, bold: false, italic: true },
      ];
      kop.forEach((item, idx) => {
        const r = idx + 1;
        ws.mergeCells(r, 2, r, LAST_COL);
        const cell = ws.getCell(r, 2);
        cell.value = item.text;
        cell.font = { name: 'Arial', size: item.size, bold: item.bold, italic: item.italic };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getRow(r).height = item.size + 8;
      });

      // Garis tebal penutup kop
      for (let c = 1; c <= LAST_COL; c++) {
        ws.getCell(4, c).border = { bottom: { style: 'medium' } };
      }
      ws.getRow(4).height = 6;

      // --- HARI / TANGGAL (rata kiri) ---
      ws.mergeCells(5, 1, 5, 4);
      const cellTgl = ws.getCell(5, 1);
      cellTgl.value = `HARI/TANGGAL : ${labelTanggal}`;
      cellTgl.font = { name: 'Arial', size: 11, bold: true };
      cellTgl.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.getRow(5).height = 22;

      // --- HEADER TABEL DAFTAR HADIR ---
      const HEADER_ROW = 6;
      const headers = [
        'No.',
        'Nama',
        'Jabatan\n(Sesuai SK)',
        `Tanda Tangan\nApel Pagi\n(${JAM_APEL_PAGI})`,
        `Tanda Tangan\nApel Sore\n(${JAM_APEL_SORE})`,
        'Status',
        'Ket.',
      ];
      headers.forEach((text, idx) => {
        const cell = ws.getCell(HEADER_ROW, idx + 1);
        cell.value = text;
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = BOX_BORDER;
      });
      ws.getRow(HEADER_ROW).height = 46;

      // --- BARIS PEGAWAI ---
      let r = HEADER_ROW + 1;
      sortedEmployees.forEach((emp, i) => {
        const nomor = emp.no || i + 1;
        const row = ws.getRow(r);
        row.height = 26;

        row.getCell(1).value = nomor;
        row.getCell(2).value = emp.nama;
        row.getCell(3).value = emp.jabatan || '';
        // Penanda nomor penandatangan di pojok kiri-atas kolom tanda tangan
        row.getCell(4).value = `${nomor}.`;
        row.getCell(5).value = `${nomor}.`;
        row.getCell(6).value = (emp.statusPegawai || '-').toUpperCase();
        row.getCell(7).value = '';

        for (let c = 1; c <= LAST_COL; c++) {
          const cell = row.getCell(c);
          cell.border = BOX_BORDER;
          cell.font = { name: 'Arial', size: 10, bold: c === 2 || c === 6 };
          if (c === 1) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          else if (c === 4 || c === 5) {
            cell.alignment = { vertical: 'top', horizontal: 'left' };
            cell.font = { name: 'Arial', size: 6 };
          } else if (c === 6) cell.alignment = { vertical: 'middle', horizontal: 'center' };
          else cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }
        r++;
      });

      // --- KETERANGAN KODE ---
      r += 1;
      ws.mergeCells(r, 1, r, LAST_COL);
      const cellKetJudul = ws.getCell(r, 1);
      cellKetJudul.value = 'Keterangan :';
      cellKetJudul.font = { name: 'Arial', size: 10, bold: true };
      r++;
      ws.mergeCells(r, 1, r, LAST_COL);
      const cellKet = ws.getCell(r, 1);
      cellKet.value = KODE_KETERANGAN.map(k => `• ${k.kode} = ${k.label}`).join('     ');
      cellKet.font = { name: 'Arial', size: 10 };
      cellKet.alignment = { vertical: 'middle', horizontal: 'left' };

      // --- REKAPITULASI KEHADIRAN ASN ---
      r += 2;
      ws.mergeCells(r, 1, r, LAST_COL);
      const cellJudulRekap = ws.getCell(r, 1);
      cellJudulRekap.value = 'REKAPITULASI KEHADIRAN ASN';
      cellJudulRekap.font = { name: 'Arial', size: 10, bold: true };
      cellJudulRekap.alignment = { vertical: 'middle', horizontal: 'left' };
      r++;

      // Header rekap: No. | Uraian (B:C) | Jumlah (D:G)
      const rekapHeaderRow = r;
      ws.getCell(r, 1).value = 'No.';
      ws.mergeCells(r, 2, r, 3);
      ws.getCell(r, 2).value = 'Uraian';
      ws.mergeCells(r, 4, r, LAST_COL);
      ws.getCell(r, 4).value = 'Jumlah';
      for (let c = 1; c <= LAST_COL; c++) {
        const cell = ws.getCell(r, c);
        cell.border = BOX_BORDER;
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
      r++;

      // Baris 1: Jumlah ASN (No. & label di-merge menurun, dirinci per jenis)
      const asnStartRow = r;
      ws.mergeCells(asnStartRow, 1, asnStartRow + JENIS_ASN.length - 1, 1);
      ws.getCell(asnStartRow, 1).value = 1;
      ws.mergeCells(asnStartRow, 2, asnStartRow + JENIS_ASN.length - 1, 2);
      ws.getCell(asnStartRow, 2).value = 'Jumlah ASN';
      JENIS_ASN.forEach((jenis, idx) => {
        const rowIdx = asnStartRow + idx;
        ws.getCell(rowIdx, 3).value = jenis;
        ws.mergeCells(rowIdx, 4, rowIdx, LAST_COL);
        ws.getCell(rowIdx, 4).value = '';
        for (let c = 1; c <= LAST_COL; c++) {
          const cell = ws.getCell(rowIdx, c);
          cell.border = BOX_BORDER;
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = {
            vertical: 'middle',
            horizontal: c === 1 || c === 2 ? 'center' : 'left',
          };
        }
        ws.getRow(rowIdx).height = 20;
      });
      r = asnStartRow + JENIS_ASN.length;

      // Baris 2 dst: uraian kehadiran
      URAIAN_REKAP.forEach((uraian, idx) => {
        ws.getCell(r, 1).value = idx + 2;
        ws.mergeCells(r, 2, r, 3);
        ws.getCell(r, 2).value = uraian;
        ws.mergeCells(r, 4, r, LAST_COL);
        ws.getCell(r, 4).value = '';
        for (let c = 1; c <= LAST_COL; c++) {
          const cell = ws.getCell(r, c);
          cell.border = BOX_BORDER;
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : 'left' };
        }
        ws.getRow(r).height = 20;
        r++;
      });

      // --- TANDA TANGAN PIMPINAN (rata kanan) ---
      r += 2;
      const ttd = [
        { text: 'Mengetahui,', bold: false, underline: false },
        { text: settings.kepalaJabatan || `Kepala ${settings.opdName}`, bold: false, underline: false },
        { text: '', bold: false, underline: false },
        { text: '', bold: false, underline: false },
        { text: '', bold: false, underline: false },
        { text: settings.kepalaName || '__________________', bold: true, underline: true },
        { text: `NIP. ${settings.kepalaNip || '..............................'}`, bold: false, underline: false },
      ];
      ttd.forEach(item => {
        ws.mergeCells(r, 4, r, LAST_COL);
        const cell = ws.getCell(r, 4);
        cell.value = item.text;
        cell.font = { name: 'Arial', size: 10, bold: item.bold, underline: item.underline };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getRow(r).height = 18;
        r++;
      });

      const namaFile = labelTanggal
        ? `Daftar_Hadir_Apel_${labelTanggal.replace(/[^\w]+/g, '_')}.xlsx`
        : 'Daftar_Hadir_Apel.xlsx';
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), namaFile);
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor ke Excel. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* PANEL KONTROL (tidak ikut tercetak) */}
      <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-xs font-bold block mb-1">Hari / Tanggal (opsional)</label>
            <input
              type="text"
              value={tanggalManual}
              onChange={e => setTanggalManual(e.target.value)}
              placeholder="Kosongkan untuk diisi tulis tangan"
              className="border p-2 rounded w-80"
            />
            <p className="text-[10px] text-slate-500 mt-1">*Dibiarkan kosong = dicetak polos untuk ditulis manual</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="bg-green-700 text-white px-5 py-2 rounded flex items-center hover:bg-green-800 disabled:opacity-60"
          >
            {isExporting
              ? <Loader2 size={18} className="mr-2 animate-spin" />
              : <FileDown size={18} className="mr-2" />}
            {isExporting ? 'Menyiapkan...' : 'Export Excel'}
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-800 text-white px-6 py-2 rounded flex items-center hover:bg-black"
          >
            <Printer size={18} className="mr-2" /> Cetak Daftar Hadir Apel
          </button>
        </div>
      </div>

      {/* DOKUMEN CETAK */}
      <div className="bg-white p-4 rounded shadow print:shadow-none print:w-full print:p-0">

        {/* KOP SURAT */}
        <div className="flex border-b-2 border-black pb-2 mb-3 items-center justify-center relative">
          <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-16 absolute left-0" alt="logo" />
          <div className="text-center px-16">
            {/* Instansi induk = text-sm (sama dengan HARI/TANGGAL),
                nama OPD naik 2 tingkat (text-sm -> base -> lg),
                alamat turun 2 tingkat (text-sm -> xs -> 10px) */}
            <h3 className="text-sm font-bold uppercase">{settings.parentAgency}</h3>
            <h1 className="text-lg font-bold uppercase">{settings.opdName}</h1>
            <p className="text-[10px] italic">{settings.address}</p>
          </div>
        </div>

        {/* HARI / TANGGAL (RATA KIRI) */}
        <div className="text-left mb-2">
          <p className="text-sm font-bold uppercase">HARI/TANGGAL : {labelTanggal}</p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-200 print:bg-gray-100 text-center align-middle">
              <th className="border border-black p-1 w-8">No.</th>
              {/* w-px + whitespace-nowrap = kolom autofit selebar isi terpanjang.
                  Hanya kolom Tanda Tangan (w-auto) yang menyerap sisa lebar halaman. */}
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
              {/* Status & Ket. sengaja dibuat sama lebar */}
              <th className="border border-black p-1 w-20 whitespace-nowrap">Status</th>
              <th className="border border-black p-1 w-20 whitespace-nowrap">Ket.</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.map((emp, i) => (
              <tr key={emp.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <td className="border border-black p-1 text-center align-middle">{emp.no || i + 1}</td>
                <td className="border border-black p-1 align-middle w-px whitespace-nowrap font-bold text-black">
                  {emp.nama}
                </td>
                <td className="border border-black p-1 align-middle w-px whitespace-nowrap">
                  {emp.jabatan}
                </td>
                {/* Kolom tanda tangan sengaja dikosongkan (diisi manual saat apel).
                    Angka kecil di pojok kiri-atas = penanda nomor urut penandatangan. */}
                <td className="border border-black p-1 h-8 w-auto align-top">
                  <span className="text-[8px] leading-none text-black">{emp.no || i + 1}.</span>
                </td>
                <td className="border border-black p-1 h-8 w-auto align-top">
                  <span className="text-[8px] leading-none text-black">{emp.no || i + 1}.</span>
                </td>
                <td className="border border-black p-1 text-center align-middle uppercase text-[10px] font-bold w-20 whitespace-nowrap">
                  {emp.statusPegawai || '-'}
                </td>
                <td className="border border-black p-1 w-20"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* KETERANGAN KODE STATUS */}
        <div className="mt-3 text-xs break-inside-avoid">
          <p className="font-bold">Keterangan :</p>
          <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-0.5">
            {KODE_KETERANGAN.map(k => (
              <span key={k.kode}>&bull; {k.kode} = {k.label}</span>
            ))}
          </div>
        </div>

        {/* REKAPITULASI KEHADIRAN ASN */}
        <div className="mt-4 text-xs break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <p className="font-bold uppercase text-left mb-1">REKAPITULASI KEHADIRAN ASN</p>
          <table className="border-collapse border border-black w-full">
            <thead>
              <tr className="bg-gray-200 print:bg-gray-100 text-center font-bold">
                <th className="border border-black p-1 w-10">No.</th>
                <th className="border border-black p-1" colSpan="2">Uraian</th>
                <th className="border border-black p-1 w-2/5">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {/* Baris 1: Jumlah ASN dirinci per jenis kepegawaian */}
              {JENIS_ASN.map((jenis, idx) => (
                <tr key={jenis}>
                  {idx === 0 && (
                    <>
                      <td className="border border-black p-1 text-center align-middle" rowSpan={JENIS_ASN.length}>1</td>
                      <td className="border border-black p-1 text-center align-middle" rowSpan={JENIS_ASN.length}>Jumlah ASN</td>
                    </>
                  )}
                  <td className="border border-black p-1 w-24">{jenis}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
              {/* Baris 2 dst: uraian kehadiran (kolom Jumlah diisi manual) */}
              {URAIAN_REKAP.map((uraian, idx) => (
                <tr key={uraian}>
                  <td className="border border-black p-1 text-center align-middle">{idx + 2}</td>
                  <td className="border border-black p-1" colSpan="2">{uraian}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TANDA TANGAN PIMPINAN */}
        <div className="mt-6 flex justify-end text-xs break-inside-avoid">
          <div className="min-w-[220px] w-auto text-center px-4">
            <p>Mengetahui,</p>
            <p>{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
            <br /><br /><br />
            <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '__________________'}</p>
            <p>NIP. {settings.kepalaNip || '..............................'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
