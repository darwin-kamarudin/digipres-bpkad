import React, { useState, useRef } from 'react';
import { Calendar, LogIn, LogOut, Coffee, Smartphone } from 'lucide-react';
import { getTodayString } from '../../utils/helpers';
import MobileHeader from './MobileHeader';

const CHECK_META = {
  Pagi: { label: 'Masuk', icon: LogIn, color: 'text-green-600 bg-green-50' },
  Siang: { label: 'Istirahat', icon: Coffee, color: 'text-amber-600 bg-amber-50' },
  Sore: { label: 'Keluar', icon: LogOut, color: 'text-red-600 bg-red-50' },
};

const toDDMMYYYY = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function UserRiwayat({ user, attendance }) {
  const dateInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('online');
  const [filterDate, setFilterDate] = useState(getTodayString());

  const myLogs = attendance
    .filter(l => l.userId === user.id)
    .filter(l => l.date === filterDate)
    .filter(l => activeTab === 'online' ? l.connectionStatus !== 'offline' : l.connectionStatus === 'offline')
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans safe-bottom">
      <MobileHeader title="Riwayat Absensi" />

      <div className="max-w-2xl w-full mx-auto p-4 pb-8">

        {/* TABS ONLINE/OFFLINE */}
        <div className="grid grid-cols-2 rounded-xl overflow-hidden shadow-sm mb-4">
          <button
            onClick={() => setActiveTab('online')}
            className={`p-3 font-bold text-sm transition-colors active:scale-95 ${activeTab === 'online' ? 'bg-amber-200 text-slate-800' : 'bg-red-700 text-white'}`}
          >
            Riwayat Online
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`p-3 font-bold text-sm transition-colors active:scale-95 ${activeTab === 'offline' ? 'bg-amber-200 text-slate-800' : 'bg-red-700 text-white'}`}
          >
            Riwayat Offline
          </button>
        </div>

        {/* FILTER TANGGAL */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-red-700 text-white text-center font-bold py-3 rounded-xl">
            Tanggal : {toDDMMYYYY(filterDate)}
          </div>
          <button
            onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
            className="bg-red-700 text-white p-3 rounded-xl flex-shrink-0 active:scale-95 transition-transform"
            aria-label="Pilih tanggal"
          >
            <Calendar size={22} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="hidden"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        {/* DAFTAR RIWAYAT (LIST NATIVE, BUKAN TABEL) */}
        {myLogs.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 italic shadow-sm">
            Belum ada riwayat pada tanggal ini.
          </div>
        ) : (
          <div className="space-y-3">
            {myLogs.map(l => {
              const meta = CHECK_META[l.session] || { label: l.session, icon: LogIn, color: 'text-slate-600 bg-slate-100' };
              const Icon = meta.icon;
              return (
                <div key={l.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{meta.label}</p>
                    <p className="text-xs text-slate-500">
                      {l.timestamp ? new Date(l.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block text-[11px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700">{l.workMode || 'WFO'}</span>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1 uppercase">
                      <Smartphone size={11} /> {l.device || 'web'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
