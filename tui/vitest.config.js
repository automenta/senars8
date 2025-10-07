import {defineConfig} from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@senars/common': path.resolve(__dirname, '../common'),
            '@senars/core': path.resolve(__dirname, '../core'),
        },
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        exclude: ['tests/**/*.spec.js'],
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