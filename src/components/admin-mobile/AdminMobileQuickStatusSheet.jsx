import React, { useState } from 'react';
import { X, CheckCircle2, FileText, Stethoscope, Palmtree, Briefcase } from 'lucide-react';
import { saveQuickStatus } from '../../lib/quickStatus';

// Sheet aksi cepat: admin tap satu pegawai yang belum absen (Alpa) lalu pilih
// status untuk hari itu. Logika penyimpanannya ada di lib/quickStatus.js supaya
// dipakai bersama versi web (AdminQuickStatusModal.jsx).
export const QUICK_ACTIONS = [
  { key: 'Hadir', label: 'Hadir', icon: CheckCircle2, color: 'text-green-700 bg-green-50 border-green-200' },
  { key: 'Izin', label: 'Izin', icon: FileText, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { key: 'Sakit', label: 'Sakit', icon: Stethoscope, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'Cuti', label: 'Cuti', icon: Palmtree, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { key: 'Dinas Luar', label: 'Dinas Luar', icon: Briefcase, color: 'text-teal-700 bg-teal-50 border-teal-200' },
];

export default function AdminMobileQuickStatusSheet({ open, employee, date, session, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  if (!open || !employee) return null;

  const handlePick = async (statusKey) => {
    if (!confirm(`Tandai "${employee.nama}" sebagai ${statusKey} untuk tanggal ${date}?`)) return;
    setSubmitting(true);
    try {
      await saveQuickStatus({ employee, date, session, statusKey, device: 'admin-mobile' });
      onClose();
    } catch (err) {
      console.error('Gagal set status cepat:', err);
      alert('Gagal menyimpan status: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 print:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl safe-bottom animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="font-black text-slate-800 truncate">{employee.nama}</h2>
            <p className="text-xs text-slate-500">{employee.nip ? `NIP: ${employee.nip}` : 'NIP: -'}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-500">
            <X size={20} />
          </button>
        </div>
        <div className="px-4 pb-5 grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={submitting}
              onClick={() => handlePick(a.key)}
              className={`flex items-center gap-2 p-3.5 rounded-xl border font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 ${a.color}`}
            >
              <a.icon size={18} /> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
