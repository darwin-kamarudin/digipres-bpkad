import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { isNativePlatform } from './geolocation';

// Cek apakah perangkat mendukung & sudah mendaftarkan sidik jari/wajah untuk login.
export const isBiometricAvailable = async () => {
  if (!isNativePlatform()) return false;
  try {
    const result = await BiometricAuth.checkBiometry();
    return !!result.isAvailable;
  } catch {
    return false;
  }
};

// Munculkan dialog verifikasi sidik jari native. Resolve jika berhasil,
// melempar error (BiometryError) jika gagal/dibatalkan.
export const authenticateWithBiometric = async (reason = 'Masuk ke aplikasi dengan sidik jari') => {
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: 'Batal',
    androidTitle: 'Verifikasi Sidik Jari',
    androidSubtitle: reason,
    allowDeviceCredential: true,
  });
};
