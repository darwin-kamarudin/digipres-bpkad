export const DEFAULT_LOGO_URL = "https://play-lh.googleusercontent.com/FXc0mf6YaPS9bgd1JIUN8AHu-y53Ukbz0lW3hmD3F4CR9xXuMO6TrXqxqnm_-PcA9UfD=w600-h300-pc0xffffff-pd";

export const INITIAL_SETTINGS = {
  opdName: 'Badan Pengelolaan Keuangan dan Aset Daerah',
  opdShort: 'BPKAD',
  parentAgency: 'Pemerintah Kabupaten Pulau Taliabu',
  address: 'Jl. Merdeka No. 1, Bobong, Pulau Taliabu',
  logoUrl: DEFAULT_LOGO_URL,
  kepalaName: 'Nama Kepala Dinas',
  kepalaNip: '19xxxxxxxxxxxxxx',
  kepalaJabatan: 'Kepala Badan',
  titimangsa: 'Bobong',
  // Default Waktu
  jamMasukAwal: '06:00',
  batasAbsenPagi: '10:00',
  jamSiangAwal: '13:00',
  batasAbsenSiang: '14:00',
  jamPulangAwal: '16:00',
  batasAbsenSore: '18:00',
  zonaWaktu: 'Auto', // Auto, WIB, WITA, WIT
  // Geo Lokasi Absensi
  geoFenceEnabled: false,
  geoLocations: [], // [{ id, name, lat, lng, radius }]
  // Mode Aplikasi: jika true, absensi wajib lewat aplikasi mobile (Capacitor), akses web diblokir
  mobileOnlyAbsensi: false,
};

// Pemetaan sesi absensi ke slot jadwal kantor
export const SESSION_LABELS = {
  Pagi: 'Check In',
  Siang: 'Day In',
  Sore: 'Check Out',
};

export const formatDateIndo = (dateStr) => {
  if (!dateStr) return '';
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
};

export const formatDateNoWeekday = (dateStr) => {
  if (!dateStr) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
};

export const getTodayString = (customDate = null) => {
  const now = customDate || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
};

// --- SECURITY UPDATE: Check Time menerima parameter customDate ---
export const checkAbsensiTime = (session, customDate = null) => {
  const now = customDate || new Date();
  const hour = now.getHours();
  // Pagi: 06.00 - 09.00
  if (session === 'Pagi') {
    return hour >= 6 && hour < 9;
  }
  // Siang: 13.00 - 14.00
  if (session === 'Siang') {
    return hour >= 13 && hour < 14;
  }
  // Sore: 16.00 - 18.00
  if (session === 'Sore') {
    return hour >= 16 && hour < 18;
  }
  return false;
};

// --- Deteksi perangkat sederhana berdasarkan User Agent ---
export const getDeviceType = () => {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'web';
};

// --- Hitung durasi jam kerja (format HH:MM) antara dua waktu ISO ---
export const calcJamKerja = (startIso, endIso) => {
  if (!startIso || !endIso) return 0;
  const diffMs = new Date(endIso) - new Date(startIso);
  if (diffMs <= 0) return 0;
  return Math.round((diffMs / 3600000) * 10) / 10;
};

// --- Hari non-efektif (bukan hari kerja): Sabtu/Minggu otomatis libur akhir
// pekan, atau tanggal yang terdaftar sebagai hari libur nasional/cuti bersama. ---
export const isNonEffectiveDate = (dateStr, holidays = []) => {
  const d = new Date(`${dateStr}T00:00:00`);
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  const holiday = holidays.find(h => h.date === dateStr) || null;
  return { isNonEffective: isWeekend || !!holiday, isWeekend, holiday };
};

// --- SECURITY UPDATE: Fetch Real Server Time ---
export const fetchServerTime = async () => {
  try {
    const response = await fetch('/', { method: 'HEAD', cache: 'no-store' });
    const dateString = response.headers.get('Date');
    if (dateString) {
      return new Date(dateString);
    }
    return new Date(); 
  } catch (e) {
    console.warn("Gagal mengambil waktu server, menggunakan waktu lokal:", e);
    return new Date();
  }
};

// --- FUNGSI BARU: Penyesuaian Zona Waktu ---
export const adjustTimezone = (date, zone) => {
  if (!date) return new Date();
  if (!zone || zone === 'Auto') return date; // Gunakan waktu lokal perangkat

  // Mapping Offset (GMT/UTC)
  const offsets = {
    'WIB': 7,
    'WITA': 8,
    'WIT': 9
  };

  const targetOffset = offsets[zone];
  if (!targetOffset) return date;

  // 1. Dapatkan waktu UTC murni dalam milidetik (dikurangi offset lokal)
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);

  // 2. Tambahkan offset target (Jam * 60 menit * 60 detik * 1000 ms)
  const newTime = utc + (3600000 * targetOffset);

  return new Date(newTime);
};

export const HEADER_TITLES = {
  '/': 'Dashboard',
  '/manajemen-absensi': 'Manajemen Absensi',
  '/laporan-harian': 'Laporan Harian',
  '/laporan-bulanan': 'Rekapan Bulanan',
  '/rekapan-tahunan': 'Rekapan Tahunan',
  '/cetak-manual': 'Cetak Manual',
  '/data-pegawai': 'Data Pegawai',
  '/settings': 'Pengaturan',
  '/absensi-mandiri': 'Absensi Mandiri',
  '/riwayat-absensi': 'Riwayat Absensi',
  '/status-lokasi': 'Status Lokasi Absensi',
  '/pengaturan': 'Pengaturan',
};

export const getHeaderTitle = (pathname) => HEADER_TITLES[pathname] || 'Aplikasi Absensi';

export const exportToCSV = (data, filename) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + data.map(e => Object.values(e).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};