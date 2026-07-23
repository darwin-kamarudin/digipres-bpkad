import React, { useState, useEffect, useRef } from 'react';
import { Printer, FileDown, Search, X, ChevronDown, UserCheck, Loader2 } from 'lucide-react';
import { DEFAULT_LOGO_URL } from '../../utils/helpers';
import { getYearlyStats } from '../../utils/statistics';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// TAMBAHKAN fetchAttendanceByRange KE PROPS
export default function AdminRekapanTahunan({ employees, settings, user, fetchAttendanceByRange }) {
  const startYear = 2024;
  const currentYear = new Date().getFullYear();
  const yearsList = [];
  for (let y = startYear; y <= currentYear + 5; y++) {
      yearsList.push(y);
  }

  const [year, setYear] = useState(currentYear.toString());
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // State Data Report
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [showSecretary, setShowSecretary] = useState(true);
  const [showLeader, setShowLeader] = useState(true);
  const [printOrientation, setPrintOrientation] = useState('landscape');

  const isUserMode = user && user.role === 'user';

  useEffect(() => {
      if (isUserMode) {
         setSelectedUserId(user.id);
      }
  }, [isUserMode, user]);

  // --- LOGIKA FETCH DATA TAHUNAN ---
  useEffect(() => {
      const loadYearlyData = async () => {
          if (!fetchAttendanceByRange) return;
          setIsLoading(true);
          const startStr = `${year}-01-01`;
          const endStr = `${year}-12-31`;
          const data = await fetchAttendanceByRange(startStr, endStr);
          setReportData(data);
          setIsLoading(false);
      };
      loadYearlyData();
  }, [year, fetchAttendanceByRange]);

  const sortedEmployees = employees.filter(e => e.role === 'user').sort((a, b) => (parseInt(a.no) || 999) - (parseInt(b.no) || 999));
  const filteredEmployees = sortedEmployees.filter(emp => 
    emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.nip && emp.nip.includes(searchTerm)) ||
    (emp.no && emp.no.toString().includes(searchTerm))
  );

  const selectedEmployee = sortedEmployees.find(e => e.id === selectedUserId);
  const secretary = employees.find(e => e.jabatan && e.jabatan.toLowerCase().includes('sekretaris') && !e.jabatan.toLowerCase().includes('staf'));

  // Gunakan reportData untuk statistik, bukan global attendance
  const yearlyData = selectedEmployee ? getYearlyStats(year, reportData, selectedUserId) : [];

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        if (selectedEmployee && !isUserMode) { 
            setSearchTerm(`${selectedEmployee.no}. ${selectedEmployee.nama}`);
        } else if (!selectedEmployee) {
            setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedEmployee, isUserMode]);

  const handleSelectEmployee = (emp) => {
      setSelectedUserId(emp.id);
      setSearchTerm(`${emp.no}. ${emp.nama}`);
      setIsDropdownOpen(false);
  };

  const handleClearSelection = () => {
      setSelectedUserId('');
      setSearchTerm('');
      setIsDropdownOpen(true);
  };

  const handleExportExcel = async () => {
    if (!selectedEmployee) return alert("Pilih pegawai terlebih dahulu");
    if (isLoading) return alert("Data sedang dimuat...");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekapan Tahunan');

    const columns = [
        { header: '', width: 5 },
        { header: '', width: 20 },
    ];
    for(let i=0; i<11; i++) columns.push({ header: '', width: 8 });
    
    worksheet.columns = columns;
    const lastColIndex = 13;

    try {
        if (settings.logoUrl) {
            const response = await fetch(settings.logoUrl);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const imageId = workbook.addImage({ buffer: buffer, extension: 'png' });
            worksheet.addImage(imageId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 80, height: 80 } });
        }
    } catch (error) { console.warn("Gagal memuat logo:", error); }

    // Kop Surat & Judul (Sama)
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
    row6.value = `REKAPITULASI ABSENSI TAHUNAN`;
    row6.font = { name: 'Arial', size: 12, bold: true, underline: true };
    row6.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(7, 1, 7, lastColIndex);
    const row7 = worksheet.getCell(7, 1);
    row7.value = `PERIODE TAHUN: ${year}`;
    row7.font = { name: 'Arial', size: 10, bold: true };
    row7.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]);

    const infoRowStart = 9;
    worksheet.mergeCells(infoRowStart, 1, infoRowStart, 2);
    worksheet.getCell(infoRowStart, 1).value = `Nama Pegawai : ${selectedEmployee.nama}`;
    worksheet.getCell(infoRowStart, 1).font = { bold: true };
    worksheet.mergeCells(infoRowStart, 8, infoRowStart, 10);
    worksheet.getCell(infoRowStart, 8).value = `Status : ${selectedEmployee.statusPegawai || '-'}`;
    worksheet.getCell(infoRowStart, 8).font = { bold: true };
    worksheet.mergeCells(infoRowStart + 1, 1, infoRowStart + 1, 2);
    worksheet.getCell(infoRowStart + 1, 1).value = `NIP : ${selectedEmployee.nip || '-'}`;
    worksheet.getCell(infoRowStart + 1, 1).font = { bold: true };
    worksheet.mergeCells(infoRowStart + 1, 8, infoRowStart + 1, 10);
    worksheet.getCell(infoRowStart + 1, 8).value = `Jabatan : ${selectedEmployee.jabatan || '-'}`;
    worksheet.getCell(infoRowStart + 1, 8).font = { bold: true };

    worksheet.addRow([]);

    const hRow = 12;
    const subHRow = 13;
    worksheet.mergeCells(hRow, 1, subHRow, 1); worksheet.getCell(hRow, 1).value = "No";
    worksheet.mergeCells(hRow, 2, subHRow, 2); worksheet.getCell(hRow, 2).value = "Bulan";
    
    const categories = ['Hadir', 'Sakit', 'Izin', 'Cuti', 'DL'];
    categories.forEach((cat, idx) => {
        const startCol = 3 + (idx * 2);
        worksheet.mergeCells(hRow, startCol, hRow, startCol + 1);
        worksheet.getCell(hRow, startCol).value = cat;
    });
    worksheet.mergeCells(hRow, 13, subHRow, 13); worksheet.getCell(hRow, 13).value = "Total";

    const colors = ['FFC6EFCE', 'FFFFEB9C', 'FFB3C6E7', 'FFE2C6E6', 'FFF7CBAC'];
    for (let i = 0; i < 5; i++) {
        const startCol = 3 + (i * 2);
        const cellP = worksheet.getCell(subHRow, startCol);
        cellP.value = "Pagi"; 
        cellP.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[i] } };
        const cellS = worksheet.getCell(subHRow, startCol + 1);
        cellS.value = "Sore"; 
        cellS.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[i] } };
    }

    for (let r = hRow; r <= subHRow; r++) {
        for (let c = 1; c <= lastColIndex; c++) {
            const cell = worksheet.getCell(r, c);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true };
            if (!cell.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        }
    }

    let currentRow = 14;
    yearlyData.forEach((data, idx) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = data.monthName;
        const stats = data.stats;
        row.getCell(3).value = stats.Hadir.p;
        row.getCell(4).value = stats.Hadir.s;
        row.getCell(5).value = stats.Sakit.p;
        row.getCell(6).value = stats.Sakit.s;
        row.getCell(7).value = stats.Izin.p;
        row.getCell(8).value = stats.Izin.s;
        row.getCell(9).value = stats.Cuti.p;
        row.getCell(10).value = stats.Cuti.s;
        row.getCell(11).value = stats['Dinas Luar'].p;
        row.getCell(12).value = stats['Dinas Luar'].s;
        row.getCell(13).value = data.totalHadir;

        for(let c=1; c<=lastColIndex; c++) {
            const cell = row.getCell(c);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if(c === 2) cell.alignment = { vertical: 'middle', horizontal: 'left' };
            if(c === 13) {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            }
        }
        currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 2);
    totalRow.getCell(1).value = "TOTAL TAHUNAN";
    totalRow.getCell(1).alignment = { horizontal: 'right' };
    totalRow.getCell(1).font = { bold: true };

    const sums = [
        yearlyData.reduce((a, b) => a + b.stats.Hadir.p, 0),
        yearlyData.reduce((a, b) => a + b.stats.Hadir.s, 0),
        yearlyData.reduce((a, b) => a + b.stats.Sakit.p, 0),
        yearlyData.reduce((a, b) => a + b.stats.Sakit.s, 0),
        yearlyData.reduce((a, b) => a + b.stats.Izin.p, 0),
        yearlyData.reduce((a, b) => a + b.stats.Izin.s, 0),
        yearlyData.reduce((a, b) => a + b.stats.Cuti.p, 0),
        yearlyData.reduce((a, b) => a + b.stats.Cuti.s, 0),
        yearlyData.reduce((a, b) => a + b.stats['Dinas Luar'].p, 0),
        yearlyData.reduce((a, b) => a + b.stats['Dinas Luar'].s, 0),
        yearlyData.reduce((a, b) => a + b.totalHadir, 0)
    ];

    sums.forEach((sum, idx) => {
        const cell = totalRow.getCell(3 + idx);
        cell.value = sum;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    for(let c=1; c<=lastColIndex; c++) {
        totalRow.getCell(c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    }

    const signRow = currentRow + 3;
    const rightStart = 9; 
    const rightEnd = 13;

    if (showSecretary) {
        worksheet.mergeCells(signRow, 2, signRow, 5);
        worksheet.getCell(signRow, 2).value = showLeader ? "Mengetahui," : "";
        worksheet.getCell(signRow, 2).alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 1, 2, signRow + 1, 5);
        const cellJob = worksheet.getCell(signRow + 1, 2);
        cellJob.value = showLeader ? (settings.kepalaJabatan || '') : (secretary ? secretary.jabatan : '');
        cellJob.font = { bold: true };
        cellJob.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 6, 2, signRow + 6, 5);
        const cellName = worksheet.getCell(signRow + 6, 2);
        cellName.value = showLeader ? (settings.kepalaName || '').toUpperCase() : (secretary ? (secretary.nama || '').toUpperCase() : '');
        cellName.font = { bold: true, underline: true };
        cellName.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 7, 2, signRow + 7, 5);
        const cellNip = worksheet.getCell(signRow + 7, 2);
        cellNip.value = showLeader ? `NIP. ${settings.kepalaNip}` : (secretary ? `NIP. ${secretary.nip}` : '');
        cellNip.alignment = { horizontal: 'center' };
    }

    if (showLeader || (!showLeader && showSecretary)) {
        worksheet.mergeCells(signRow, rightStart, signRow, rightEnd);
        const dateCell = worksheet.getCell(signRow, rightStart);
        dateCell.value = `${settings.titimangsa || 'Tempat'}, ${getFormattedDate()}`;
        dateCell.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 1, rightStart, signRow + 1, rightEnd);
        const cellJobR = worksheet.getCell(signRow + 1, rightStart);
        if (showSecretary && showLeader) { cellJobR.value = secretary ? secretary.jabatan : 'Sekretaris'; } 
        else { cellJobR.value = settings.kepalaJabatan || 'Kepala Dinas'; }
        cellJobR.font = { bold: true };
        cellJobR.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 6, rightStart, signRow + 6, rightEnd);
        const cellNameR = worksheet.getCell(signRow + 6, rightStart);
        if (showSecretary && showLeader) { cellNameR.value = secretary ? (secretary.nama).toUpperCase() : '................'; } 
        else { cellNameR.value = (settings.kepalaName || '').toUpperCase(); }
        cellNameR.font = { bold: true, underline: true };
        cellNameR.alignment = { horizontal: 'center' };
        worksheet.mergeCells(signRow + 7, rightStart, signRow + 7, rightEnd);
        const cellNipR = worksheet.getCell(signRow + 7, rightStart);
        if (showSecretary && showLeader) { cellNipR.value = secretary ? `NIP. ${secretary.nip}` : '................'; } 
        else { cellNipR.value = `NIP. ${settings.kepalaNip}`; }
        cellNipR.alignment = { horizontal: 'center' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Rekapan_Tahunan_${selectedEmployee.nama.replace(/\s+/g,'_')}_${year}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <style>{`
         @media print {
           @page { size: ${printOrientation}; margin: 10mm; }
           body { -webkit-print-color-adjust: exact; background-color: white !important; }
           .print-clean { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
           .no-print { display: none !important; }
         }
       `}</style>

       {/* CONTROLS */}
       <div className="bg-white p-4 rounded shadow print:hidden flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-4 items-end flex-wrap">
                <div>
                    <label className="text-xs font-bold block mb-1">Pilih Tahun</label>
                    <select value={year} onChange={e=>setYear(e.target.value)} className="border p-2 rounded w-24 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                       {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                
                {/* SEARCHABLE DROPDOWN */}
                {!isUserMode && (
                  <div className="relative" ref={dropdownRef}>
                      <label className="text-xs font-bold block mb-1">Cari & Pilih Pegawai</label>
                      <div className="relative">
                          <input 
                              type="text" 
                              className="border p-2 pl-9 pr-8 rounded w-64 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="Ketik Nama / NIP / No..."
                              value={searchTerm}
                              onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  setIsDropdownOpen(true);
                                  if(e.target.value === '') setSelectedUserId('');
                              }}
                              onFocus={() => setIsDropdownOpen(true)}
                          />
                          <Search size={16} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none"/>
                          {searchTerm ? (
                              <button onClick={handleClearSelection} className="absolute right-2 top-2.5 text-slate-400 hover:text-red-500"><X size={16}/></button>
                          ) : (
                              <ChevronDown size={16} className="absolute right-2 top-3 text-slate-400 pointer-events-none"/>
                          )}
                      </div>
                      {isDropdownOpen && (
                          <div className="absolute z-50 w-72 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                              {filteredEmployees.length > 0 ? (
                                  filteredEmployees.map(emp => (
                                      <div key={emp.id} onClick={() => handleSelectEmployee(emp)} className={`p-2.5 cursor-pointer border-b border-slate-50 hover:bg-blue-50 ${selectedUserId === emp.id ? 'bg-blue-100' : ''}`}>
                                          <div className="font-bold text-sm text-slate-800">{emp.no}. {emp.nama}</div>
                                          <div className="text-xs text-slate-500 flex justify-between"><span>NIP: {emp.nip || '-'}</span><span className="italic">{emp.jabatan}</span></div>
                                      </div>
                                  ))
                              ) : <div className="p-4 text-center text-sm text-slate-500 italic">Pegawai tidak ditemukan.</div>}
                          </div>
                      )}
                  </div>
                )}
                
                <div>
                    <label className="text-xs font-bold block mb-1">Orientasi Cetak</label>
                    <select value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value)} className="border p-2 rounded w-40 bg-white outline-none">
                        <option value="landscape">Landscape</option>
                        <option value="portrait">Portrait</option>
                    </select>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => window.print()} disabled={!selectedUserId} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-black disabled:bg-gray-300 shadow-sm transition-transform hover:scale-105">
                    <Printer size={16} className="mr-2"/> Cetak
                </button>
                <button onClick={handleExportExcel} disabled={!selectedUserId || isLoading} className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700 disabled:bg-gray-400 shadow-sm transition-transform hover:scale-105">
                    {isLoading ? <Loader2 size={16} className="animate-spin mr-2"/> : <FileDown size={16} className="mr-2"/>} Excel Lengkap
                </button>
            </div>
          </div>

          <div className="flex gap-6 border-t pt-3">
             <span className="text-xs font-bold text-slate-500 flex items-center">Opsi Tanda Tangan:</span>
             <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={showSecretary} onChange={(e) => setShowSecretary(e.target.checked)} className="rounded text-blue-600"/> TTD Sekretaris</label>
             <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={showLeader} onChange={(e) => setShowLeader(e.target.checked)} className="rounded text-blue-600"/> TTD Pimpinan</label>
          </div>
       </div>

       {/* REPORT AREA (PREVIEW) */}
       {selectedEmployee ? (
           <div className="bg-white p-8 rounded shadow print:shadow-none print:border-none print:m-0 print:p-0 print:w-full print:rounded-none print-clean">
              {/* KOP SURAT */}
              <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
                <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0" alt="logo"/>
                <div className="text-center px-20">
                   <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
                   <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
                   <p className="text-sm italic">{settings.address}</p>
                </div>
              </div>

              {/* JUDUL */}
              <div className="text-center mb-6">
                 <h2 className="text-xl font-bold uppercase underline">REKAPITULASI ABSENSI TAHUNAN</h2>
                 <p className="font-bold text-sm uppercase">PERIODE TAHUN: {year}</p>
                 {isLoading && <p className="text-xs text-blue-500 animate-pulse mt-2">Sedang memuat data...</p>}
              </div>

              {/* INFO PEGAWAI */}
              <div className="mb-6 text-sm">
                  <table className="w-full">
                      <tbody>
                          <tr>
                              <td className="font-bold w-32">Nama Pegawai</td><td>: {selectedEmployee.nama}</td>
                              <td className="font-bold w-32">Status</td><td>: {selectedEmployee.statusPegawai || '-'}</td>
                          </tr>
                          <tr>
                              <td className="font-bold">NIP</td><td>: {selectedEmployee.nip || '-'}</td>
                              <td className="font-bold">Jabatan</td><td>: {selectedEmployee.jabatan}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              {/* TABEL DATA */}
              <table className="w-full border-collapse border border-black text-sm">
                 <thead>
                    <tr className="bg-slate-100 print:bg-transparent">
                       <th className="border border-black p-1 align-middle w-10" rowSpan="2">No</th>
                       <th className="border border-black p-1 align-middle text-left w-[1%] whitespace-nowrap" rowSpan="2">Bulan</th>
                       <th className="border border-black p-1 text-center w-auto" colSpan="2">Hadir</th>
                       <th className="border border-black p-1 text-center w-auto" colSpan="2">Sakit</th>
                       <th className="border border-black p-1 text-center w-auto" colSpan="2">Izin</th>
                       <th className="border border-black p-1 text-center w-auto" colSpan="2">Cuti</th>
                       <th className="border border-black p-1 text-center w-auto" colSpan="2">DL</th>
                       <th className="border border-black p-1 text-center w-16" rowSpan="2">Total Hadir</th>
                    </tr>
                    <tr className="bg-slate-50 print:bg-transparent text-[10px] uppercase text-center">
                       <th className="border border-black p-0.5 bg-green-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-green-100 print:bg-transparent">Sore</th>
                       <th className="border border-black p-0.5 bg-yellow-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-yellow-100 print:bg-transparent">Sore</th>
                       <th className="border border-black p-0.5 bg-blue-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-blue-100 print:bg-transparent">Sore</th>
                       <th className="border border-black p-0.5 bg-purple-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-purple-100 print:bg-transparent">Sore</th>
                       <th className="border border-black p-0.5 bg-orange-50 print:bg-transparent">Pagi</th><th className="border border-black p-0.5 bg-orange-100 print:bg-transparent">Sore</th>
                    </tr>
                 </thead>
                 <tbody>
                    {yearlyData.map((data, i) => (
                       <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-black p-1 text-center">{i+1}</td>
                          <td className="border border-black p-1 font-bold whitespace-nowrap">{data.monthName}</td>
                          <td className="border border-black p-1 text-center bg-green-50 print:bg-transparent">{data.stats.Hadir.p}</td><td className="border border-black p-1 text-center bg-green-100 print:bg-transparent">{data.stats.Hadir.s}</td>
                          <td className="border border-black p-1 text-center bg-yellow-50 print:bg-transparent">{data.stats.Sakit.p}</td><td className="border border-black p-1 text-center bg-yellow-100 print:bg-transparent">{data.stats.Sakit.s}</td>
                          <td className="border border-black p-1 text-center bg-blue-50 print:bg-transparent">{data.stats.Izin.p}</td><td className="border border-black p-1 text-center bg-blue-100 print:bg-transparent">{data.stats.Izin.s}</td>
                          <td className="border border-black p-1 text-center bg-purple-50 print:bg-transparent">{data.stats.Cuti.p}</td><td className="border border-black p-1 text-center bg-purple-100 print:bg-transparent">{data.stats.Cuti.s}</td>
                          <td className="border border-black p-1 text-center bg-orange-50 print:bg-transparent">{data.stats['Dinas Luar'].p}</td><td className="border border-black p-1 text-center bg-orange-100 print:bg-transparent">{data.stats['Dinas Luar'].s}</td>
                          <td className="border border-black p-1 text-center font-bold bg-slate-100 print:bg-transparent">{data.totalHadir}</td>
                       </tr>
                    ))}
                    <tr className="bg-gray-200 print:bg-gray-100 font-bold border-t-2 border-black">
                        <td colSpan="2" className="border border-black p-1 text-right pr-4">TOTAL TAHUNAN</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Hadir.p, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Hadir.s, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Sakit.p, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Sakit.s, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Izin.p, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Izin.s, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Cuti.p, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats.Cuti.s, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats['Dinas Luar'].p, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.stats['Dinas Luar'].s, 0)}</td>
                        <td className="border border-black p-1 text-center">{yearlyData.reduce((acc, curr) => acc + curr.totalHadir, 0)}</td>
                    </tr>
                 </tbody>
              </table>

              <div className="mt-4 flex justify-between text-center">
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
                       ) : <div className="mt-10 italic text-gray-400 text-sm">(Data Sekretaris tidak ditemukan)</div>
                   )}

                   {showSecretary && !showLeader && (
                       secretary ? (
                           <>
                               <p className="mb-20 font-bold">{secretary.jabatan}</p>
                               <p className="font-bold underline whitespace-nowrap">{secretary.nama}</p>
                               <p>NIP. {secretary.nip || '-'}</p>
                           </>
                       ) : <div className="mt-10 italic text-gray-400 text-sm">(Data Sekretaris tidak ditemukan)</div>
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
       ) : (
           <div className="bg-white p-12 rounded shadow text-center border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500">
               <Search size={48} className="mb-4 text-slate-300"/>
               <p className="text-lg font-medium">Belum ada pegawai yang dipilih</p>
               <p className="text-sm">Silakan gunakan kolom pencarian di atas untuk memilih pegawai dan melihat rekapan tahunan.</p>
           </div>
       )}
    </div>
  );
}