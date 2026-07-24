import { useState, useEffect } from 'react';

const QUERY = '(max-width: 767px)';

// Reaktif terhadap lebar layar (breakpoint md Tailwind) supaya UI mobile-native
// admin juga bisa langsung dipratinjau lewat browser (resize/dev-tools),
// tanpa perlu build APK, selain aktif otomatis di aplikasi native Capacitor.
export default function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
