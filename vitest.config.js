import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 300000,
    teardownTimeout: 300000,
  },
  projects: [
    {
      name: 'core',
      test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
      },
      resolve: {
        alias: {
          '@core': new URL('./core', import.meta.url).pathname,
        },
      },
    },
    {
      name: 'tui',
      test: {
        environment: 'node',
        include: ['tui/tests/**/*.test.js'],
        deps: {
          inline: ['blessed'],
        },
      },
      resolve: {
        alias: {
          '@core': new URL('./core', import.meta.url).pathname,
          '@common': new URL('./common', import.meta.url).pathname,
          '@': new URL('./tui/src', import.meta.url).pathname,
        },
      },
    },
    {
      name: 'ui',
      plugins: [react()],
      test: {
        environment: 'jsdom',
        include: ['ui/src/**/__tests__/**/*.test.jsx', 'ui/src/tests/**/*.test.js'],
        setupFiles: ['./ui/vitest.setup.js'],
      },
      resolve: {
        alias: {
          '@core': new URL('./core', import.meta.url).pathname,
          '@common': new URL('./common', import.meta.url).pathname,
          '@': new URL('./ui/src', import.meta.url).pathname,
          '@ui': new URL('./ui/src', import.meta.url).pathname,
        },
      },
    },
  ],
});