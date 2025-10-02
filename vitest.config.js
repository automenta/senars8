import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@core': path.resolve(__dirname, './core'),
            '@core/': path.resolve(__dirname, './core/'),
            '@common': path.resolve(__dirname, './common'),
            '@common/': path.resolve(__dirname, './common/'),
            '@agent': path.resolve(__dirname, './agent'),
            '@agent/': path.resolve(__dirname, './agent/'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    test: {
        globals: true,
        testTimeout: 300000,
        teardownTimeout: 300000,
        projects: [
            {
                name: 'core',
                test: {
                    environment: 'node',
                    include: [
                        'tests/unit/**/*.test.js',
                        'tests/integration/**/*.test.js',
                        'tests/parser/**/*.test.js',
                        'tests/reasoner/**/*.test.js',
                        'tests/system/**/*.test.js',
                        'tests/demos/**/*.test.js',
                    ],
                },
                resolve: {
                    alias: {
                        '@': path.resolve(__dirname, './'),
                        '@/': path.resolve(__dirname, './'),
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
                        '@': path.resolve(__dirname, './tui/src'),
                        '@/': path.resolve(__dirname, './tui/src/'),
                        '@tui': path.resolve(__dirname, './tui/src'),
                        '@tui/': path.resolve(__dirname, './tui/src/'),
                    },
                },
            },
            {
                name: 'ui',
                plugins: [react()],
                test: {
                    globals: true,
                    environment: 'jsdom',
                    setupFiles: ['./ui/vitest.setup.js'],
                    include: ['ui/src/**/__tests__/**/*.{test,spec}.{js,jsx}', 'ui/src/tests/**/*.{test,spec}.{js,jsx}'],
                },
                resolve: {
                    alias: {
                        '@': path.resolve(__dirname, './ui/src'),
                        '@/': path.resolve(__dirname, './ui/src/'),
                        '@ui': path.resolve(__dirname, './ui/src'),
                        '@ui/': path.resolve(__dirname, './ui/src/'),
                    },
                },
            },
        ],
    },
});