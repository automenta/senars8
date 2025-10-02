import { defineProject, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
    test: {
        globals: true,
        testTimeout: 300000,
        teardownTimeout: 300000,
    },
    projects: [
        defineProject({
            name: 'node',
            test: {
                environment: 'node',
                include: ['tests/**/*.test.js', 'tui/**/*.test.js'],
            },
            resolve: {
                alias: {
                    '@core': path.resolve(__dirname, './core'),
                    '@common': path.resolve(__dirname, './common'),
                    '@agent': path.resolve(__dirname, './agent'),
                    '@tui': path.resolve(__dirname, './tui/src'),
                    '@': path.resolve(__dirname, './'),
                },
            },
        }),
        defineProject({
            name: 'ui',
            plugins: [react()],
            test: {
                environment: 'jsdom',
                include: ['ui/src/**/*.test.{js,jsx}'],
                setupFiles: ['./ui/vitest.setup.js'],
            },
            resolve: {
                alias: {
                    '@core': path.resolve(__dirname, './core'),
                    '@common': path.resolve(__dirname, './common'),
                    '@agent': path.resolve(__dirname, './agent'),
                    '@ui': path.resolve(__dirname, './ui/src'),
                    '@': path.resolve(__dirname, './ui/src'),
                },
            },
        }),
    ],
});