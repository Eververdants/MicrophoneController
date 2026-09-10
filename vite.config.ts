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
      input: resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
