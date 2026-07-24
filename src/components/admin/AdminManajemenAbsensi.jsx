import React, { useState, useMemo } from 'react';
import { Save, CalendarRange, Search, CheckSquare, Square, Lock, Trash2, Info, Unlock } from 'lucide-react';
import { writeBatch, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, getCollectionPath } from '../../lib/firebase';
import { getTodayString, formatDateIndo } from '../../utils/helpers';

// Status yang bisa DIKUNCI admin. Hadir tidak termasuk (itu hasil absensi mandiri),
// begitu pula Alpa (otomatis untuk yang tak absen & tak dikunci).
const LOCKABLE_STATUS = ['Izin', 'Sakit', 'Cuti', 'Dinas Luar'];

const statusBadgeColor = (statusText) => {
  switch (statusText) {
    case 'Izin': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Sakit': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Cuti': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Dinas Luar': return 'bg-teal-50 text-teal-700 border-teal-200';
    default: return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

export default function AdminManajemenAbsensi({ employees, statusLocks = [] }) {
  const [status, setStatus] = useState('Izin');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmployees = useMemo(() => {
    return employees
      .filter(e => e.role === 'user')
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return userEmployees;
    const lower = searchTerm.toLowerCase();
    return userEmployees.filter(emp =>
      emp.nama.toLowerCase().includes(lower) ||
      (emp.nip && emp.nip.includes(searchTerm))
    );
  }, [userEmployees, searchTerm]);

  // Daftar kunci aktif/akan datang (endDate >= hari ini), terurut mulai terdekat.
  const activeLocks = useMemo(() => {
    const today = getTodayString();
    const nameById = new Map(employees.map(e => [e.id, e]));
    return statusLocks
      .filter(l => l.endDate >= today)
      .map(l => ({ ...l, emp: nameById.get(l.userId) }))
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [statusLocks, employees]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const ids = filteredEmployees.map(e => e.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...prev, ...ids.filter(id => !prev.includes(id))]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return alert('Pilih setidaknya satu pegawai!');
    if (endDate < startDate) return alert('Tanggal selesai tidak boleh sebelum tanggal mulai.');

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        const ref = doc(getCollectionPath('statusLocks'));
        batch.set(ref, {
          userId: empId,
          userName: emp.nama,
          nip: emp.nip || '',
          status,
          startDate,
          endDate,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      alert(`Berhasil mengunci status "${status}" untuk ${selectedIds.length} pegawai.`);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error kunci status:', error);
      alert('Gagal menyimpan kunci status: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (lock) => {
    if (!confirm(`Buka kunci status "${lock.status}" untuk ${lock.userName}?`)) return;
    try {
      await deleteDoc(doc(getCollectionPath('statusLocks'), lock.id));
    } catch (error) {
      console.error('Gagal hapus kunci:', error);
      alert('Gagal membuka kunci: ' + error.message);
    }
  };

  const rangeLabel = startDate === endDate
    ? formatDateIndo(startDate)
    : `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;

  return (
    <div className="space-y-6">
      {/* PANEL FORM KUNCI STATUS */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-600 rounded-xl shadow-inner border border-indigo-100/50">
            <Lock size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Absensi</h2>
            <p className="text-sm text-slate-500 mt-0.5">Kunci status (Izin/Sakit/Cuti/Dinas Luar) untuk rentang tanggal tertentu.</p>
          </div>
        </div>

        {/* Info perilaku buka kunci otomatis */}
        <div className="flex items-start gap-3 mb-5 p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-sm text-blue-800">
          <Info size={18} className="flex-shrink-0 mt-0.5" />
          <p>
            Pegawai yang <b>tidak absen</b> dan tidak dikunci akan otomatis dihitung <b>Alpa</b>.
            Jika pegawai yang dikunci melakukan <b>absensi mandiri</b>, statusnya otomatis berubah
            menjadi <b>Hadir</b> pada hari itu (kunci terbuka otomatis).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
                <CheckSquare size={16} className="text-indigo-400" /> Status Dikunci
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 border-2 border-indigo-200 bg-indigo-50/50 rounded-xl outline-none font-semibold text-indigo-700"
              >
                {LOCKABLE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
                <CalendarRange size={16} className="text-indigo-400" /> Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
                <CalendarRange size={16} className="text-indigo-400" /> Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                required
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 -mt-2">Periode: <span className="font-semibold text-slate-700">{rangeLabel}</span></p>

          {/* Pencarian & pilih semua */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 w-full sm:w-auto"
              >
                {filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.includes(e.id)) ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
              <div className="flex flex-col items-center px-4 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="text-xs text-indigo-400 font-medium">Terpilih</span>
                <span className="text-sm font-bold text-indigo-700 leading-tight">{selectedIds.length}</span>
              </div>
            </div>
          </div>

          {/* Tabel pegawai */}
          <div className="border border-slate-200 rounded-2xl overflow-auto max-h-[45vh] bg-white">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-center w-16 text-slate-500 font-semibold">Pilih</th>
                  <th className="p-4 text-left text-slate-500 font-semibold">Pegawai (Nama & NIP)</th>
                  <th className="p-4 text-left w-32 hidden md:table-cell text-slate-500 font-semibold">Jabatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                  const isSelected = selectedIds.includes(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => toggleSelect(emp.id)}
                      className={`cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/60 shadow-[inset_4px_0_0_0_#6366f1]' : 'hover:bg-slate-50'}`}
                    >
                      <td className="p-4 text-center">
                        {isSelected
                          ? <CheckSquare size={20} className="text-indigo-600 mx-auto" />
                          : <Square size={20} className="text-slate-300 mx-auto" />}
                      </td>
                      <td className="p-4">
                        <div className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{emp.nama}</div>
                        <div className="text-xs text-slate-500 mt-1">{emp.nip ? `NIP: ${emp.nip}` : 'NIP: -'}</div>
                      </td>
                      <td className="p-4 text-slate-500 truncate hidden md:table-cell">{emp.jabatan || '-'}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="3" className="p-12 text-center text-slate-500">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="text-slate-300" size={28} />
                      </div>
                      <p className="font-medium text-slate-600">Tidak ada pegawai ditemukan</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || selectedIds.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg"
          >
            <Save size={20} />
            {isSubmitting ? 'Menyimpan...' : `Kunci Status "${status}" (${selectedIds.length} Pegawai)`}
          </button>
        </form>
      </div>

      {/* DAFTAR KUNCI AKTIF */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Lock size={18} className="text-indigo-500" /> Kunci Status Aktif & Akan Datang
        </h3>
        <p className="text-sm text-slate-500 mb-4">Daftar kunci yang masih berlaku (belum lewat). Buka kunci untuk membatalkannya.</p>

        {activeLocks.length === 0 ? (
          <div className="text-center p-10 bg-slate-50 text-slate-400 rounded-xl border-2 border-dashed">
            <Unlock size={40} className="mx-auto mb-2 text-slate-300" />
            <p>Belum ada kunci status yang aktif.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLocks.map(lock => (
              <div key={lock.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/60">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border flex-shrink-0 ${statusBadgeColor(lock.status)}`}>
                    {lock.status}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-700 truncate">{lock.userName || lock.emp?.nama || '(pegawai tidak ditemukan)'}</div>
                    <div className="text-xs text-slate-500">
                      {lock.startDate === lock.endDate
                        ? formatDateIndo(lock.startDate)
                        : `${formatDateIndo(lock.startDate)} s/d ${formatDateIndo(lock.endDate)}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(lock)}
                  className="flex items-center justify-center gap-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm flex-shrink-0"
                >
                  <Trash2 size={16} /> Buka Kunci
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
