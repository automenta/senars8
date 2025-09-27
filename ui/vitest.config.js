import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/__tests__/**/*.test.jsx', 'src/tests/**/*.test.jsx', 'src/tests/react.test.jsx'],
    deps: {
      optimizer: {
        web: {
          include: ['react', '@testing-library/react'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, '../core'),
      '@common': path.resolve(__dirname, '../common'),
      '@': path.resolve(__dirname, './src'),
      '@ui': path.resolve(__dirname, './src'),
    },
  },
});