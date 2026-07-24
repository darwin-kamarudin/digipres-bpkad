import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Plugin native custom (Java, android/app/src/main/java/.../MockLocationDetectorPlugin.java)
// yang membaca Location.isMock()/isFromMockProvider() langsung dari Android — sesuatu yang
// TIDAK diekspos oleh @capacitor/geolocation resmi.
const MockLocationDetector = registerPlugin('MockLocationDetector');

// Deteksi apakah aplikasi berjalan sebagai app native (dibungkus Capacitor)
// atau sekadar dibuka lewat browser/web view biasa.
export const isNativePlatform = () => {
  try {
    return Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
};

// Panggil plugin native custom untuk cek flag mock-location Android yang sesungguhnya.
// Fail-open (return false) kalau native call gagal, supaya pengguna sah tidak ikut terblokir
// hanya karena pemeriksaan tambahan ini bermasalah.
const checkNativeMockLocation = async () => {
  if (!isNativePlatform()) return false;
  try {
    const result = await MockLocationDetector.checkMockLocation();
    return !!result?.isMock;
  } catch (err) {
    console.warn('[geolocation] Gagal cek mock location native:', err);
    return false;
  }
};

// --- Heuristik deteksi mock location sisi klien (lapisan tambahan, bukan pengganti) ---
// Dipakai terutama di web, di mana plugin native custom di atas tidak berlaku.
const detectMockHeuristic = (coords) => {
  if (!coords) return false;
  // Aplikasi fake-GPS sering melaporkan akurasi persis 0 atau bilangan bulat "terlalu sempurna".
  if (coords.accuracy === 0) return true;
  // Kecepatan & altitude yang sama-sama null/0 dengan akurasi sangat tinggi juga mencurigakan,
  // tapi banyak perangkat asli juga begitu di dalam ruangan -> jangan jadikan blocker keras.
  return false;
};

const toResult = (coords, source) => ({
  lat: coords.latitude,
  lng: coords.longitude,
  accuracy: coords.accuracy,
  source,
  mockSuspected: detectMockHeuristic(coords),
});

// Untuk hasil dari plugin native: gabungkan heuristik lemah DENGAN hasil pengecekan
// Location.isMock()/isFromMockProvider() yang sesungguhnya lewat MockLocationDetector.
const toNativeResult = async (coords, source) => {
  const result = toResult(coords, source);
  const nativeMock = await checkNativeMockLocation();
  result.mockSuspected = result.mockSuspected || nativeMock;
  result.mockConfirmedNative = nativeMock;
  return result;
};

// Kode error asli dari native Android milik @capacitor/geolocation
// (lihat GeolocationErrors.kt di plugin) -> pesan yang mudah dipahami pengguna.
const NATIVE_ERROR_MESSAGES = {
  'OS-PLUG-GLOC-0002': 'Perangkat gagal mendapatkan lokasi (position unavailable). Coba pindah ke area dengan sinyal lebih baik.',
  'OS-PLUG-GLOC-0003': 'Izin lokasi ditolak oleh sistem Android.',
  'OS-PLUG-GLOC-0007': 'Location Services (GPS) perangkat sedang tidak aktif.',
  'OS-PLUG-GLOC-0010': 'Waktu tunggu habis saat mencari sinyal GPS. Coba lagi di area terbuka, atau tunggu beberapa saat lalu ulangi.',
  'OS-PLUG-GLOC-0014': 'Google Play Services meminta pengaturan lokasi tambahan (mis. aktifkan mode "Akurasi Tinggi" pada Pengaturan Lokasi perangkat).',
  'OS-PLUG-GLOC-0015': 'Google Play Services bermasalah. Pastikan aplikasi Google Play Services di perangkat sudah diperbarui ke versi terbaru.',
  'OS-PLUG-GLOC-0016': 'Pengaturan lokasi perangkat tidak sesuai/bermasalah.',
  'OS-PLUG-GLOC-0017': 'Jaringan dan Lokasi perangkat sama-sama nonaktif. Aktifkan salah satunya.',
};

// Melampirkan info error native asli (code + message) ke error yang dilempar,
// supaya bisa ditampilkan langsung di layar HP tanpa perlu remote debugging.
const attachNativeInfo = (err, sourceLabel) => {
  err.nativeCode = err?.code;
  err.nativeMessage = err?.message;
  err.friendlyNativeMessage = NATIVE_ERROR_MESSAGES[err?.code] || err?.message || 'Tidak ada detail tambahan.';
  err.nativeSource = sourceLabel;
  return err;
};

/**
 * Ambil posisi GPS saat ini.
 * Native (Capacitor): pakai plugin @capacitor/geolocation, dengan fallback ke
 * mode akurasi rendah (jaringan/WiFi/cell) jika fix GPS presisi tinggi gagal/timeout
 * — penting untuk kondisi di dalam ruangan di mana sinyal satelit GPS lemah.
 * Web: fallback ke navigator.geolocation browser dengan pola serupa.
 */
export const getCurrentPosition = async () => {
  if (isNativePlatform()) {
    // CATATAN: requestPermissions()/checkPermissions() milik @capacitor/geolocation
    // akan MELEMPAR ERROR (bukan sekadar return "denied") kalau Location Services
    // di level SISTEM ANDROID sedang dimatikan — bukan cuma soal izin aplikasi.
    let perm;
    try {
      perm = await Geolocation.requestPermissions();
    } catch (permError) {
      console.error('[geolocation] requestPermissions gagal:', permError);
      const err = new Error('LOCATION_SERVICES_DISABLED');
      err.code = 'LOCATION_SERVICES_DISABLED';
      err.cause = permError;
      throw attachNativeInfo(err, 'requestPermissions');
    }

    const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
    if (!granted) {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      return await toNativeResult(pos.coords, 'capacitor');
    } catch (highAccuracyError) {
      console.warn('[geolocation] high-accuracy gagal, coba fallback low-accuracy:', highAccuracyError);
      // Fix GPS presisi tinggi gagal/timeout (umum terjadi di dalam ruangan) ->
      // coba lagi pakai lokasi jaringan (lebih cepat, kurang presisi tapi tetap valid).
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
        return await toNativeResult(pos.coords, 'capacitor-network');
      } catch (lowAccuracyError) {
        console.error('[geolocation] low-accuracy fallback juga gagal:', lowAccuracyError);
        attachNativeInfo(highAccuracyError, 'high-accuracy');
        highAccuracyError.lowAccuracyNativeCode = lowAccuracyError?.code;
        highAccuracyError.lowAccuracyNativeMessage = lowAccuracyError?.message;
        throw highAccuracyError;
      }
    }
  }

  const getPosition = (options) => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const err = new Error('GEOLOCATION_UNSUPPORTED');
      err.code = 'GEOLOCATION_UNSUPPORTED';
      reject(err);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toResult(pos.coords, 'browser')),
      (err) => reject(err),
      options
    );
  });

  try {
    return await getPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  } catch (highAccuracyError) {
    try {
      return await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
    } catch {
      throw highAccuracyError;
    }
  }
};

// Jarak antar dua koordinat dalam meter (formula haversine)
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Titik geofence terdekat dari sebuah koordinat, beserta jaraknya (meter)
export const findNearestGeoFence = (lat, lng, geoLocations = []) => {
  let nearest = null;
  for (const loc of geoLocations) {
    const distance = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (!nearest || distance < nearest.distance) nearest = { ...loc, distance };
  }
  return nearest;
};

// Apakah koordinat berada dalam radius salah satu titik geofence
export const isWithinAnyGeoFence = (lat, lng, geoLocations = []) => {
  return geoLocations.some((loc) => haversineDistance(lat, lng, loc.lat, loc.lng) <= loc.radius);
};
