#!/usr/bin/env node

/**
 * SeNARS Test Suite Runner
 * Executes all available tests.
 */

const fs = require('fs');
const path = require('path');

// Get all test files
const testsDir = path.join(__dirname);
const testFiles = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.js') && file !== 'run-all.js')
    .sort();

async function runAllTests() {
    console.log("=== SeNARS Test Suite Runner ===\n");

    const results = [];

    for (const testFile of testFiles) {
        try {
            console.log(`\n▶ Running ${testFile}...`);
            console.log("=".repeat(50));

            // Import and run the test
            require(path.join(testsDir, testFile));
            results.push({test: testFile, success: true});

            console.log("=".repeat(50));
            console.log(`✓ ${testFile} completed\n`);
        } catch (error) {
            console.error(`✗ ${testFile} failed:`, error.message);
            results.push({test: testFile, success: false, error: error.message});
        }
    }

    // Summary
    console.log("\n=== Test Suite Execution Summary ===");
    let passed = 0;
    let failed = 0;

    for (const result of results) {
        if (result.success) {
            console.log(`✓ ${result.test}`);
            passed++;
        } else {
            console.log(`✗ ${result.test}: ${result.error}`);
            failed++;
        }
    }

    console.log(`\nTotal: ${results.length}, Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

// Run all tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error("Runner failed:", error);
        process.exit(1);
    });
}

module.exports = runAllTests;
