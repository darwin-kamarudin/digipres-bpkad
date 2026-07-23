import React, { useState, useMemo } from 'react';
import { Save, UserPlus, Calendar, Clock, CheckSquare, Square, Search, Info } from 'lucide-react'; 
import { writeBatch, doc } from "firebase/firestore";
import { db, getCollectionPath } from '../../lib/firebase';
import { getTodayString } from '../../utils/helpers';

export default function AdminInputAbsensi({ employees, attendance }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState('Pagi');
  const [status, setStatus] = useState('Hadir');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Optimasi filter dan pencarian
  const userEmployees = useMemo(() => {
    return employees
      .filter(e => e.role === 'user')
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return userEmployees;
    const lowerSearch = searchTerm.toLowerCase();
    return userEmployees.filter(emp => 
      emp.nama.toLowerCase().includes(lowerSearch) ||
      (emp.nip && emp.nip.includes(searchTerm))
    );
  }, [userEmployees, searchTerm]);

  // Map untuk pengecekan status secara real-time dan efisien
  const currentAttendanceMap = useMemo(() => {
    const map = new Map();
    attendance.forEach(a => {
      if (a.date === date && a.session === session) {
        map.set(a.userId, a);
      }
    });
    return map;
  }, [attendance, date, session]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredEmployees.map(e => e.id);
    const isAllFilteredSelected = filteredIds.every(id => selectedIds.includes(id));

    if (isAllFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const newSelections = filteredIds.filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...newSelections]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert("Pilih setidaknya satu pegawai!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      
      selectedIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;

        const existing = currentAttendanceMap.get(empId);
        
        // LOGIKA REKAPAN: Menggunakan ID Spesifik agar tidak ada duplikasi data absensi
        const specificDocId = `${date}_${session}_${empId}`;

        const logData = {
          userId: empId,
          userName: emp.nama, // PENTING: Dipertahankan agar Rekapan Laporan tidak error
          nama: emp.nama,     
          nip: emp.nip || '',
          date,
          session,
          status,
          statusApproval: 'approved',
          adminInput: true,
          timestamp
        };

        if (existing) {
          // Update data jika sudah ada di database
          const docRef = doc(getCollectionPath('attendance'), existing.id);
          batch.update(docRef, { 
            status,
            statusApproval: 'approved',
            adminInput: true,
            timestamp
          });
        } else {
          // Buat data baru dengan ID Spesifik yang aman
          const newDocRef = doc(getCollectionPath('attendance'), specificDocId);
          batch.set(newDocRef, logData);
        }
      });

      await batch.commit();
      alert(`Berhasil menyimpan ${selectedIds.length} data absensi!`);
      setSelectedIds([]); 
      
    } catch (error) {
      console.error("Error input absensi:", error);
      alert("Gagal menyimpan absensi: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi helper warna untuk opsi absensi yang sudah distandardisasi
  const getStatusBadgeColor = (statusText) => {
    switch (statusText) {
      case 'Hadir': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Izin': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Sakit': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cuti': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DL': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Alpa': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6 mb-8 relative">
      
      {/* Header Halaman */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-600 rounded-xl shadow-inner border border-indigo-100/50">
          <UserPlus size={26} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Input Absensi Massal</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola kehadiran pegawai dengan mudah dan cepat.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Kontainer Pengaturan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-slate-50/70 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400"/> Tanggal
            </label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
              <Clock size={16} className="text-indigo-400"/> Sesi
            </label>
            <select 
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
            >
              <option value="Pagi">Pagi (Datang)</option>
              <option value="Sore">Sore (Pulang)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
              <CheckSquare size={16} className="text-indigo-400"/> Terapkan Status
            </label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 border-2 border-indigo-200 bg-indigo-50/50 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-semibold text-indigo-700 transition-all"
            >
              {/* OPSI YANG DISESUAIKAN DENGAN STANDAR */}
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Cuti">Cuti</option>
              <option value="DL">DL (Dinas Luar)</option>
              <option value="Alpa">Alpa</option>
            </select>
          </div>
        </div>

        {/* Bar Pencarian & Tombol Pilih Semua */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau NIP..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-indigo-600 w-full sm:w-auto shadow-sm active:scale-95 transition-all"
            >
              {filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedIds.includes(emp.id)) 
                ? 'Batal Pilih Semua' 
                : 'Pilih Semua'}
            </button>
            <div className="flex flex-col items-center justify-center px-4 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="text-xs text-indigo-400 font-medium">Terpilih</span>
              <span className="text-sm font-bold text-indigo-700 leading-tight">
                {selectedIds.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tabel Data Pegawai (Responsive & Scrollable) */}
        <div className="border border-slate-200 rounded-2xl overflow-auto shadow-sm max-h-[55vh] relative bg-white">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-center w-16 text-slate-500 font-semibold">Pilih</th>
                <th className="p-4 text-left text-slate-500 font-semibold">Pegawai (Nama & NIP)</th>
                <th className="p-4 text-left w-32 hidden md:table-cell text-slate-500 font-semibold">Jabatan</th>
                <th className="p-4 text-left w-36 text-slate-500 font-semibold">Status di Sistem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(emp => {
                  const isSelected = selectedIds.includes(emp.id);
                  const existingRecord = currentAttendanceMap.get(emp.id);
                  
                  return (
                    <tr 
                      key={emp.id} 
                      onClick={() => toggleSelect(emp.id)}
                      className={`cursor-pointer transition-all duration-200 
                        ${isSelected ? 'bg-indigo-50/60 shadow-[inset_4px_0_0_0_#6366f1]' : 'hover:bg-slate-50'}`}
                    >
                      <td className="p-4 text-center">
                        {isSelected ? (
                          <CheckSquare size={20} className="text-indigo-600 mx-auto drop-shadow-sm"/> 
                        ) : (
                          <Square size={20} className="text-slate-300 mx-auto transition-transform hover:scale-110"/>
                        )}
                      </td>
                      <td className="p-4">
                        <div className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {emp.nama}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-medium">
                          {emp.nip ? `NIP: ${emp.nip}` : 'NIP: -'}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 truncate hidden md:table-cell">{emp.jabatan || '-'}</td>
                      
                      <td className="p-4">
                        {existingRecord ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadgeColor(existingRecord.status)}`}>
                            {existingRecord.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200">
                            Belum Ada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-slate-500 flex-col items-center justify-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="text-slate-300" size={28} />
                    </div>
                    <p className="font-medium text-slate-600">Tidak ada pegawai ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tombol Simpan Mengambang (Sticky Bottom) */}
        <button
          type="submit"
          disabled={isSubmitting || selectedIds.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50 sticky bottom-4 z-20 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Save size={20} />
          {isSubmitting ? 'Memproses Data...' : `Simpan Status Absensi (${selectedIds.length} Pegawai)`}
        </button>

      </form>
    </div>
  );
}