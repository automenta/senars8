import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./ui/vitest.setup.js'],
        include: ['ui/src/**/__tests__/**/*.{test,spec}.{js,jsx}', 'ui/src/tests/**/*.{test,spec}.{js,jsx}'],
    },
    resolve: {
        alias: {
            '@core': path.resolve(__dirname, './core'),
            '@core/': path.resolve(__dirname, './core/'),
            '@common': path.resolve(__dirname, './common'),
            '@common/': path.resolve(__dirname, './common/'),
            '@agent': path.resolve(__dirname, './agent'),
            '@agent/': path.resolve(__dirname, './agent/'),
            '@': path.resolve(__dirname, './ui/src'),
            '@/': path.resolve(__dirname, './ui/src/'),
            '@ui': path.resolve(__dirname, './ui/src'),
            '@ui/': path.resolve(__dirname, './ui/src/'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
});