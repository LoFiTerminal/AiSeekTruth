import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      entry: 'src/main/main.js',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: [
              'electron',
              'better-sqlite3',
              'gun',
              'libsodium-wrappers-sumo',
            ],
          },
        },
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
});
