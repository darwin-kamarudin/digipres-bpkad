import { isNonEffectiveDate, getTodayString, formatLocalDate, calcJamKerja } from './helpers';

// ==========================================================================
// KUNCI STATUS ADMIN (statusLocks)
// --------------------------------------------------------------------------
// Admin mengunci status (Izin/Sakit/Cuti/Dinas Luar) untuk pegawai pada
// RENTANG tanggal. Kunci disimpan sebagai { userId, status, startDate, endDate }.
//
// Saat rekap dihitung, kunci "dimaterialkan" jadi record semu berbentuk seperti
// attendance. Absensi NYATA pegawai SELALU menang per (userId,date,session) —
// inilah mekanisme "buka kunci otomatis": begitu pegawai absen mandiri (Hadir),
// record aslinya menutupi record-semu kunci di hari/sesi itu.
//
// HARI NON-EFEKTIF (Sabtu/Minggu/hari libur admin) SENGAJA DILEWATI saat
// materialisasi kunci — status seperti Izin/Sakit/Cuti/Dinas Luar tidak pernah
// tercatat pada hari non-efektif, karena bukan hari kerja (lihat isNonEffectiveDate
// di utils/helpers.js). Alpa pun otomatis ikut tidak tercatat: getDailyStats()
// mengembalikan semua hitungan nol untuk tanggal non-efektif (lihat di bawah).
// ==========================================================================

const LOCK_SESSIONS = ['Pagi', 'Sore'];

// Daftar tanggal (YYYY-MM-DD) inklusif antara startDate..endDate.
const eachDateInRange = (startDate, endDate) => {
  const out = [];
  if (!startDate || !endDate || startDate > endDate) return out;
  const d = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (d <= end) {
    out.push(formatLocalDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

// Materialkan kunci -> record semu (berbentuk seperti attendance), dibatasi
// irisan [rangeStart, rangeEnd] agar tidak membangkitkan tanggal berlebihan.
// Tanggal non-efektif (Sabtu/Minggu/libur admin) DILEWATI -> kunci status tidak
// pernah "bocor" tercatat di hari yang bukan hari kerja.
export const expandLocksToRecords = (locks = [], rangeStart, rangeEnd, holidays = []) => {
  const records = [];
  locks.forEach((lock) => {
    if (!lock?.userId || !lock?.status || !lock?.startDate || !lock?.endDate) return;
    const start = rangeStart && lock.startDate < rangeStart ? rangeStart : lock.startDate;
    const end = rangeEnd && lock.endDate > rangeEnd ? rangeEnd : lock.endDate;
    eachDateInRange(start, end).forEach((dateStr) => {
      if (isNonEffectiveDate(dateStr, holidays).isNonEffective) return;
      LOCK_SESSIONS.forEach((session) => {
        records.push({
          id: `lock_${lock.userId}_${dateStr}_${session}`,
          userId: lock.userId,
          status: lock.status,
          session,
          date: dateStr,
          statusApproval: 'approved',
          fromLock: true,
        });
      });
    });
  });
  return records;
};

// Gabungkan attendance nyata dengan record-semu kunci. Absensi nyata menang.
export const mergeAttendanceWithLocks = (attendance = [], locks = [], rangeStart, rangeEnd, holidays = []) => {
  const pseudo = expandLocksToRecords(locks, rangeStart, rangeEnd, holidays);
  if (pseudo.length === 0) return attendance;
  const attKeys = new Set(attendance.map((a) => `${a.userId}_${a.date}_${a.session}`));
  const extra = pseudo.filter((p) => !attKeys.has(`${p.userId}_${p.date}_${p.session}`));
  return [...attendance, ...extra];
};

// Batas akhir bulan (YYYY-MM -> YYYY-MM-DD hari terakhir).
const monthRange = (month) => {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
};

// ==========================================================================
// STATISTIK
// ==========================================================================

// Fungsi untuk Menghitung Statistik Harian (Dashboard & Laporan Harian)
export const getDailyStats = (date, session, employees, attendance, statusLocks = [], holidays = []) => {
    // 2. Ambil hanya pegawai dengan role 'user'
    const pegawaiOnly = employees.filter(e => e.role === 'user');

    // 0. Hari non-efektif (Sabtu/Minggu/libur admin): TIDAK PERLU mencatat status
    // absensi apa pun (termasuk Alpa) karena memang bukan hari kerja.
    if (isNonEffectiveDate(date, holidays).isNonEffective) {
      const grouped = { Hadir: [], Sakit: [], Izin: [], Cuti: [], 'Dinas Luar': [], Alpa: [] };
      const counts = { Hadir: 0, Sakit: 0, Izin: 0, Cuti: 0, DL: 0, Alpa: 0, TotalPegawai: pegawaiOnly.length, TotalKurang: 0 };
      return { grouped, counts, logs: [] };
    }

    // 1. Gabungkan absensi nyata + kunci admin (absensi menang) untuk tanggal ini
    const merged = mergeAttendanceWithLocks(attendance, statusLocks, date, date, holidays);
    const logs = merged.filter(l => l.date === date && l.session === session && l.statusApproval === 'approved');

    // 3. Siapkan container (bucket) untuk grouping pegawai berdasarkan status
    const grouped = {
      Hadir: [],
      Sakit: [],
      Izin: [],
      Cuti: [],
      'Dinas Luar': [],
      Alpa: []
    };

    const recordedIds = new Set();

    // 4. Masukkan pegawai yang absen ke bucket yang sesuai
    logs.forEach(log => {
      const emp = pegawaiOnly.find(e => e.id === log.userId);
      if (emp) {
          recordedIds.add(emp.id);
          // Pastikan status dikenali, jika tidak masukkan ke Hadir sebagai fallback
          const status = grouped[log.status] ? log.status : 'Hadir';
          grouped[status].push(emp);
      }
    });

    // 5. Cari pegawai yang Alpa (tidak ada di log absensi & tidak dikunci admin)
    grouped.Alpa = pegawaiOnly.filter(e => !recordedIds.has(e.id));

    // 6. Hitung ringkasan angka
    const totalTidakHadir = grouped.Sakit.length + grouped.Izin.length + grouped.Cuti.length + grouped['Dinas Luar'].length + grouped.Alpa.length;

    const counts = {
      Hadir: grouped.Hadir.length,
      Sakit: grouped.Sakit.length,
      Izin: grouped.Izin.length,
      Cuti: grouped.Cuti.length,
      DL: grouped['Dinas Luar'].length,
      Alpa: grouped.Alpa.length,
      TotalPegawai: pegawaiOnly.length,
      TotalKurang: totalTidakHadir
    };

    return { grouped, counts, logs };
};

// Fungsi untuk Menghitung Statistik Bulanan per User (Rekapan Bulanan)
// CATATAN: bila `attendance` sudah digabung dengan kunci (mis. hasil
// fetchAttendanceByRange), biarkan statusLocks kosong agar tidak dobel.
export const getMonthlyStats = (month, attendance, statusLocks = [], holidays = []) => {
    // 1. Gabungkan + filter semua log di bulan tersebut
    const { start, end } = monthRange(month);
    const merged = mergeAttendanceWithLocks(attendance, statusLocks, start, end, holidays);
    const monthlyLogs = merged.filter(l => l.date.startsWith(month) && l.statusApproval === 'approved');

    // 2. Fungsi helper untuk menghitung detail per user
    const calculateUserStats = (userId) => {
         const userLogs = monthlyLogs.filter(l => l.userId === userId);
         const stats = {
            Hadir: { p: 0, s: 0 },
            Sakit: { p: 0, s: 0 },
            Izin: { p: 0, s: 0 },
            Cuti: { p: 0, s: 0 },
            'Dinas Luar': { p: 0, s: 0 }
        };

        userLogs.forEach(log => {
            const status = log.status;
            const session = log.session;

            if (stats[status]) {
                if (session === 'Pagi') stats[status].p += 1;
                else if (session === 'Sore') stats[status].s += 1;
            }
        });
        return stats;
    };

    return { monthlyLogs, calculateUserStats };
};

// Fungsi Baru: Statistik Tahunan per User (Rekapan Tahunan)
// CATATAN: sama seperti bulanan — bila `attendance` sudah tergabung kunci,
// biarkan statusLocks kosong agar tidak dobel.
export const getYearlyStats = (year, attendance, userId, statusLocks = [], holidays = []) => {
    // 1. Gabungkan + filter logs untuk tahun tertentu & user tertentu
    const yearPrefix = `${year}-`;
    const merged = mergeAttendanceWithLocks(attendance, statusLocks, `${year}-01-01`, `${year}-12-31`, holidays);
    const userLogs = merged.filter(l =>
        l.userId === userId &&
        l.date.startsWith(yearPrefix) &&
        l.statusApproval === 'approved'
    );

    // 2. Definisi Bulan
    const months = [
        { id: '01', name: 'Januari' }, { id: '02', name: 'Februari' }, { id: '03', name: 'Maret' },
        { id: '04', name: 'April' }, { id: '05', name: 'Mei' }, { id: '06', name: 'Juni' },
        { id: '07', name: 'Juli' }, { id: '08', name: 'Agustus' }, { id: '09', name: 'September' },
        { id: '10', name: 'Oktober' }, { id: '11', name: 'November' }, { id: '12', name: 'Desember' }
    ];

    // 3. Loop setiap bulan untuk hitung stats
    const statsByMonth = months.map(m => {
        // Ambil log bulan ini
        const currentMonthLogs = userLogs.filter(l => l.date.startsWith(`${year}-${m.id}`));

        const stats = {
            Hadir: { p: 0, s: 0 },
            Sakit: { p: 0, s: 0 },
            Izin: { p: 0, s: 0 },
            Cuti: { p: 0, s: 0 },
            'Dinas Luar': { p: 0, s: 0 }
        };

        currentMonthLogs.forEach(log => {
             const status = log.status;
             const session = log.session;
             if (stats[status]) {
                if (session === 'Pagi') stats[status].p += 1;
                else if (session === 'Sore') stats[status].s += 1;
             }
        });

        // Alpa: hari EFEKTIF bulan ini (bukan Sabtu/Minggu/libur admin), s/d hari ini
        // (tanggal masa depan belum dihitung), dipecah per sesi (Pagi/Sore) supaya
        // konsisten dengan kategori lain -> Alpa Pagi = sesi Pagi hari itu TIDAK
        // punya catatan sama sekali (begitu juga Sore).
        const todayStr = getTodayString();
        const lastDayOfMonth = new Date(Number(year), Number(m.id), 0).getDate();
        let alpaP = 0, alpaS = 0;
        for (let d = 1; d <= lastDayOfMonth; d++) {
            const dateStr = `${year}-${m.id}-${String(d).padStart(2, '0')}`;
            if (dateStr > todayStr) break;
            if (isNonEffectiveDate(dateStr, holidays).isNonEffective) continue;
            const hasPagi = currentMonthLogs.some(l => l.date === dateStr && l.session === 'Pagi');
            const hasSore = currentMonthLogs.some(l => l.date === dateStr && l.session === 'Sore');
            if (!hasPagi) alpaP++;
            if (!hasSore) alpaS++;
        }

        // Total Hadir (lama) & Total Efektif (baru) = Hadir + Dinas Luar.
        const totalHadir = stats.Hadir.p + stats.Hadir.s;
        const totalDL = stats['Dinas Luar'].p + stats['Dinas Luar'].s;
        const totalEfektif = totalHadir + totalDL;

        return {
            monthName: m.name,
            stats,
            totalHadir,
            alpa: { p: alpaP, s: alpaS },
            totalEfektif
        };
    });

    return statsByMonth;
};

// Fungsi Baru: Papan Peringkat Kehadiran — khusus panel pegawai. Mengembalikan
// SELURUH pegawai terurut (bukan dipotong Top 10) — komponen pemanggil yang
// memutuskan mau tampil 10 teratas atau seluruhnya (lihat UserAttendanceLeaderboard.jsx).
// CATATAN: `attendance` DIHARAPKAN sudah hasil fetchAttendanceByRange (yakni
// sudah tergabung dengan kunci status admin), jadi di sini TIDAK perlu
// menggabungkan kunci lagi (beda dengan getDailyStats/getMonthlyStats yang
// menerima attendance mentah + statusLocks terpisah).
export const getAttendanceLeaderboard = (rangeStart, rangeEnd, employees, attendance, holidays = []) => {
  const pegawaiOnly = employees.filter(e => e.role === 'user');
  const todayStr = getTodayString();
  const effectiveEnd = rangeEnd > todayStr ? todayStr : rangeEnd;

  // Hari efektif dalam periode (Sabtu/Minggu/libur admin dilewati), dibatasi s/d hari ini.
  const effectiveDates = [];
  if (rangeStart <= effectiveEnd) {
    const cursor = new Date(`${rangeStart}T00:00:00`);
    const end = new Date(`${effectiveEnd}T00:00:00`);
    while (cursor <= end) {
      const dateStr = formatLocalDate(cursor);
      if (!isNonEffectiveDate(dateStr, holidays).isNonEffective) effectiveDates.push(dateStr);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  const totalEffectiveDays = effectiveDates.length;

  const board = pegawaiOnly.map((emp) => {
    const logs = attendance.filter(l =>
      l.userId === emp.id && l.date >= rangeStart && l.date <= effectiveEnd && l.statusApproval === 'approved'
    );

    // Persentase kehadiran keseluruhan: 1 hari dihitung sekali (Hadir ATAU Dinas Luar
    // di sesi manapun pada hari itu), sama seperti logika Rekapan Bulanan pegawai.
    const hadirDates = new Set(logs.filter(l => l.status === 'Hadir').map(l => l.date));
    const dlDates = new Set(logs.filter(l => l.status === 'Dinas Luar').map(l => l.date));
    const attendedDays = new Set([...hadirDates, ...dlDates]).size;
    const percentage = totalEffectiveDays > 0
      ? Math.min(100, Math.round((attendedDays / totalEffectiveDays) * 1000) / 10)
      : 0;

    // Rincian per sesi: berapa % hari Pagi & Sore terpenuhi (Hadir/Dinas Luar).
    const pagiDates = new Set(logs.filter(l => l.session === 'Pagi' && (l.status === 'Hadir' || l.status === 'Dinas Luar')).map(l => l.date));
    const soreDates = new Set(logs.filter(l => l.session === 'Sore' && (l.status === 'Hadir' || l.status === 'Dinas Luar')).map(l => l.date));
    const pagiPercent = totalEffectiveDays > 0 ? Math.min(100, Math.round((pagiDates.size / totalEffectiveDays) * 1000) / 10) : 0;
    const sorePercent = totalEffectiveDays > 0 ? Math.min(100, Math.round((soreDates.size / totalEffectiveDays) * 1000) / 10) : 0;

    // Rata-rata jam kerja aktif/hari: hanya dihitung dari hari yang punya catatan
    // ASLI Pagi & Sore (bertimestamp nyata) — record semu hasil kunci admin
    // (fromLock:true) tidak punya timestamp sehingga otomatis tidak ikut terhitung.
    let totalJam = 0, hariLengkap = 0;
    effectiveDates.forEach((dateStr) => {
      const pagiLog = logs.find(l => l.date === dateStr && l.session === 'Pagi' && l.timestamp);
      const soreLog = logs.find(l => l.date === dateStr && l.session === 'Sore' && l.timestamp);
      if (pagiLog && soreLog) {
        const jam = calcJamKerja(pagiLog.timestamp, soreLog.timestamp);
        if (jam > 0) { totalJam += jam; hariLengkap += 1; }
      }
    });
    const avgJamKerja = hariLengkap > 0 ? Math.round((totalJam / hariLengkap) * 10) / 10 : 0;

    return { emp, percentage, pagiPercent, sorePercent, avgJamKerja, attendedDays, totalEffectiveDays };
  });

  board.sort((a, b) => b.percentage - a.percentage || b.avgJamKerja - a.avgJamKerja || a.emp.nama.localeCompare(b.emp.nama));
  return board;
};
