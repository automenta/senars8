#!/usr/bin/env node

/**
 * Comprehensive Test Runner for SeNARS
 * Orchestrates all test suites and provides unified reporting
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test suite configurations
const TEST_SUITES = [
  {
    name: 'API Tests', 
    command: 'node',
    args: [join(__dirname, 'APITestSuite.js')],
    enabled: true
  },
  {
    name: 'Integration Tests',
    command: 'node', 
    args: [join(__dirname, 'IntegrationTestSuite.js')],
    enabled: true
  },
  {
    name: 'Unit Tests',
    command: 'npm run test:core',
    path: join(__dirname, '../core'),
    enabled: true
  },
  {
    name: 'UI E2E Tests',
    command: 'npx playwright test',
    path: join(__dirname, '../ui/tests'),
    enabled: false // Disabled by default due to complexity
  }
];

class TestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      parallel: options.parallel || false,
      timeout: options.timeout || 120000, // 2 minutes per suite
      ...options
    };
    this.results = [];
    this.startTime = null;
  }

  async run() {
    this.startTime = Date.now();
    console.log('🚀 Starting SeNARS Enhanced Test Suite Runner\\n');

    if (this.options.parallel) {
      await this.runParallel();
    } else {
      await this.runSequential();
    }

    this.printSummary();
    this.exitBasedOnResults();
  }

  async runSequential() {
    for (const suite of TEST_SUITES) {
      if (!suite.enabled) continue;
      
      console.log(`\\n📋 Running ${suite.name}...`);
      
      const suiteStart = Date.now();
      let result;
      
      try {
        result = await this.runTestSuite(suite);
        result.duration = Date.now() - suiteStart;
        
        if (result.success) {
          console.log(`✅ ${suite.name} PASSED (${result.duration}ms)`);
        } else {
          console.log(`❌ ${suite.name} FAILED (${result.duration}ms)`);
        }
      } catch (error) {
        result = {
          name: suite.name,
          success: false,
          error: error.message,
          duration: Date.now() - suiteStart
        };
        console.log(`💥 ${suite.name} ERROR: ${error.message} (${result.duration}ms)`);
      }
      
      this.results.push(result);
    }
  }

  async runParallel() {
    const promises = TEST_SUITES
      .filter(suite => suite.enabled)
      .map(suite => this.runTestSuiteWithTiming(suite));
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const suite = TEST_SUITES.filter(s => s.enabled)[index];
      if (result.status === 'fulfilled') {
        this.results.push(result.value);
        console.log(`📋 ${suite.name}: ${result.value.success ? 'PASSED' : 'FAILED'} (${result.value.duration}ms)`);
      } else {
        const errorResult = {
          name: suite.name,
          success: false,
          error: result.reason.message,
          duration: 0
        };
        this.results.push(errorResult);
        console.log(`📋 ${suite.name}: ERROR (${result.reason.message})`);
      }
    });
  }

  async runTestSuiteWithTiming(suite) {
    console.log(`📋 Starting ${suite.name}...`);
    const suiteStart = Date.now();
    const result = await this.runTestSuite(suite);
    result.duration = Date.now() - suiteStart;
    return result;
  }

  async runTestSuite(suite) {
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Test suite ${suite.name} timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      let command, args;
      
      if (suite.args) {
        // Use the command and args directly
        command = suite.command;
        args = suite.args;
      } else {
        // Parse npm script command
        const parts = suite.command.split(' ');
        command = parts[0];
        args = parts.slice(1);
      }

      // Change to suite directory if specified
      const originalDir = process.cwd();
      if (suite.path) {
        process.chdir(suite.path);
      }

      try {
        const child = spawn(command, args, {
          stdio: this.options.verbose ? 'inherit' : 'pipe',
          shell: true,
          env: { ...process.env, NODE_ENV: 'test' }
        });

        let stdout = '';
        let stderr = '';

        if (!this.options.verbose) {
          child.stdout.on('data', (data) => (stdout += data.toString()));
          child.stderr.on('data', (data) => (stderr += data.toString()));
        }

        child.on('close', (code) => {
          clearTimeout(timeout);
          
          // Restore original directory
          process.chdir(originalDir);
          
          const result = {
            name: suite.name,
            success: code === 0,
            exitCode: code,
            stdout,
            stderr,
            command: suite.command
          };

          if (code === 0) {
            resolve(result);
          } else {
            reject(new Error(`Test suite failed with exit code ${code}\\n${stderr}`));
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          process.chdir(originalDir);
          reject(error);
        });
      } catch (error) {
        clearTimeout(timeout);
        process.chdir(originalDir);
        reject(error);
      }
    });
  }

  printSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalTime = Date.now() - this.startTime;

    console.log('\\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) + '%' : '0%'}`);
    console.log(`Total Time: ${totalTime}ms`);

    if (failedTests > 0) {
      console.log('\\n❌ Failed Suites:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.stderr || r.error || 'Unknown error'}`);
        });
    }

    console.log('\\n📋 Suite Details:');
    this.results.forEach(r => {
      console.log(`  ${r.success ? '✅' : '❌'} ${r.name} (${r.duration || 0}ms)`);
    });
  }

  exitBasedOnResults() {
    const failedCount = this.results.filter(r => !r.success).length;
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
      case '--help':
      case '-h':
        console.log(`
SeNARS Test Runner

Usage: node run-enhanced-tests.js [options]

Options:
  -v, --verbose    Show detailed test output
  -p, --parallel   Run test suites in parallel
  -h, --help       Show this help message
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const runner = new TestRunner(options);
  
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default TestRunner;
export { TestRunner, TEST_SUITES };