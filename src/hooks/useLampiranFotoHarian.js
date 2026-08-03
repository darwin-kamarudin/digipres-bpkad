import { useState, useEffect } from 'react';
import { saveLampiranFotoHarian, loadLampiranFotoHarian, clearLampiranFotoHarian } from '../lib/localDb';

// Kelola state + persistensi IndexedDB lokal untuk Lampiran Foto Laporan
// Harian (Format Default) — dipakai BERSAMA oleh versi web (AdminLaporanHarian),
// admin-mobile, maupun panel pegawai supaya logikanya konsisten & tidak perlu
// diduplikasi di tiap versi. Foto dikunci PER TANGGAL saja (bukan per sesi
// lagi) — dokumen Format Default kini memuat apel pagi & sore sekaligus, jadi
// lampiran fotonya pun satu set untuk satu hari. Foto TIDAK pernah dikirim ke
// Firebase (lihat catatan di lib/localDb.js).
export default function useLampiranFotoHarian(date) {
  const [lampiranFotos, setLampiranFotos] = useState([]);
  const key = date;

  useEffect(() => {
    let active = true;
    loadLampiranFotoHarian(key).then((saved) => {
      if (active) setLampiranFotos(saved || []);
    });
    return () => { active = false; };
  }, [key]);

  const handleFotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }))).then((fotos) => {
      setLampiranFotos(fotos);
      saveLampiranFotoHarian(key, fotos);
    });
    e.target.value = '';
  };

  const clearFotos = () => {
    setLampiranFotos([]);
    clearLampiranFotoHarian(key);
  };

  return { lampiranFotos, handleFotoChange, clearFotos };
}
