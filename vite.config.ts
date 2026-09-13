import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 8864,
    strictPort: true,
    // `tauri dev` loads the frontend from this server, which transforms modules
    // on demand. Warming the initial import graph up front removes the request
    // waterfall that otherwise stretches time-to-first-paint in development.
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/components/**/*.tsx'],
    },
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Two entry points: the main window and the mute/volume overlay, which is
      // its own window (see the `osd` entry in src-tauri/tauri.conf.json).
      input: {
        main: resolve(__dirname, 'index.html'),
        osd: resolve(__dirname, 'osd.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
