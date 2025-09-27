import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./ui/vitest.setup.js'],
    include: ['ui/src/**/__tests__/**/*.test.jsx', 'ui/src/tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@core': new URL('./core', import.meta.url).pathname,
      '@common': new URL('./common', import.meta.url).pathname,
      '@': new URL('./ui/src', import.meta.url).pathname,
      '@ui': new URL('./ui/src', import.meta.url).pathname,
    },
  },
});