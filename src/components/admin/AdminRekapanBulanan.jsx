import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, Calendar, UserCheck, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// TAMBAHKAN fetchAttendanceByRange KE PROPS
export default function AdminRekapanBulanan({ employees, settings, user, holidays = [], fetchAttendanceByRange }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // State Data Laporan & Loading
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showSecretary, setShowSecretary] = useState(true);
  const [showLeader, setShowLeader] = useState(true);
  const [printOrientation, setPrintOrientation] = useState('landscape');

  const componentRef = useRef();

  // --- LOGIKA FETCH DATA OTOMATIS SAAT FILTER BERUBAH ---
  useEffect(() => {
    const loadReportData = async () => {
        if (!fetchAttendanceByRange) return;
        
        setIsLoading(true);
        // Hitung tanggal awal dan akhir bulan yang dipilih
        // Format YYYY-MM-DD
        const startStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${lastDay}`;

        // Ambil data dari Firebase
        const data = await fetchAttendanceByRange(startStr, endStr);
        setReportData(data);
        setIsLoading(false);
    };

    loadReportData();
  }, [selectedMonth, selectedYear, fetchAttendanceByRange]);

  // --- HELPER VARIABLES ---
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = new Date(selectedYear, selectedMonth).toLocaleString('id-ID', { month: 'long' });

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getAbsenceDate = (day) => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const secretary = employees.find(e => 
    e.jabatan && e.jabatan.toLowerCase().includes('sekretaris') && !e.jabatan.toLowerCase().includes('staf')
  );

  const getHolidayInfo = (dateStr) => {
    if (!holidays) return null;
    return holidays.find(h => h.date === dateStr);
  };

  // --- LOGIKA HITUNG STATISTIK (MENGGUNAKAN reportData) ---
  const getEmployeeStats = (empId) => {
    // Gunakan reportData, BUKAN attendance prop
    const empAttendance = reportData.filter(a => {
        const d = new Date(a.date);
        return a.userId === empId;
    });

    const countStatus = (statusKey) => {
        const uniqueDays = new Set(
            empAttendance.filter(a => a.status === statusKey).map(a => a.date)
        );
        return uniqueDays.size;
    };

    return {
        H: countStatus('Hadir'),
        S: countStatus('Sakit'),
        I: countStatus('Izin'),
        C: countStatus('Cuti'),
        DL: countStatus('Dinas Luar')
    };
  };

  // --- FUNGSI EXPORT EXCEL (FULL FORMAT) ---
  const handleExportExcel = async () => {
    if (isLoading) return alert("Mohon tunggu, data sedang dimuat...");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekapan Bulanan');

    const columns = [
        { header: '', key: 'no', width: 5 },
        { header: '', key: 'nama', width: 35 },
    ];
    daysArray.forEach(() => columns.push({ header: '', width: 4 }));
    ['H', 'S', 'I', 'C', 'DL'].forEach(() => columns.push({ header: '', width: 5 }));
    
    worksheet.columns = columns;
    const lastColIndex = 2 + daysInMonth + 5; 

    try {
        if (settings.logoUrl) {
            const response = await fetch(settings.logoUrl);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const imageId = workbook.addImage({ buffer: buffer, extension: 'png' });
            worksheet.addImage(imageId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 80, height: 80 } });
        }
    } catch (error) { console.warn("Gagal memuat logo:", error); }

    // Kop Surat & Header
    worksheet.mergeCells(1, 2, 1, lastColIndex);
    const row1 = worksheet.getCell(1, 2);
    row1.value = (settings.parentAgency || '').toUpperCase();
    row1.font = { name: 'Arial', size: 14, bold: true };
    row1.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(2, 2, 2, lastColIndex);
    const row2 = worksheet.getCell(2, 2);
    row2.value = (settings.opdName || '').toUpperCase();
    row2.font = { name: 'Arial', size: 16, bold: true };
    row2.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(3, 2, 3, lastColIndex);
    const row3 = worksheet.getCell(3, 2);
    row3.value = settings.address || '';
    row3.font = { name: 'Arial', size: 10, italic: true };
    row3.alignment = { vertical: 'middle', horizontal: 'center' };

    for(let c = 1; c <= lastColIndex; c++) {
        worksheet.getCell(4, c).border = { bottom: { style: 'double' } };
    }
    worksheet.addRow([]); 

    worksheet.mergeCells(6, 1, 6, lastColIndex);
    const row6 = worksheet.getCell(6, 1);
    row6.value = `REKAPITULASI ABSENSI PEGAWAI`;
    row6.font = { name: 'Arial', size: 12, bold: true, underline: true };
    row6.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(7, 1, 7, lastColIndex);
    const row7 = worksheet.getCell(7, 1);
    row7.value = `BULAN: ${monthName.toUpperCase()} ${selectedYear}`;
    row7.font = { name: 'Arial', size: 10, bold: true };
    row7.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]);

    const hRow = 9;
    worksheet.mergeCells(hRow, 1, hRow + 1, 1); worksheet.getCell(hRow, 1).value = "No";
    worksheet.mergeCells(hRow, 2, hRow + 1, 2); worksheet.getCell(hRow, 2).value = "Nama Pegawai / NIP";
    worksheet.mergeCells(hRow, 3, hRow, 2 + daysInMonth); worksheet.getCell(hRow, 3).value = "Tanggal";
    worksheet.mergeCells(hRow, 3 + daysInMonth, hRow, lastColIndex); worksheet.getCell(hRow, 3 + daysInMonth).value = "Total";

    daysArray.forEach((d, i) => {
        const cell = worksheet.getCell(hRow + 1, 3 + i);
        cell.value = d;
        cell.font = { size: 9, bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    ['H', 'S', 'I', 'C', 'DL'].forEach((lbl, i) => {
        const cell = worksheet.getCell(hRow + 1, 3 + daysInMonth + i);
        cell.value = lbl;
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        const colors = ['FFC6EFCE', 'FFFFEB9C', 'FFB3C6E7', 'FFE2C6E6', 'FFF7CBAC'];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[i] } };
    });

    [worksheet.getRow(hRow), worksheet.getRow(hRow + 1)].forEach(row => {
        row.font = { bold: true };
        row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Isi Data (Menggunakan reportData)
    const sortedEmployees = employees.filter(emp => emp.role === 'user').sort((a, b) => (parseInt(a.no) || 999) - (parseInt(b.no) || 999));
    let currentRow = 11;

    sortedEmployees.forEach((emp, idx) => {
        const row = worksheet.getRow(currentRow);
        row.height = 30;

        row.getCell(1).value = idx + 1;
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

        row.getCell(2).value = `${emp.nama}\n${emp.nip || '-'}`;
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        daysArray.forEach((day, dIdx) => {
            const dateStr = getAbsenceDate(day);
            const dayAtt = reportData.filter(a => a.userId === emp.id && a.date === dateStr); // Ganti attendance -> reportData
            const cell = row.getCell(3 + dIdx);
            const holiday = getHolidayInfo(dateStr);
            
            cell.alignment = { vertical: 'middle', horizontal: 'center' };

            const currDate = new Date(selectedYear, selectedMonth, day);
            const isWeekend = currDate.getDay() === 0 || currDate.getDay() === 6;

            if (holiday) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                if (dayAtt.length === 0) {
                    cell.value = holiday.description || 'Libur';
                    cell.alignment = { textRotation: 90, vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.font = { size: 8, color: { argb: 'FF9C0006' } };
                }
            } else if (isWeekend) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
            }

            if (dayAtt.length > 0) {
                const att = dayAtt.find(a => a.session === 'Pagi') || dayAtt[0];
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                
                if (att.status === 'Hadir') {
                    cell.value = '•';
                    cell.font = { size: 16, bold: true, color: { argb: 'FF008000' } };
                } else if (att.status === 'Sakit') {
                    cell.value = 'S';
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
                } else if (att.status === 'Izin') {
                    cell.value = 'I';
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3C6E7' } };
                } else if (att.status === 'Cuti') {
                    cell.value = 'C';
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2C6E6' } };
                } else if (att.status === 'Dinas Luar') {
                    cell.value = 'DL';
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7CBAC' } };
                }
            }
        });

        const stats = getEmployeeStats(emp.id);
        const startTotal = 3 + daysInMonth;
        row.getCell(startTotal).value = stats.H;
        row.getCell(startTotal+1).value = stats.S;
        row.getCell(startTotal+2).value = stats.I;
        row.getCell(startTotal+3).value = stats.C;
        row.getCell(startTotal+4).value = stats.DL;

        ['FFC6EFCE', 'FFFFEB9C', 'FFB3C6E7', 'FFE2C6E6', 'FFF7CBAC'].forEach((color, i) => {
            const cell = row.getCell(startTotal + i);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true };
        });

        currentRow++;
    });

    // Border & Tanda Tangan (Sama seperti sebelumnya)
    for(let r = hRow; r < currentRow; r++) {
        for(let c = 1; c <= lastColIndex; c++) {
            worksheet.getCell(r, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
    }

    const signRow = currentRow + 2;
    const rightStart = lastColIndex - 6;
    const rightEnd = lastColIndex;

    if (showSecretary) {
        worksheet.mergeCells(signRow, 2, signRow, 6);
        worksheet.getCell(signRow, 2).value = showLeader ? "Mengetahui," : "";
        worksheet.getCell(signRow, 2).alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 1, 2, signRow + 1, 6);
        const secJob = worksheet.getCell(signRow + 1, 2);
        secJob.value = (showLeader) ? (settings.kepalaJabatan || 'Kepala Dinas') : (secretary ? secretary.jabatan : '');
        secJob.font = { bold: true };
        secJob.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 6, 2, signRow + 6, 6);
        const secName = worksheet.getCell(signRow + 6, 2);
        secName.value = (showLeader) ? (settings.kepalaName) : (secretary ? secretary.nama : '');
        secName.font = { bold: true, underline: true };
        secName.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 7, 2, signRow + 7, 6);
        const secNip = worksheet.getCell(signRow + 7, 2);
        secNip.value = (showLeader) ? `NIP. ${settings.kepalaNip}` : (secretary ? `NIP. ${secretary.nip}` : '');
        secNip.alignment = { horizontal: 'center' };
    }

    if (showLeader || (!showLeader && showSecretary)) {
        worksheet.mergeCells(signRow, rightStart, signRow, rightEnd);
        const dateCell = worksheet.getCell(signRow, rightStart);
        dateCell.value = `${settings.titimangsa || 'Tempat'}, ${getFormattedDate()}`;
        dateCell.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 1, rightStart, signRow + 1, rightEnd);
        const leadJob = worksheet.getCell(signRow + 1, rightStart);
        if (showSecretary && showLeader) { leadJob.value = secretary ? secretary.jabatan : 'Sekretaris'; } 
        else { leadJob.value = settings.kepalaJabatan || 'Kepala Dinas'; }
        leadJob.font = { bold: true };
        leadJob.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 6, rightStart, signRow + 6, rightEnd);
        const leadName = worksheet.getCell(signRow + 6, rightStart);
        if (showSecretary && showLeader) { leadName.value = secretary ? secretary.nama : '................'; } 
        else { leadName.value = settings.kepalaName; }
        leadName.font = { bold: true, underline: true };
        leadName.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 7, rightStart, signRow + 7, rightEnd);
        const leadNip = worksheet.getCell(signRow + 7, rightStart);
        if (showSecretary && showLeader) { leadNip.value = secretary ? `NIP. ${secretary.nip}` : '................'; } 
        else { leadNip.value = `NIP. ${settings.kepalaNip}`; }
        leadNip.alignment = { horizontal: 'center' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Rekapan_Absensi_${selectedMonth + 1}_${selectedYear}.xlsx`);
  };

  const filteredEmployees = employees
    .filter(emp => emp.role === 'user')
    .sort((a, b) => (parseInt(a.no) || 999) - (parseInt(b.no) || 999));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
         @media print {
           @page { size: ${printOrientation}; margin: 10mm; }
           body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; }
           ::-webkit-scrollbar { display: none; }
           .print-clean { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; overflow: visible !important; }
           .overflow-auto { overflow: visible !important; }
           .print-hidden { display: none !important; }
         }
         .table-bordered th, .table-bordered td { border: 1px solid #000 !important; padding: 2px; }
         .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); white-space: nowrap; font-size: 8px; line-height: 1; margin: 0 auto; max-height: 28px; overflow: hidden; }
      `}</style>

      {/* PANEL KONTROL */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-4 print-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Calendar size={20} /></div>
                <div><h2 className="font-bold text-slate-800">Rekapan Bulanan</h2></div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                <select className="border p-2 rounded text-sm outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                </select>
                <select className="border p-2 rounded text-sm outline-none" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                    {Array.from({ length: 5 }, (_, i) => (
                        <option key={i} value={new Date().getFullYear() - 2 + i}>{new Date().getFullYear() - 2 + i}</option>
                    ))}
                </select>

                <select value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value)} className="border p-2 rounded text-sm outline-none">
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                </select>
                
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold hover:bg-slate-900 shadow-sm transition-transform hover:scale-105">
                    <Printer size={16} /> Cetak
                </button>
                
                <button onClick={handleExportExcel} disabled={isLoading} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 shadow-sm transition-transform hover:scale-105 disabled:bg-gray-400">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                    Excel Lengkap
                </button>
            </div>
        </div>

        <div className="border-t pt-4 flex gap-6 items-center bg-blue-50 p-3 rounded">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                <UserCheck size={18}/> <span>Opsi Tanda Tangan:</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                <input type="checkbox" checked={showSecretary} onChange={(e) => setShowSecretary(e.target.checked)} className="rounded text-blue-600"/> TTD Sekretaris
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                <input type="checkbox" checked={showLeader} onChange={(e) => setShowLeader(e.target.checked)} className="rounded text-blue-600"/> TTD Pimpinan
            </label>
        </div>
      </div>

      {/* AREA PREVIEW DOKUMEN */}
      <div className="bg-gray-100 p-4 rounded-lg overflow-auto flex justify-center print:bg-white print:p-0 print:m-0 print:block">
        <div className="bg-white p-8 shadow-lg w-[297mm] min-h-[210mm] text-slate-900 relative print-clean">
            
            {/* Kop & Judul */}
            <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
                <img src={settings.logoUrl} alt="Logo" className="h-20 w-auto absolute left-0 top-0 object-contain"/>
                <div className="w-full text-center px-24">
                    <h3 className="text-xl font-bold uppercase tracking-wide">{settings.parentAgency}</h3>
                    <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
                    <p className="text-sm italic">{settings.address}</p>
                </div>
            </div>
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4">REKAPITULASI ABSENSI PEGAWAI</h2>
                <p className="font-bold text-sm uppercase mt-1">
                    BULAN: {monthName.toUpperCase()} {selectedYear}
                </p>
                {isLoading && <p className="text-xs text-blue-500 animate-pulse mt-2">Sedang memuat data terbaru...</p>}
            </div>

            {/* Tabel (Menggunakan reportData) */}
            <table className="w-full text-[10px] border-collapse table-bordered text-center border border-black">
                <thead>
                    <tr className="bg-slate-200 print:bg-slate-200">
                        <th rowSpan="2" className="w-8 border border-black">No</th>
                        <th rowSpan="2" className="w-[1%] whitespace-nowrap px-2 border border-black">Nama Pegawai / NIP</th>
                        <th colSpan={daysInMonth} className="border border-black">Tanggal</th>
                        <th colSpan="5" className="bg-slate-300 print:bg-slate-300 border border-black">Total</th>
                    </tr>
                    <tr className="bg-slate-100 print:bg-slate-100">
                        {daysArray.map(d => <th key={d} className="w-6 border border-black">{d}</th>)}
                        <th className="w-8 bg-green-100 print:bg-green-100 border border-black">H</th>
                        <th className="w-8 bg-yellow-100 print:bg-yellow-100 border border-black">S</th>
                        <th className="w-8 bg-blue-100 print:bg-blue-100 border border-black">I</th>
                        <th className="w-8 bg-purple-100 print:bg-purple-100 border border-black">C</th>
                        <th className="w-8 bg-orange-100 print:bg-orange-100 border border-black">DL</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredEmployees.map((emp, index) => {
                        const stats = getEmployeeStats(emp.id); // Stat juga otomatis pakai reportData
                        return (
                            <tr key={emp.id} className="hover:bg-slate-50">
                                <td className="border border-black">{index + 1}</td>
                                <td className="text-left px-2 align-middle border border-black whitespace-nowrap">
                                    <div className="font-bold text-[10px]">{emp.nama}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">{emp.nip}</div>
                                </td>
                                {daysArray.map(day => {
                                    const dateStr = getAbsenceDate(day);
                                    // Gunakan reportData
                                    const dayAtt = reportData.filter(a => a.userId === emp.id && a.date === dateStr);
                                    const holiday = getHolidayInfo(dateStr);
                                    
                                    let content = '';
                                    let bgClass = '';
                                    let isHolidayCell = false;

                                    const currDate = new Date(selectedYear, selectedMonth, day);
                                    const isWeekend = currDate.getDay() === 0 || currDate.getDay() === 6;

                                    if (holiday) {
                                        bgClass = 'bg-red-200 print:bg-red-200';
                                        isHolidayCell = true;
                                        if (dayAtt.length === 0) {
                                            content = (
                                                <div className="h-full flex items-center justify-center overflow-hidden">
                                                    <div className="vertical-text text-red-800 font-bold leading-none tracking-tighter">
                                                        {holiday.description || 'Libur'}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    } else if (isWeekend) {
                                        bgClass = 'bg-slate-200 print:bg-slate-200';
                                    }

                                    if (dayAtt.length > 0) {
                                        const att = dayAtt.find(a => a.session === 'Pagi') || dayAtt[0];
                                        if(att.status === 'Hadir') { content = '•'; if(!isHolidayCell) bgClass = 'text-green-600 font-bold text-lg'; else content = <span className="text-green-800 font-bold text-lg">•</span>; }
                                        else if(att.status === 'Sakit') { content = 'S'; if(!isHolidayCell) bgClass = 'bg-yellow-100 font-bold text-yellow-700 print:bg-yellow-100'; }
                                        else if(att.status === 'Izin') { content = 'I'; if(!isHolidayCell) bgClass = 'bg-blue-100 font-bold text-blue-700 print:bg-blue-100'; }
                                        else if(att.status === 'Cuti') { content = 'C'; if(!isHolidayCell) bgClass = 'bg-purple-100 font-bold text-purple-700 print:bg-purple-100'; }
                                        else if(att.status === 'Dinas Luar') { content = 'DL'; if(!isHolidayCell) bgClass = 'bg-orange-100 font-bold text-orange-700 print:bg-orange-100'; }
                                    }

                                    return <td key={day} className={`border border-black p-0 h-8 ${bgClass}`}>{content}</td>;
                                })}
                                <td className="font-bold bg-green-50 print:bg-green-50 border border-black">{stats.H}</td>
                                <td className="font-bold bg-yellow-50 print:bg-yellow-50 border border-black">{stats.S}</td>
                                <td className="font-bold bg-blue-50 print:bg-blue-50 border border-black">{stats.I}</td>
                                <td className="font-bold bg-purple-50 print:bg-purple-50 border border-black">{stats.C}</td>
                                <td className="font-bold bg-orange-50 print:bg-orange-50 border border-black">{stats.DL}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Tanda Tangan */}
            <div className="mt-4 flex justify-between text-center leading-tight text-sm">
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
                   {showSecretary && showLeader && (
                       secretary ? (
                           <>
                               <p className="mb-20 font-bold">{secretary.jabatan}</p>
                               <p className="font-bold underline whitespace-nowrap">{secretary.nama}</p>
                               <p>NIP. {secretary.nip || '-'}</p>
                           </>
                       ) : <div className="mt-10 italic text-gray-400 text-sm">(Sekretaris tidak ditemukan)</div>
                   )}
                   {showSecretary && !showLeader && (
                       secretary ? (
                           <>
                               <p className="mb-20 font-bold">{secretary.jabatan}</p>
                               <p className="font-bold underline whitespace-nowrap">{secretary.nama}</p>
                               <p>NIP. {secretary.nip || '-'}</p>
                           </>
                       ) : <div className="mt-10 italic text-gray-400 text-sm">(Sekretaris tidak ditemukan)</div>
                   )}
                   {!showSecretary && showLeader && (
                       <>
                           <p className="mb-20 font-bold">{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                           <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
                           <p>NIP. {settings.kepalaNip || '..............................'}</p>
                       </>
                   )}
               </div>
            </div>

        </div>
      </div>
    </div>
  );
}