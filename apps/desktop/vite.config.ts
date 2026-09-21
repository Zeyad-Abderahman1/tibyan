import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          resolve: {
            alias: [
              { find: /^katex$/, replacement: path.resolve(__dirname, '../../node_modules/.pnpm/katex@0.18.7/node_modules/katex/dist/katex.js') },
            ],
          },
          build: {
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.cjs',
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: [
      { find: /^katex$/, replacement: path.resolve(__dirname, '../../node_modules/.pnpm/katex@0.18.7/node_modules/katex/dist/katex.js') },
    ],
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
