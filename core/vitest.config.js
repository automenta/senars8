import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['<rootDir>/tests/**/*.spec.js'],
        alias: {
            '@core/': new URL('./', import.meta.url).pathname,
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});