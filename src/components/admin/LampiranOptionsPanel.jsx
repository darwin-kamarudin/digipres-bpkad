import React from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

// Checkbox "Lampiran Foto" + tombol pilih foto dokumentasi untuk Laporan Harian
// "Format Default" (v1). Diekstrak dari AdminLaporanHarian.jsx supaya bisa
// dipakai ulang persis sama di versi admin-mobile & panel pegawai.
//
// CATATAN: opsi "Lampirkan Detail" DIHAPUS sejak v1 memakai tata letak Daftar
// Hadir Apel — daftar nama pegawai beserta status presensinya sudah tercetak
// langsung di tabel utama, jadi lampiran rincian nama tidak diperlukan lagi.
export default function LampiranOptionsPanel({
  showLampiranFoto, onToggleLampiranFoto,
  lampiranFotos, onPickFoto, onClearFoto, fotoInputRef,
}) {
  return (
    <>
      <div className="flex flex-col justify-end pb-2 gap-1.5">
        <label className="flex items-center space-x-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLampiranFoto}
            onChange={(e) => onToggleLampiranFoto(e.target.checked)}
            className="w-5 h-5 text-red-700 rounded border-gray-300 focus:ring-red-600"
          />
          <span className="text-sm font-bold text-slate-700">Lampirkan Foto</span>
        </label>
      </div>

      {showLampiranFoto && (
        <div className="flex flex-col justify-end pb-2">
          <label className="text-xs font-bold block mb-1">Foto Dokumentasi</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded font-bold text-sm transition-colors"
            >
              <ImagePlus size={16} /> Pilih Foto {lampiranFotos.length > 0 ? `(${lampiranFotos.length})` : ''}
            </button>
            {lampiranFotos.length > 0 && (
              <button
                type="button"
                onClick={onClearFoto}
                className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-bold text-sm"
              >
                <Trash2 size={16} /> Hapus
              </button>
            )}
          </div>
          <input ref={fotoInputRef} type="file" accept="image/*" multiple onChange={onPickFoto} className="hidden" />
        </div>
      )}
    </>
  );
}
