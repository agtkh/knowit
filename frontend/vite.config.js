//vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const KNOWIT_API_PORT = process.env.KNOWIT_API_PORT;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${KNOWIT_API_PORT}`,
        changeOrigin: true
      },
    },
  },
});