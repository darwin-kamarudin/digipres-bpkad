import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Deteksi apakah aplikasi berjalan sebagai app native (dibungkus Capacitor)
// atau sekadar dibuka lewat browser/web view biasa.
export const isNativePlatform = () => {
  try {
    return Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
};

// --- Heuristik deteksi mock location sisi klien ---
// CATATAN: Capacitor Geolocation resmi TIDAK mengekspos Location.isFromMockProvider()
// milik Android. Untuk deteksi akurat, perlu plugin native custom (Kotlin) yang
// membaca flag tersebut. Fungsi ini hanya heuristik lemah sebagai lapisan tambahan,
// bukan pengganti plugin native tersebut.
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
  // Siap diisi begitu plugin native custom (isFromMockProvider) ditambahkan.
  mockSuspected: detectMockHeuristic(coords),
});

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
      throw err;
    }

    const granted = perm.location === 'granted' || perm.coarseLocation === 'granted';
    if (!granted) {
      const err = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      return toResult(pos.coords, 'capacitor');
    } catch (highAccuracyError) {
      console.warn('[geolocation] high-accuracy gagal, coba fallback low-accuracy:', highAccuracyError);
      // Fix GPS presisi tinggi gagal/timeout (umum terjadi di dalam ruangan) ->
      // coba lagi pakai lokasi jaringan (lebih cepat, kurang presisi tapi tetap valid).
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
        return toResult(pos.coords, 'capacitor-network');
      } catch (lowAccuracyError) {
        console.error('[geolocation] low-accuracy fallback juga gagal:', lowAccuracyError);
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
