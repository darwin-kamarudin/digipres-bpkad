import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Mode "mobile" (Capacitor) butuh path relatif agar asset ter-resolve
  // dari webview lokal; mode "web" (GitHub Pages/custom domain) tetap absolut.
  base: mode === 'mobile' ? './' : '/',
}))
