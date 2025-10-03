import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@common': resolve(__dirname, '../common'),
            '@core': resolve(__dirname, '../core'),
            '@agent': resolve(__dirname, '../agent'),
            '@tui': resolve(__dirname, '.'),
            '@ui': resolve(__dirname, '../ui')
        }
    },
    test: {
        include: ['tests/**/*.test.js', 'src/tests/**/*.test.js'],
        exclude: [
            'node_modules/**',
            'dist/**',
            'cypress/**',
            '.*',
            'karma.*',
            'rollup.*',
            'webpack.*',
            'vite.*',
            'vitest.*',
            'jest.*',
            'ava.*',
            'babel.*',
            'nyc.*',
            'cypress.*',
            'tsup.*',
            'build.*',
            'eslint.*',
            'prettier.*'
        ],
        testTimeout: 30000,
        hookTimeout: 30000,
        globals: true  // Enable globals like describe, it, vi, etc.
    }
});