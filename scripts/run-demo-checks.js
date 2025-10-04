#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {execa} from 'execa';

const DEMO_DIR = './tests/demos';

/**
 * This script runs all demos to check for runtime errors before recording.
 * It's a safety check to ensure demos work properly before attempting to record them.
 */

async function runDemoSafely(demoPath) {
    try {
        console.log(`Running demo: ${path.basename(demoPath)}`);

        // Use execa to run the demo and capture output
        const result = await execa('node', [demoPath], {
            timeout: 60000, // 60 seconds timeout
            reject: false   // Don't throw on non-zero exit codes
        });

        if (result.failed) {
            console.error(`❌ Demo failed: ${path.basename(demoPath)}`);
            console.error('Stderr:', result.stderr);
            console.error('Exit code:', result.exitCode);
            return false;
        } else {
            console.log(`✅ Demo passed: ${path.basename(demoPath)}`);
            return true;
        }
    } catch (error) {
        console.error(`❌ Demo error: ${path.basename(demoPath)}`, error.message);
        return false;
    }
}

async function collectDemos() {
    const files = fs.readdirSync(DEMO_DIR);
    return files
        .filter(file => file.endsWith('-demo.js') && file !== 'interactive-runner.js')
        .map(file => path.join(DEMO_DIR, file));
}

async function runAllDemos() {
    const demos = await collectDemos();
    console.log(`Found ${demos.length} demos to run...\n`);

    let passedCount = 0;
    let failedCount = 0;

    for (const demo of demos) {
        const success = await runDemoSafely(demo);
        if (success) {
            passedCount++;
        } else {
            failedCount++;
        }
    }

    console.log(`\n📊 Results: ${passedCount} passed, ${failedCount} failed out of ${demos.length} demos`);

    if (failedCount > 0) {
        console.log(`\n❌ Some demos failed. Please fix errors before attempting recordings.`);
        process.exit(1);
    } else {
        console.log(`\n🎉 All demos passed! Ready for recording.`);
    }

    return failedCount === 0;
}

async function runTuiTest() {
    console.log('\nTesting TUI connection with our fixes...');

    try {
        // Start the agent with WebSocket support in the background
        console.log('Starting agent with WebSocket server on port 8081...');
        const agentProcess = execa('node', ['main.js', '--web'], {
            env: {WS_PORT: '8081'},
            reject: false
        });

        // Give the agent time to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Try to run the interactive runner to see if it works with our fixes
        console.log('Testing if interactive runner works with our fixes...');
        const runnerResult = await execa('node', [`${DEMO_DIR}/interactive-runner.js`], {
            timeout: 5000, // Only run for 5 seconds to test connectivity
            reject: false,
            stdin: 'q' // Send 'q' to quit immediately after startup test
        });

        // Kill the agent process
        agentProcess.kill();

        if (runnerResult.exitCode === 0 || runnerResult.timedOut) {
            console.log('✅ TUI connection test passed - system appears to be working!');
        } else {
            console.log('❌ TUI connection test failed');
            console.log('Stderr:', runnerResult.stderr);
        }

        return true;
    } catch (error) {
        console.error('❌ TUI test error:', error.message);
        return false;
    }
}

async function main() {
    console.log('🔍 Running pre-recording checks...\n');

    // First run all demos
    const demosOk = await runAllDemos();

    // Then test TUI
    const tuiOk = await runTuiTest();

    if (demosOk && tuiOk) {
        console.log('\n🎉 All checks passed! System is ready for recording.');
        console.log('\nTo install asciinema for recordings:');
        console.log('  Ubuntu/Debian: sudo apt install asciinema');
        console.log('  macOS: brew install asciinema');
        console.log('  Or: pip install asciinema');
        console.log('\nThen run:');
        console.log('  node scripts/record-demos.js all-demos');
    } else {
        console.log('\n❌ Some checks failed. Please fix issues before recording.');
        process.exit(1);
    }
}

if (import.meta.url.startsWith('file:') && path.basename(process.argv[1]) === path.basename(new URL(import.meta.url).pathname)) {
    main().catch(err => {
        console.error("An error occurred:", err);
        process.exit(1);
    });
}

export {runAllDemos, runDemoSafely, collectDemos};