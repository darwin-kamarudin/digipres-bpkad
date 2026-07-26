import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, getFirestore, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Cache lokal (IndexedDB) diaktifkan supaya onSnapshot() bisa langsung
// menyajikan data terakhir dari cache begitu app dibuka (tanpa menunggu
// round-trip network), lalu disinkron ulang di belakang layar begitu koneksi
// tersedia — mempercepat waktu LoadingScreen hilang saat cold start.
// persistentSingleTabManager dipakai (bukan multi-tab) karena app ini selalu
// berjalan sebagai satu WebView/instance saja (native app, bukan banyak tab browser).
// Fallback ke getFirestore() polos kalau initializeFirestore gagal (mis. WebView
// lama tanpa dukungan IndexedDB yang memadai) supaya app tetap bisa jalan.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
  });
} catch (error) {
  console.warn("Gagal mengaktifkan cache Firestore, memakai mode tanpa cache:", error);
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

// Helper Path (Tetap sama)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export const getCollectionPath = (collName) => {
    return collection(db, 'artifacts', appId, 'public', 'data', collName);
};