import React from 'react';
import { CalendarDays, Calendar, CalendarRange } from 'lucide-react';

const FILTERS = [
  { key: 'minggu', label: 'Minggu Ini', icon: CalendarDays },
  { key: 'bulan', label: 'Bulan Ini', icon: Calendar },
  { key: 'tahun', label: 'Tahun Ini', icon: CalendarRange },
];

// Bottom tab bar ala aplikasi native untuk memilih periode Papan Peringkat
// Kehadiran (Minggu/Bulan/Tahun) — gaya & warna sama persis dengan
// UserCetakBottomNav (panel Cetak) supaya konsisten. Bukan navigasi rute
// (react-router), melainkan toggle filter state biasa (lift state di parent).
export default function UserStatistikBottomNav({ filter, onFilterChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-red-700 border-t border-red-800 safe-bottom print:hidden">
      <div className="grid grid-cols-3 h-16">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex flex-col items-center justify-center gap-1 active:bg-red-800 transition-colors ${active ? 'text-white' : 'text-red-200'}`}
            >
              <f.icon size={22} />
              <span className="text-[10px] font-bold">{f.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
