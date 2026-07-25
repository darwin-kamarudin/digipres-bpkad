import { calcJamKerja, getTodayString } from './helpers';

// Jam Kerja dihitung dinamis (dipakai bersama oleh UserHome.jsx dan
// UserRiwayat.jsx supaya angkanya selalu konsisten di kedua halaman):
//
// 1. Sudah checkin (Pagi) DAN checkout (Sore) -> hitung selisih asli, final.
// 2. Sudah checkin tapi BELUM checkout, ada "ping" GPS di TANGGAL YANG SAMA
//    dengan checkin yang terekam berada di dalam radius kantor (lihat
//    lastLocationPing di localDb.js, diisi oportunis oleh UserHome.jsx tiap
//    kali beranda dibuka) -> pakai waktu ping tsb sebagai perkiraan jam pulang.
// 3. Sudah checkin, belum checkout, belum ada ping, DAN tanggalnya HARI INI
//    (masih mungkin lanjut checkout nanti) -> hitung berjalan (live) dari jam
//    masuk sampai SEKARANG, ditandai "sedang berjalan".
// 4. Sudah checkin, belum checkout, belum ada ping, tanggalnya SUDAH LEWAT
//    (hari itu sudah berakhir, tidak akan checkout lagi) -> jam kerja "dibekukan"
//    otomatis pakai jadwal pulang kantor (settings.jamPulangAwal) sebagai
//    perkiraan, supaya tercatat sebagai angka final, bukan terus berjalan
//    tanpa henti ke hari-hari berikutnya.
// 5. Belum checkin sama sekali -> 0, tanpa catatan.
export const computeJamKerja = ({ checkInLog, checkOutLog, lastPing, now = new Date(), settings }) => {
  if (!checkInLog?.timestamp) {
    return { value: 0, note: null };
  }

  if (checkOutLog?.timestamp) {
    return { value: calcJamKerja(checkInLog.timestamp, checkOutLog.timestamp), note: null };
  }

  const logDate = checkInLog.date;
  const pingMatchesDay = lastPing?.date === logDate;
  const pingIsAfterCheckIn = pingMatchesDay && new Date(lastPing.timestamp) > new Date(checkInLog.timestamp);

  if (pingIsAfterCheckIn) {
    return {
      value: calcJamKerja(checkInLog.timestamp, lastPing.timestamp),
      note: 'estimasi dari GPS terakhir di kantor',
    };
  }

  if (logDate === getTodayString()) {
    return {
      value: calcJamKerja(checkInLog.timestamp, now.toISOString()),
      note: 'sedang berjalan',
    };
  }

  // Hari sudah lewat, tidak checkout, tidak ada ping -> bekukan pakai jadwal pulang.
  if (settings?.jamPulangAwal) {
    const assumedCheckoutIso = `${logDate}T${settings.jamPulangAwal}:00`;
    return {
      value: calcJamKerja(checkInLog.timestamp, assumedCheckoutIso),
      note: 'estimasi jadwal pulang (tidak checkout)',
    };
  }

  return { value: 0, note: 'tidak checkout' };
};
