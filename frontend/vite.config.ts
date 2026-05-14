import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 15173,
    proxy: {
      '/api': {
        target: 'http://localhost:18081',
        changeOrigin: true
      }
    }
  }
});
