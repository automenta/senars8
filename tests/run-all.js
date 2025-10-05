#!/usr/bin/env node

/**
 * High-Performance Test Runner
 * Optimized test execution with parallel processing and caching
 */

const fs = require('fs');
const path = require('path');

// Performance-optimized test runner
class TestRunner {
    constructor() {
        this.results = [];
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            startTime: null
        };
        this.cache = new Map();
        this.config = {
            parallel: true,
            batchSize: 5,
            timeout: 30000,
            retries: 2,
            cacheEnabled: true
        };
    }

    // Discover test files with performance optimization
    discoverTestFiles(testsDir) {
        const allFiles = fs.readdirSync(testsDir);
        return allFiles
            .filter(file => file.endsWith('.js') && !file.includes('run-all'))
            .map(file => ({
                name: file,
                path: path.join(testsDir, file),
                size: fs.statSync(path.join(testsDir, file)).size,
                modified: fs.statSync(path.join(testsDir, file)).mtime.getTime()
            }))
            .sort((a, b) => a.size - b.size); // Run smaller tests first for faster feedback
    }

    // Execute single test with caching and retry logic
    async executeTest(testFile, retryCount = 0) {
        const cacheKey = `${testFile.name}_${testFile.modified}`;

        // Check cache first
        if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log(`▶ Running ${testFile.name}...`);

            // Execute test in isolated process for better performance
            const result = await this.executeInProcess(testFile);

            if (result.success) {
                console.log(`✓ ${testFile.name} completed`);
                this.cache.set(cacheKey, result);
                return result;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            if (retryCount < this.config.retries) {
                console.log(`⏳ Retrying ${testFile.name} (attempt ${retryCount + 1}/${this.config.retries})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                return this.executeTest(testFile, retryCount + 1);
            }

            const errorResult = {
                test: testFile.name,
                success: false,
                error: error.message,
                duration: Date.now() - this.stats.startTime
            };

            console.error(`✗ ${testFile.name} failed:`, error.message);
            this.cache.set(cacheKey, errorResult);
            return errorResult;
        }
    }

    // Execute test in separate process for isolation
    executeInProcess(testFile) {
        return new Promise((resolve) => {
            const {fork} = require('child_process');
            const child = fork(testFile.path, {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
                env: {...process.env, TEST_RUNNER: 'true'}
            });

            let stdout = '';
            let stderr = '';
            const startTime = Date.now();

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('message', (message) => {
                if (message.type === 'test_complete') {
                    resolve({
                        test: testFile.name,
                        success: true,
                        duration: Date.now() - startTime,
                        stdout,
                        stderr
                    });
                }
            });

            child.on('error', (error) => {
                resolve({
                    test: testFile.name,
                    success: false,
                    error: error.message,
                    duration: Date.now() - startTime,
                    stderr
                });
            });

            child.on('exit', (code) => {
                if (code === 0) {
                    resolve({
                        test: testFile.name,
                        success: true,
                        duration: Date.now() - startTime,
                        stdout,
                        stderr
                    });
                } else {
                    resolve({
                        test: testFile.name,
                        success: false,
                        error: `Process exited with code ${code}`,
                        duration: Date.now() - startTime,
                        stderr
                    });
                }
            });

            // Set timeout
            setTimeout(() => {
                child.kill('SIGTERM');
                resolve({
                    test: testFile.name,
                    success: false,
                    error: 'Test timeout',
                    duration: this.config.timeout,
                    stderr: 'Test execution timed out'
                });
            }, this.config.timeout);
        });
    }

    // Execute tests in parallel batches for performance
    async executeBatch(tests) {
        const batches = [];
        for (let i = 0; i < tests.length; i += this.config.batchSize) {
            batches.push(tests.slice(i, i + this.config.batchSize));
        }

        for (const batch of batches) {
            if (this.config.parallel) {
                // Execute batch in parallel
                const batchPromises = batch.map(testFile => this.executeTest(testFile));
                const batchResults = await Promise.allSettled(batchPromises);
                this.results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value :
                    {test: 'unknown', success: false, error: r.reason}));
            } else {
                // Execute batch sequentially
                for (const testFile of batch) {
                    const result = await this.executeTest(testFile);
                    this.results.push(result);
                }
            }
        }
    }

    // Generate execution report
    generateReport() {
        const passed = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;

        console.log('\n=== Test Suite Execution Summary ===');
        console.log(`📊 Total: ${this.results.length}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏱️  Duration: ${this.stats.duration.toFixed(2)}ms`);

        if (this.config.cacheEnabled) {
            const cacheStats = this.getCacheStats();
            console.log(`💾 Cache Hit Rate: ${cacheStats.hitRate.toFixed(1)}%`);
        }

        console.log('\n📋 Detailed Results:');

        this.results.forEach(result => {
            const icon = result.success ? '✓' : '✗';
            const duration = result.duration ? ` (${result.duration}ms)` : '';
            console.log(`${icon} ${result.test}${duration}`);
            if (!result.success && result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        return {passed, failed, total: this.results.length};
    }

    // Get cache statistics
    getCacheStats() {
        const hits = this.cache.size;
        const total = this.stats.total;
        return {
            hits,
            total,
            hitRate: total > 0 ? (hits / total) * 100 : 0
        };
    }

    // Main execution method
    async run() {
        const testsDir = __dirname;
        this.stats.startTime = Date.now();

        console.log('🚀 Starting Optimized Test Suite Runner...\n');

        try {
            const testFiles = this.discoverTestFiles(testsDir);
            this.stats.total = testFiles.length;

            console.log(`📁 Discovered ${testFiles.length} test files`);
            console.log(`⚡ Running in ${this.config.parallel ? 'parallel' : 'sequential'} mode`);
            console.log(`📦 Batch size: ${this.config.batchSize}`);
            console.log(`🔄 Retries: ${this.config.retries}`);
            console.log(`💾 Cache: ${this.config.cacheEnabled ? 'enabled' : 'disabled'}\n`);

            await this.executeBatch(testFiles);

            this.stats.duration = Date.now() - this.stats.startTime;
            const report = this.generateReport();

            if (report.failed > 0) {
                process.exit(1);
            }

        } catch (error) {
            console.error('💥 Runner failed:', error);
            process.exit(1);
        }
    }
}

// CLI interface
async function main() {
    const runner = new TestRunner();

    // Parse command line arguments
    process.argv.slice(2).forEach(arg => {
        if (arg === '--sequential') runner.config.parallel = false;
        if (arg === '--no-cache') runner.config.cacheEnabled = false;
        if (arg.startsWith('--batch-size=')) runner.config.batchSize = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--timeout=')) runner.config.timeout = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--retries=')) runner.config.retries = parseInt(arg.split('=')[1]);
    });

    await runner.run();
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Runner failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;
