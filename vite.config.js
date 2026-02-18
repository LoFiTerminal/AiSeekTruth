import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
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
      },
      {
        entry: 'src/main/preload.js',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      {
        entry: 'src/main/crypto.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['libsodium-wrappers-sumo'],
            },
          },
        },
      },
      {
        entry: 'src/main/storage.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3', 'electron'],
            },
          },
        },
      },
      {
        entry: 'src/main/messaging.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['./crypto', './storage', './p2p'],
            },
          },
        },
      },
      {
        entry: 'src/main/p2p.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['gun', 'events'],
            },
          },
        },
      },
    ]),
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
