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
        // Enable parallel execution for faster tests
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
                useAtomics: true
            }
        },
        // Faster test execution settings with CI optimization
        testTimeout: process.env.CI ? 15000 : 30000,
        hookTimeout: process.env.CI ? 5000 : 15000,
        bail: process.env.CI ? 3 : 1, // Stop on first few failures in CI for faster feedback
    },
});