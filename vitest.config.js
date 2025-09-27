import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 300000,
    teardownTimeout: 300000,
    projects: [
      {
        name: 'core',
        test: {
          environment: 'node',
          include: ['core/tests/**/*.test.js'],
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
          include: ['tui/tests/**/*.test.js', 'tui/src/tests/**/*.test.js'],
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
    ],
  },
});