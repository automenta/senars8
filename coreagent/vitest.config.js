import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    setupFiles: [],
    include: ['**/__tests__/**/*.test.js'],
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.config.js',
        '**/*.config.ts',
      ],
    },
  },
});