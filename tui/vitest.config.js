import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        exclude: ['tests/**/*.spec.js'],
        alias: {
            '@senars/common': '../common',
            '@senars/core': '../core',
        },
        // Enable parallel execution for faster tests
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
                useAtomics: true
            }
        },
        // Faster test execution settings
        testTimeout: 20000,
        hookTimeout: 10000,
        bail: 1, // Stop on first failure for faster feedback
        reporter: 'verbose',
        // Run tests in parallel where possible
        maxConcurrency: 4,
    },
});