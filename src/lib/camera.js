import { CameraPreview } from '@capacitor-community/camera-preview';
import { isNativePlatform } from './geolocation';

// Abstraksi kamera selfie absensi.
// - Native (Capacitor): pakai @capacitor-community/camera-preview -> preview kamera
//   NATIVE dirender di belakang webview (toBack), sehingga UI custom (panduan oval,
//   shutter, dsb) tetap kita gambar sendiri di atasnya.
// - Web: fallback ke getUserMedia + <video>/<canvas> seperti sebelumnya.
//
// Agar preview native terlihat, area kamera + lapisan di atasnya (html/body/#root/
// container) harus TRANSPARAN. Itu diaktifkan lewat class body di bawah ini
// (lihat aturan `.native-camera-active` di src/index.css).
const BODY_CAMERA_CLASS = 'native-camera-active';

// Simpan stream web supaya bisa dihentikan saat stop/unmount.
let webStream = null;
let nativeActive = false;

// Arah rotasi koreksi saat hasil capture native keluar landscape.
// false = berlawanan jarum jam (90° CCW). Diuji di perangkat: CW membuat foto
// terbalik 180° (atas jadi bawah), jadi CCW yang benar.
const ROTATE_CLOCKWISE = false;

// Sebagian perangkat mengembalikan foto camera-preview dalam orientasi landscape
// (ter-rotasi 90° dari sensor). Normalkan jadi portrait: kalau lebar > tinggi,
// putar 90° lewat canvas. Kalau sudah portrait, kembalikan apa adanya.
const normalizeToPortrait = (dataUrl) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h || w <= h) {
      resolve(dataUrl); // sudah portrait / tidak diketahui
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = h;
    canvas.height = w;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((ROTATE_CLOCKWISE ? 1 : -1) * (Math.PI / 2));
    ctx.drawImage(img, -w / 2, -h / 2);
    resolve(canvas.toDataURL('image/jpeg', 0.9));
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

/**
 * Mulai kamera. Untuk web, isi videoEl.srcObject dengan stream.
 * @param {{ videoEl?: HTMLVideoElement, facing?: 'front' | 'back' }} opts
 * @returns {Promise<{ mode: 'native' | 'web' }>}
 */
export const startCamera = async ({ videoEl, facing = 'front' } = {}) => {
  if (isNativePlatform()) {
    // Preview native fullscreen di belakang webview.
    await CameraPreview.start({
      position: facing === 'back' ? 'rear' : 'front',
      toBack: true,
      disableAudio: true,
      x: 0,
      y: 0,
      width: window.screen.width,
      height: window.screen.height,
    });
    nativeActive = true;
    document.body.classList.add(BODY_CAMERA_CLASS);
    document.documentElement.classList.add(BODY_CAMERA_CLASS);
    return { mode: 'native' };
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing === 'back' ? 'environment' : 'user' },
  });
  webStream = stream;
  if (videoEl) videoEl.srcObject = stream;
  return { mode: 'web' };
};

/**
 * Ganti kamera depan <-> belakang. Aman dipanggil saat preview sedang aktif:
 * hentikan dulu preview lama lalu mulai lagi dengan arah baru (menghindari race
 * antara stop & start pada plugin native).
 * @param {{ videoEl?: HTMLVideoElement, facing?: 'front' | 'back' }} opts
 */
export const flipCamera = async ({ videoEl, facing = 'front' } = {}) => {
  await stopCamera({ videoEl });
  await startCamera({ videoEl, facing });
};

/**
 * Ambil foto -> kembalikan data URL JPEG (Base64) yang siap disimpan.
 * @returns {Promise<string|null>}
 */
export const capturePhoto = async ({ videoEl, canvasEl } = {}) => {
  if (isNativePlatform()) {
    const result = await CameraPreview.capture({ quality: 85 });
    // Plugin mengembalikan base64 TANPA prefix data URL.
    if (!result?.value) return null;
    const dataUrl = `data:image/jpeg;base64,${result.value}`;
    // Normalkan orientasi agar hasil tersimpan selalu portrait.
    return await normalizeToPortrait(dataUrl);
  }

  if (videoEl && canvasEl) {
    const context = canvasEl.getContext('2d');
    context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    return canvasEl.toDataURL('image/jpeg');
  }
  return null;
};

/**
 * Hentikan kamera & bersihkan lapisan transparan / stream.
 * Fail-safe: tidak melempar error walau preview sudah berhenti.
 */
export const stopCamera = async ({ videoEl } = {}) => {
  if (nativeActive) {
    document.body.classList.remove(BODY_CAMERA_CLASS);
    document.documentElement.classList.remove(BODY_CAMERA_CLASS);
    nativeActive = false;
    try {
      await CameraPreview.stop();
    } catch {
      // Sudah berhenti / belum sempat mulai -> abaikan.
    }
  }

  if (webStream) {
    webStream.getTracks().forEach((track) => track.stop());
    webStream = null;
  }
  if (videoEl && videoEl.srcObject) {
    videoEl.srcObject.getTracks?.().forEach((track) => track.stop());
    videoEl.srcObject = null;
  }
};
