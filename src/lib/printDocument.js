import { isNativePlatform } from './geolocation';

// window.print() tidak melakukan apa pun di WebView aplikasi native Capacitor
// (tidak ada dialog cetak browser). Untuk aplikasi native, kita render ulang
// node dokumen sebagai HTML lengkap (disertai salinan seluruh CSS terkompilasi
// dari halaman, supaya kelas Tailwind tetap tampil sama) lalu kirim ke plugin
// native @capgo/capacitor-printer yang membuka dialog cetak/PDF asli Android/iOS.
const getAllStylesText = () => {
  let css = '';
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        css += rule.cssText + '\n';
      }
    } catch {
      // Stylesheet lintas-origin (jarang terjadi di WebView Capacitor) — lewati saja.
    }
  }
  return css;
};

export const printDocumentNode = async (node, jobName = 'Dokumen') => {
  if (!isNativePlatform()) {
    window.print();
    return;
  }
  if (!node) return;

  const { Printer } = await import('@capgo/capacitor-printer');
  const css = getAllStylesText();
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${node.outerHTML}</body></html>`;

  try {
    await Printer.printHtml({ name: jobName, html });
  } catch (err) {
    console.error('Gagal mencetak dokumen:', err);
    alert('Gagal membuka dialog cetak: ' + (err?.message || 'Kesalahan tidak diketahui'));
  }
};
