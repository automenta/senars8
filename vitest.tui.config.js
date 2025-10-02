import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tui/tests/**/*.test.js', 'tui/src/tests/**/*.test.js'],
        testTimeout: 30000,
        hookTimeout: 30000,
    },
    resolve: {
        alias: {
            '@core': path.resolve(__dirname, './core'),
            '@common': path.resolve(__dirname, './common'),
            '@agent': path.resolve(__dirname, './agent'),
            '@tui': path.resolve(__dirname, './tui/src'),
            '@': path.resolve(__dirname, './'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
});