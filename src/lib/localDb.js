// Penyimpanan lokal berbasis IndexedDB — dipakai untuk sesi login otomatis
// dan foto profil (khusus disimpan di perangkat, TIDAK dikirim ke Firebase).

const DB_NAME = 'absensi_app_db';
const DB_VERSION = 3;
const STORE_SESSION = 'session';
const STORE_PROFILE_PHOTOS = 'profilePhotos';
const STORE_LOCATION_PING = 'lastLocationPing';
const STORE_LAMPIRAN_FOTO_HARIAN = 'lampiranFotoHarian';
const SESSION_KEY = 'current';

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('INDEXEDDB_UNSUPPORTED'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSION)) db.createObjectStore(STORE_SESSION);
      if (!db.objectStoreNames.contains(STORE_PROFILE_PHOTOS)) db.createObjectStore(STORE_PROFILE_PHOTOS);
      if (!db.objectStoreNames.contains(STORE_LOCATION_PING)) db.createObjectStore(STORE_LOCATION_PING);
      if (!db.objectStoreNames.contains(STORE_LAMPIRAN_FOTO_HARIAN)) db.createObjectStore(STORE_LAMPIRAN_FOTO_HARIAN);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    // PENTING: jangan simpan Promise yang REJECTED sebagai cache permanen —
    // kalau tidak, satu kegagalan sesaat (mis. race condition saat cold start)
    // akan membuat IndexedDB gagal terus selama sesi aplikasi berjalan.
    dbPromise = null;
    throw err;
  });
  return dbPromise;
};

const idbGet = async (store, key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
};

const idbSet = async (store, key, value) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (store, key) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// --- Sesi login (untuk auto-login & login sidik jari) ---
export const saveSession = (user) => idbSet(STORE_SESSION, SESSION_KEY, user)
  .catch((err) => console.error('[localDb] Gagal menyimpan sesi login:', err));
export const loadSession = () => idbGet(STORE_SESSION, SESSION_KEY)
  .catch((err) => { console.error('[localDb] Gagal memuat sesi login:', err); return null; });
export const clearSession = () => idbDelete(STORE_SESSION, SESSION_KEY)
  .catch((err) => console.error('[localDb] Gagal menghapus sesi login:', err));

// --- Ping lokasi terakhir terdeteksi DI DALAM radius kantor (per user) ---
// Dipakai sebagai perkiraan "jam pulang" otomatis kalau pegawai lupa/tidak
// sempat melakukan absensi pulang mandiri (lihat computeJamKerja di utils/jamKerja.js).
export const saveLastLocationPing = (userId, data) => idbSet(STORE_LOCATION_PING, userId, data)
  .catch((err) => console.error('[localDb] Gagal menyimpan ping lokasi:', err));
export const loadLastLocationPing = (userId) => idbGet(STORE_LOCATION_PING, userId)
  .catch((err) => { console.error('[localDb] Gagal memuat ping lokasi:', err); return null; });

// --- Foto profil (per user, disimpan sebagai Blob, tidak pernah ke Firebase) ---
export const saveProfilePhoto = (userId, blob) => idbSet(STORE_PROFILE_PHOTOS, userId, blob);
export const loadProfilePhoto = (userId) => idbGet(STORE_PROFILE_PHOTOS, userId);
export const clearProfilePhoto = (userId) => idbDelete(STORE_PROFILE_PHOTOS, userId);

// --- Lampiran Foto Laporan Harian (per tanggal+sesi, disimpan sebagai array
// data URL base64 di PERANGKAT saja) — supaya foto dokumentasi apel yang
// dipilih admin saat mau cetak TIDAK perlu diunggah/disimpan ke Firebase,
// menghemat kuota database, tapi tetap tersedia lagi kalau laporan tanggal
// yang sama dibuka ulang (sampai dihapus manual lewat clearLampiranFotoHarian).
export const saveLampiranFotoHarian = (key, fotos) => idbSet(STORE_LAMPIRAN_FOTO_HARIAN, key, fotos)
  .catch((err) => console.error('[localDb] Gagal menyimpan lampiran foto laporan harian:', err));
export const loadLampiranFotoHarian = (key) => idbGet(STORE_LAMPIRAN_FOTO_HARIAN, key)
  .catch((err) => { console.error('[localDb] Gagal memuat lampiran foto laporan harian:', err); return null; });
export const clearLampiranFotoHarian = (key) => idbDelete(STORE_LAMPIRAN_FOTO_HARIAN, key)
  .catch((err) => console.error('[localDb] Gagal menghapus lampiran foto laporan harian:', err));
