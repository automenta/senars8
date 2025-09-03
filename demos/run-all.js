#!/usr/bin/env node

/**
 * SeNARS Demos Runner
 * Executes all available demos to showcase different aspects of the system.
 */

const fs = require('fs');
const path = require('path');

// Get all demo files
const demosDir = path.join(__dirname);
const demoFiles = fs.readdirSync(demosDir)
    .filter(file => file.endsWith('.js') && file !== 'run-all.js')
    .sort();

// Put comprehensive-demo last since it's the most complex
const orderedDemoFiles = [
    ...demoFiles.filter(file => file !== 'comprehensive-demo.js'),
    ...demoFiles.filter(file => file === 'comprehensive-demo.js')
];

async function runAllDemos() {
    console.log("=== SeNARS Demos Runner ===\n");

    const results = [];

    for (const demoFile of orderedDemoFiles) {
        try {
            console.log(`\n▶ Running ${demoFile}...`);
            console.log("=".repeat(50));

            // Import and run the demo
            const demoModule = require(path.join(demosDir, demoFile));
            const result = await demoModule();
            results.push({demo: demoFile, success: true, result});

            console.log("=".repeat(50));
            console.log(`✓ ${demoFile} completed\n`);
        } catch (error) {
            console.error(`✗ ${demoFile} failed:`, error.message);
            results.push({demo: demoFile, success: false, error: error.message});
        }
    }

    // Summary
    console.log("\n=== Demos Execution Summary ===");
    let passed = 0;
    let failed = 0;

    for (const result of results) {
        if (result.success) {
            console.log(`✓ ${result.demo}`);
            passed++;
        } else {
            console.log(`✗ ${result.demo}: ${result.error}`);
            failed++;
        }
    }

    console.log(`\nTotal: ${results.length}, Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

// Run all demos if this file is executed directly
if (require.main === module) {
    runAllDemos().catch(error => {
        console.error("Runner failed:", error);
        process.exit(1);
    });
}

module.exports = runAllDemos;