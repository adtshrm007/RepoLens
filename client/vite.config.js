import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  build: {
    // Use esbuild for CSS minification — more lenient than Lightning CSS
    // (avoids parse errors on Vercel's Linux build environment with Vite 8)
    cssMinify: 'esbuild',
  },
  // Enable CJS/ESM interop for packages that Rolldown is stricter about
  legacy: {
    inconsistentCjsInterop: true,
  },
})
