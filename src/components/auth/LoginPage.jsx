import React from 'react';
import { isNativePlatform } from '../../lib/geolocation';
import LoginPageMobile from './LoginPageMobile';
import LoginPageWeb from './LoginPageWeb';

// UI login web dan aplikasi mobile (Capacitor) SENGAJA dipisah jadi dua
// komponen berbeda (LoginPageWeb / LoginPageMobile), bukan satu tampilan yang
// dipaksakan untuk keduanya. Router sederhana ini memilih berdasarkan platform
// aktual saat runtime, bukan ukuran layar.
export default function LoginPage(props) {
  return isNativePlatform() ? <LoginPageMobile {...props} /> : <LoginPageWeb {...props} />;
}
