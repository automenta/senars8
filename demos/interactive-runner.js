#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEMO_DIR = __dirname;

function getDemoFiles() {
    return fs.readdirSync(DEMO_DIR)
        .filter(file => file.endsWith('-demo.js') && file !== 'run-all.js' && file !== 'interactive-runner.js');
}

async function runDemo(demoFile) {
    try {
        console.log(`\n=== Running ${demoFile} ===`);
        const demo = require(path.join(DEMO_DIR, demoFile));
        await demo();
        console.log(`\n=== Finished ${demoFile} ===`);
    } catch (error) {
        console.error(`Error running ${demoFile}:`, error.message);
    }
}

async function main() {
    const demoFiles = getDemoFiles();
    if (demoFiles.length === 0) {
        console.log("No demos found.");
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("=== SeNARS Cognitive System Demo Runner ===");
    demoFiles.forEach((file, index) => {
        console.log(`${index + 1}: ${file}`);
    });
    console.log("0: Run all demos");

    rl.question('\nEnter the number of the demo to run (or 0 for all): ', async (answer) => {
        const choice = parseInt(answer, 10);

        if (isNaN(choice) || choice < 0 || choice > demoFiles.length) {
            console.log("Invalid choice.");
            rl.close();
            return;
        }

        if (choice === 0) {
            for (const file of demoFiles) {
                await runDemo(file);
            }
        } else {
            await runDemo(demoFiles[choice - 1]);
        }

        rl.close();
    });
}

if (require.main === module) {
    main().catch(err => {
        console.error("An unexpected error occurred:", err);
        process.exit(1);
    });
}

module.exports = {main, getDemoFiles, runDemo};
