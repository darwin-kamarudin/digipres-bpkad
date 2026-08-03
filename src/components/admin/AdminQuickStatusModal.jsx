import React, { useState } from 'react';
import { X } from 'lucide-react';
import { QUICK_ACTIONS } from '../admin-mobile/AdminMobileQuickStatusSheet';
import { saveQuickStatus } from '../../lib/quickStatus';

// Versi WEB dari aksi cepat pencatatan absensi oleh admin — isinya sama persis
// dengan AdminMobileQuickStatusSheet (pilihan status & logika simpan dipakai
// bersama), hanya tampilannya berupa modal tengah layar, bukan bottom sheet.
export default function AdminQuickStatusModal({ open, employee, date, session, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  if (!open || !employee) return null;

  const handlePick = async (statusKey) => {
    if (!confirm(`Tandai "${employee.nama}" sebagai ${statusKey} untuk tanggal ${date}?`)) return;
    setSubmitting(true);
    try {
      await saveQuickStatus({ employee, date, session, statusKey, device: 'admin-web' });
      onClose();
    } catch (err) {
      console.error('Gagal set status cepat:', err);
      alert('Gagal menyimpan status: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b">
          <div className="min-w-0">
            <h2 className="font-black text-slate-800 truncate">{employee.nama}</h2>
            <p className="text-xs text-slate-500">
              {employee.nip ? `NIP: ${employee.nip}` : 'NIP: -'} &middot; Sesi {session}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={submitting}
              onClick={() => handlePick(a.key)}
              className={`flex items-center gap-2 p-3.5 rounded-xl border font-bold text-sm hover:brightness-95 transition disabled:opacity-50 ${a.color}`}
            >
              <a.icon size={18} /> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
