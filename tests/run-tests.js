#!/usr/bin/env node

/**
 * High-Performance Test Runner
 * Optimized test execution with intelligent batching and caching
 */

import {OptimizedTestRunner, PerformanceMonitor, resetAllCaches} from './shared/test-utils.js';

// CLI interface for the optimized test runner
async function main() {
    console.log('🚀 Starting High-Performance Test Suite...\n');

    // Initialize performance monitoring
    PerformanceMonitor.start();

    // Reset all caches for clean test run
    resetAllCaches();

    const runner = new OptimizedTestRunner();

    // Parse command line arguments for configuration
    process.argv.slice(2).forEach(arg => {
        if (arg === '--sequential') runner.config.parallel = false;
        if (arg === '--no-cache') runner.config.cacheEnabled = false;
        if (arg.startsWith('--batch-size=')) runner.config.batchSize = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--timeout=')) runner.config.timeout = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--retries=')) runner.config.retries = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--max-concurrency=')) runner.config.maxConcurrency = parseInt(arg.split('=')[1]);
        if (arg === '--adaptive') runner.config.adaptiveBatching = true;
    });

    try {
        // Discover and execute tests with intelligent optimization
        const testsDir = process.cwd();
        const testFiles = await runner.discoverTests(testsDir);

        if (testFiles.length === 0) {
            console.log('❌ No test files found');
            process.exit(1);
        }

        const report = await runner.executeTests(testFiles);

        // End performance monitoring
        PerformanceMonitor.end();

        // Display comprehensive performance report
        const perfReport = PerformanceMonitor.getReport();
        console.log('\n📊 Performance Report:');
        console.log(`⏱️  Total Time: ${perfReport.totalTime.toFixed(2)}ms`);
        console.log(`💾 Cache Hit Rate: ${perfReport.cacheHitRate.toFixed(1)}%`);
        console.log(`🔄 Operations: ${perfReport.operations}`);
        console.log(`📈 Avg Operation Time: ${perfReport.averageOperationTime.toFixed(2)}ms`);
        console.log(`🧠 Memory Usage: ${(perfReport.memoryUsage / 1024 / 1024).toFixed(2)}MB`);

        // Exit with appropriate code
        if (report.failed > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Runner failed:', error);
        process.exit(1);
    });
}

export default OptimizedTestRunner;