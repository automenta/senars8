#!/usr/bin/env node

/**
 * SeNARS Cognitive System Main Entry Point
 * Initializes and runs the complete cognitive system.
 */

const System = require('./src/system/System');

async function main() {
    console.log("=== SeNARS Cognitive System ===\n");
    
    try {
        // Create and start the system
        const system = new System();
        
        // Run for a limited number of cycles for demonstration
        await system.start(5); // Run 5 cycles then stop
        
        console.log("\n=== System Execution Complete ===");
    } catch (error) {
        console.error("System failed to start:", error);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = main;