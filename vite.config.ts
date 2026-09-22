import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // No GitHub Pages o site vive em /athenas-tcc/; localmente continua em /
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Vídeo grande em public/demo trava o file watcher no Windows (EBUSY)
    watch: {
      ignored: [
        '**/public/demo/modulo1-explicacao.mp4',
        '**/public/demo/modulo1-explicacao-web.mp4',
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js', '@supabase/ssr'],
        },
      },
    },
  },
})
