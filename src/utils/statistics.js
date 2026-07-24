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
// ==========================================================================

const LOCK_SESSIONS = ['Pagi', 'Sore'];

// Daftar tanggal (YYYY-MM-DD) inklusif antara startDate..endDate.
const eachDateInRange = (startDate, endDate) => {
  const out = [];
  if (!startDate || !endDate || startDate > endDate) return out;
  const d = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

// Materialkan kunci -> record semu (berbentuk seperti attendance), dibatasi
// irisan [rangeStart, rangeEnd] agar tidak membangkitkan tanggal berlebihan.
export const expandLocksToRecords = (locks = [], rangeStart, rangeEnd) => {
  const records = [];
  locks.forEach((lock) => {
    if (!lock?.userId || !lock?.status || !lock?.startDate || !lock?.endDate) return;
    const start = rangeStart && lock.startDate < rangeStart ? rangeStart : lock.startDate;
    const end = rangeEnd && lock.endDate > rangeEnd ? rangeEnd : lock.endDate;
    eachDateInRange(start, end).forEach((dateStr) => {
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
export const mergeAttendanceWithLocks = (attendance = [], locks = [], rangeStart, rangeEnd) => {
  const pseudo = expandLocksToRecords(locks, rangeStart, rangeEnd);
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
export const getDailyStats = (date, session, employees, attendance, statusLocks = []) => {
    // 1. Gabungkan absensi nyata + kunci admin (absensi menang) untuk tanggal ini
    const merged = mergeAttendanceWithLocks(attendance, statusLocks, date, date);
    const logs = merged.filter(l => l.date === date && l.session === session && l.statusApproval === 'approved');

    // 2. Ambil hanya pegawai dengan role 'user'
    const pegawaiOnly = employees.filter(e => e.role === 'user');

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
export const getMonthlyStats = (month, attendance, statusLocks = []) => {
    // 1. Gabungkan + filter semua log di bulan tersebut
    const { start, end } = monthRange(month);
    const merged = mergeAttendanceWithLocks(attendance, statusLocks, start, end);
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
export const getYearlyStats = (year, attendance, userId, statusLocks = []) => {
    // 1. Gabungkan + filter logs untuk tahun tertentu & user tertentu
    const yearPrefix = `${year}-`;
    const merged = mergeAttendanceWithLocks(attendance, statusLocks, `${year}-01-01`, `${year}-12-31`);
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

        // Hitung total kehadiran efektif bulan ini
        const totalHadir = stats.Hadir.p + stats.Hadir.s;

        return {
            monthName: m.name,
            stats,
            totalHadir
        };
    });

    return statsByMonth;
};
