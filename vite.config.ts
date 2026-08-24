import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@client': path.resolve(__dirname, './client/src')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
