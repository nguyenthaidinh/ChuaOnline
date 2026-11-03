import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', proxy: { '/api/room': { target: 'http://127.0.0.1:8787', changeOrigin: false } }, fs: { deny: ['.env', '.env.*', '**/.git/**', '**/archive/**'] } },
  preview: { host: '127.0.0.1' },
});
