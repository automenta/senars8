#!/usr/bin/env node

/**
 * SeNARS Cognitive System Demo Runner
 * Executes all available demos to showcase different aspects of the system.
 */

const path = require('path');

async function main() {
    console.log("=== SeNARS Cognitive System Demo Runner ===\n");

    try {
        // Run all demos
        const runAllDemos = require('./demos/run-all.js');
        await runAllDemos();
    } catch (error) {
        console.error("Demo runner failed:", error);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = main;
