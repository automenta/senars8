import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['<rootDir>/tests/**/*.spec.js'],
        alias: {
            '@core/': new URL('../core/', import.meta.url).pathname,
            '@common/': new URL('../common/', import.meta.url).pathname,
            '@/': new URL('./src/', import.meta.url).pathname,
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});