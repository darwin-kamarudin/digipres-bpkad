import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, Lock, Trash2, Info, Unlock, ChevronDown, Users } from 'lucide-react';
import { writeBatch, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, getCollectionPath } from '../../lib/firebase';
import { getTodayString, formatDateIndo } from '../../utils/helpers';
import AdminMobileLockStatusSheet from './AdminMobileLockStatusSheet';
import InfoBannerCarousel from '../admin/InfoBannerCarousel';

// Versi mobile-native (Capacitor / layar HP) dari AdminManajemenAbsensi.jsx.
// Alur diubah jadi "pilih pegawai dulu, baru tentukan status & jangka waktu"
// (via AdminMobileLockStatusSheet) — lebih terasa seperti aplikasi native
// dibanding form panjang ala web. Logika Firestore identik dengan versi web.
// Cari pegawai terpilih yang SUDAH punya absensi ASLI (self check-in) di rentang
// tanggal yang mau dikunci. Absensi asli selalu menang atas kunci admin per sesi
// (lihat mergeAttendanceWithLocks di utils/statistics.js) — jadi kalau ada bentrok,
// status kunci baru TIDAK akan berlaku untuk sesi yang sudah ada absensi aslinya.
const findAttendanceConflicts = (attendance, selectedIds, startDate, endDate) => {
  const conflicts = new Map(); // userId -> Set tanggal
  attendance.forEach((a) => {
    if (selectedIds.includes(a.userId) && a.date >= startDate && a.date <= endDate) {
      if (!conflicts.has(a.userId)) conflicts.set(a.userId, new Set());
      conflicts.get(a.userId).add(a.date);
    }
  });
  return conflicts;
};

export default function AdminMobileManajemenAbsensi({ employees, statusLocks = [], attendance = [] }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLockList, setShowLockList] = useState(false);
  const [showLockSheet, setShowLockSheet] = useState(false);

  // userId yang sedang punya kunci aktif/akan datang (belum lewat). Selama
  // masih terkunci, pegawai ini SENGAJA disembunyikan dari daftar pilih —
  // admin wajib buka kunci lama dulu (di bagian "Kunci Aktif") sebelum bisa
  // membuat kunci status baru, supaya tidak terjadi kunci ganda/tumpang tindih
  // yang bisa membuat satu pegawai terhitung di dua status sekaligus.
  const lockedUserIds = useMemo(() => {
    const today = getTodayString();
    return new Set(statusLocks.filter(l => l.endDate >= today).map(l => l.userId));
  }, [statusLocks]);

  const userEmployees = useMemo(() => {
    return employees
      .filter(e => e.role === 'user' && !lockedUserIds.has(e.id))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [employees, lockedUserIds]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return userEmployees;
    const lower = searchTerm.toLowerCase();
    return userEmployees.filter(emp =>
      emp.nama.toLowerCase().includes(lower) ||
      (emp.nip && emp.nip.includes(searchTerm))
    );
  }, [userEmployees, searchTerm]);

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

  const handleLockSubmit = async ({ status, startDate, endDate }) => {
    if (selectedIds.length === 0) return;
    if (endDate < startDate) return alert('Tanggal selesai tidak boleh sebelum tanggal mulai.');

    const conflicts = findAttendanceConflicts(attendance, selectedIds, startDate, endDate);
    if (conflicts.size > 0) {
      const lines = [...conflicts.entries()].map(([uid, dates]) => {
        const emp = employees.find(e => e.id === uid);
        return `- ${emp?.nama || uid}: ${[...dates].sort().map(formatDateIndo).join(', ')}`;
      });
      const proceed = confirm(
        `Perhatian: pegawai berikut sudah punya absensi ASLI (self check-in) pada sebagian tanggal di rentang ini. ` +
        `Absensi asli selalu diprioritaskan, jadi status kunci "${status}" TIDAK akan berlaku pada tanggal tersebut:\n\n` +
        `${lines.join('\n')}\n\nLanjutkan mengunci untuk tanggal lain yang belum ada absensi?`
      );
      if (!proceed) return;
    }

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
      setShowLockSheet(false);
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

  const statusBadgeColor = (statusText) => {
    switch (statusText) {
      case 'Izin': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Sakit': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cuti': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Dinas Luar': return 'bg-teal-50 text-teal-700 border-teal-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="p-4 pb-6 space-y-4 font-sans">
      {/* HEADER RINGKAS */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-red-50 to-amber-100 text-red-700 rounded-xl border border-red-100/50">
          <Lock size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="font-black text-slate-800 leading-tight">Manajemen Absensi</h2>
          <p className="text-xs text-slate-500">Pilih pegawai, lalu tentukan status & jangka waktu</p>
        </div>
      </div>

      <InfoBannerCarousel
        items={[
          <div key="auto-unlock" className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 h-full">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <p>Kunci bisa untuk beberapa hari ke depan sekaligus — tak perlu isi status tiap hari. Absen mandiri otomatis membuka kunci (jadi Hadir).</p>
          </div>,
          ...(lockedUserIds.size > 0 ? [
            <div key="locked-hidden" className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 h-full">
              <Lock size={16} className="flex-shrink-0 mt-0.5" />
              <p>{lockedUserIds.size} pegawai disembunyikan dari daftar karena sudah punya kunci aktif. Buka kunci lama dulu di bagian "Kunci Aktif" di bawah untuk mengubah statusnya.</p>
            </div>
          ] : []),
        ]}
      />

      {/* LANGKAH 1: PILIH PEGAWAI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama atau NIP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg active:bg-slate-50"
          >
            {filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.includes(e.id)) ? 'Batal Semua' : 'Pilih Semua'}
          </button>
          <div className="flex flex-col items-center px-3 py-1 rounded-lg bg-red-50 border border-red-100">
            <span className="text-[10px] text-red-400 font-medium">Terpilih</span>
            <span className="text-sm font-bold text-red-700 leading-tight">{selectedIds.length}</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-[45vh] divide-y divide-slate-100">
          {filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
            const isSelected = selectedIds.includes(emp.id);
            return (
              <button
                type="button"
                key={emp.id}
                onClick={() => toggleSelect(emp.id)}
                className={`w-full flex items-center gap-3 p-3 text-left active:bg-slate-50 ${isSelected ? 'bg-red-50/60' : ''}`}
              >
                {isSelected
                  ? <CheckSquare size={20} className="text-red-700 flex-shrink-0" />
                  : <Square size={20} className="text-slate-300 flex-shrink-0" />}
                <div className="min-w-0">
                  <div className={`font-bold text-sm truncate ${isSelected ? 'text-red-700' : 'text-slate-700'}`}>{emp.nama}</div>
                  <div className="text-[11px] text-slate-500 truncate">{emp.nip ? `NIP: ${emp.nip}` : 'NIP: -'} {emp.jabatan ? `• ${emp.jabatan}` : ''}</div>
                </div>
              </button>
            );
          }) : (
            <div className="p-8 text-center text-slate-400 text-sm">Tidak ada pegawai ditemukan</div>
          )}
        </div>
      </div>

      {/* BAR AKSI MENGAMBANG: LANGKAH 2 (STATUS + JANGKA WAKTU) */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-2 z-30">
          <button
            type="button"
            onClick={() => setShowLockSheet(true)}
            className="w-full flex items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-xl active:bg-slate-800"
          >
            <span className="flex items-center gap-2 font-bold text-sm">
              <Users size={18} className="text-amber-400" /> {selectedIds.length} Pegawai Terpilih
            </span>
            <span className="text-amber-400 font-bold text-sm">Lanjutkan &rarr;</span>
          </button>
        </div>
      )}

      {/* DAFTAR KUNCI AKTIF (COLLAPSIBLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLockList((v) => !v)}
          className="w-full flex items-center justify-between p-4"
        >
          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Lock size={16} className="text-red-600" /> Kunci Aktif ({activeLocks.length})
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${showLockList ? 'rotate-180' : ''}`} />
        </button>

        {showLockList && (
          <div className="px-4 pb-4 space-y-2">
            {activeLocks.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-xl border-2 border-dashed text-sm">
                <Unlock size={28} className="mx-auto mb-2 text-slate-300" />
                Belum ada kunci status aktif.
              </div>
            ) : activeLocks.map(lock => (
              <div key={lock.id} className="flex items-center justify-between gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex-shrink-0 ${statusBadgeColor(lock.status)}`}>
                    {lock.status}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-700 text-sm truncate">{lock.userName || lock.emp?.nama || '-'}</div>
                    <div className="text-[10px] text-slate-500">
                      {lock.startDate === lock.endDate
                        ? formatDateIndo(lock.startDate)
                        : `${formatDateIndo(lock.startDate)} s/d ${formatDateIndo(lock.endDate)}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(lock)}
                  className="p-2 text-red-600 bg-white border border-red-200 active:bg-red-50 rounded-lg flex-shrink-0"
                  aria-label="Buka Kunci"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminMobileLockStatusSheet
        open={showLockSheet}
        selectedCount={selectedIds.length}
        defaultStartDate={getTodayString()}
        submitting={isSubmitting}
        onClose={() => setShowLockSheet(false)}
        onSubmit={handleLockSubmit}
      />
    </div>
  );
}
