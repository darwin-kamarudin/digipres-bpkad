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

/**
 * Mulai kamera. Untuk web, isi videoEl.srcObject dengan stream.
 * @returns {Promise<{ mode: 'native' | 'web' }>}
 */
export const startCamera = async ({ videoEl } = {}) => {
  if (isNativePlatform()) {
    // Preview native fullscreen di belakang webview.
    await CameraPreview.start({
      position: 'front',
      toBack: true,
      disableAudio: true,
      x: 0,
      y: 0,
      width: window.screen.width,
      height: window.screen.height,
    });
    nativeActive = true;
    document.body.classList.add(BODY_CAMERA_CLASS);
    return { mode: 'native' };
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  webStream = stream;
  if (videoEl) videoEl.srcObject = stream;
  return { mode: 'web' };
};

/**
 * Ambil foto -> kembalikan data URL JPEG (Base64) yang siap disimpan.
 * @returns {Promise<string|null>}
 */
export const capturePhoto = async ({ videoEl, canvasEl } = {}) => {
  if (isNativePlatform()) {
    const result = await CameraPreview.capture({ quality: 85 });
    // Plugin mengembalikan base64 TANPA prefix data URL.
    return result?.value ? `data:image/jpeg;base64,${result.value}` : null;
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
