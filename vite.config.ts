import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const frontendPort = parseInt(process.env.FRONTEND_PORT || '5173', 10);
const serverPort = parseInt(process.env.PORT || process.env.SERVER_PORT || '8080', 10);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@client': path.resolve(__dirname, './client/src')
    }
  },
  server: {
    port: frontendPort,
    host: '0.0.0.0', // Accessible to all computers on the same LAN
    proxy: {
      // Proxy Socket.IO to the local game server during local development
      '/socket.io': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port: frontendPort,
    host: '0.0.0.0', // Production preview mode accessible on LAN
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  }
});

