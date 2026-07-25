import React, { useState, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import { formatDateIndo, formatLocalDate } from '../../utils/helpers';

const LOCKABLE_STATUS = ['Izin', 'Sakit', 'Cuti', 'Dinas Luar'];
const DURATION_PRESETS = [
  { key: '1', label: '1 Hari', days: 1 },
  { key: '3', label: '3 Hari', days: 3 },
  { key: '7', label: '1 Minggu', days: 7 },
  { key: '14', label: '2 Minggu', days: 14 },
  { key: 'custom', label: 'Custom', days: null },
];

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + (days - 1));
  return formatLocalDate(d);
};

// Sheet langkah ke-2 dari alur Manajemen Absensi mobile-native: setelah admin
// memilih satu/beberapa pegawai di halaman utama, sheet ini menentukan status
// yang dikunci + jangka waktunya (preset jumlah hari, atau tanggal custom),
// supaya admin tak perlu mengisi status absensi setiap hari untuk pegawai yang
// sudah diperkirakan tidak hadir beberapa hari ke depan.
export default function AdminMobileLockStatusSheet({ open, selectedCount, defaultStartDate, onClose, onSubmit, submitting }) {
  const [status, setStatus] = useState('Izin');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [durationKey, setDurationKey] = useState('1');
  const [customEndDate, setCustomEndDate] = useState(defaultStartDate);

  const endDate = useMemo(() => {
    if (durationKey === 'custom') return customEndDate;
    const preset = DURATION_PRESETS.find(p => p.key === durationKey);
    return addDays(startDate, preset?.days || 1);
  }, [durationKey, startDate, customEndDate]);

  if (!open) return null;

  const rangeLabel = startDate === endDate
    ? formatDateIndo(startDate)
    : `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (durationKey === 'custom' && customEndDate < val) setCustomEndDate(val);
  };

  return (
    <div className="fixed inset-0 z-50 print:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl safe-bottom max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-black text-slate-800">Kunci Status ({selectedCount} Pegawai)</h2>
          <button onClick={onClose} aria-label="Tutup" className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* PILIH STATUS */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Status Dikunci</label>
            <div className="grid grid-cols-2 gap-2">
              {LOCKABLE_STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`p-3 rounded-xl border-2 font-bold text-sm transition-colors ${status === s ? 'border-red-700 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* TANGGAL MULAI */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm"
            />
          </div>

          {/* DURASI (JUMLAH HARI KE DEPAN) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Jangka Waktu</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setDurationKey(p.key)}
                  className={`p-2.5 rounded-xl border-2 font-bold text-xs transition-colors ${durationKey === p.key ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {durationKey === 'custom' && (
              <input
                type="date"
                value={customEndDate}
                min={startDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full mt-2 p-2.5 border border-slate-200 rounded-xl outline-none text-sm"
              />
            )}
          </div>

          <p className="text-xs text-slate-500">Periode terkunci: <span className="font-bold text-slate-700">{rangeLabel}</span></p>

          <button
            type="button"
            disabled={submitting}
            onClick={() => onSubmit({ status, startDate, endDate })}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-amber-600 text-white p-3.5 rounded-xl font-bold active:from-red-800 active:to-amber-700 disabled:opacity-50 shadow-lg"
          >
            <Save size={18} />
            {submitting ? 'Menyimpan...' : `Kunci "${status}" untuk ${selectedCount} Pegawai`}
          </button>
        </div>
      </div>
    </div>
  );
}
