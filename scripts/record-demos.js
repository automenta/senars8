#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execa } from 'execa';
import readline from 'readline';

const DEMO_DIR = './tests/demos';
const RECORDINGS_DIR = './docs/screenshots/demos';
const TEST_RECORDINGS_DIR = './docs/screenshots/unit_tests';

// Create recording directories if they don't exist
if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

if (!fs.existsSync(TEST_RECORDINGS_DIR)) {
    fs.mkdirSync(TEST_RECORDINGS_DIR, { recursive: true });
}

async function runAndRecordDemo(demoName, demoPath, outputDir) {
    console.log(`Recording demo: ${demoName}`);
    
    try {
        // If asciinema is available, record the demo
        const { stdout } = await execa('which', ['asciinema']);
        const hasAsciinema = stdout.trim();
        
        if (hasAsciinema) {
            const outputFile = path.join(outputDir, `${demoName}.cast`);
            console.log(`Recording to: ${outputFile}`);
            
            // Record the demo execution
            await execa('asciinema', [
                'rec', 
                outputFile, 
                '-c', 
                `node ${demoPath}`,
                '--overwrite'  // Overwrite if file exists
            ], { stdio: 'inherit' });
            
            console.log(`✅ Recorded: ${demoName}`);
        } else {
            console.log("asciinema not found. Running demo without recording...");
            await execa('node', [demoPath], { stdio: 'inherit' });
            console.log(`✅ Ran (unrecorded): ${demoName}`);
        }
    } catch (error) {
        console.error(`❌ Error recording ${demoName}:`, error.message);
        throw error;
    }
}

async function runAndRecordTest(testFile, outputDir) {
    console.log(`Recording test: ${testFile}`);
    
    try {
        const { stdout } = await execa('which', ['asciinema']);
        const hasAsciinema = stdout.trim();
        
        if (hasAsciinema) {
            const testName = path.basename(testFile, '.test.js');
            const outputFile = path.join(outputDir, `${testName}.cast`);
            console.log(`Recording test to: ${outputFile}`);
            
            // Record the test execution
            await execa('asciinema', [
                'rec', 
                outputFile, 
                '-c', 
                `npx vitest run ${testFile} --reporter=verbose`,
                '--overwrite'  // Overwrite if file exists
            ], { stdio: 'inherit' });
            
            console.log(`✅ Recorded test: ${testFile}`);
        } else {
            console.log("asciinema not found. Running test without recording...");
            await execa('npx', ['vitest', 'run', testFile, '--reporter=verbose'], { stdio: 'inherit' });
            console.log(`✅ Ran (unrecorded) test: ${testFile}`);
        }
    } catch (error) {
        console.error(`❌ Error recording test ${testFile}:`, error.message);
        throw error;
    }
}

async function collectDemos() {
    const files = fs.readdirSync(DEMO_DIR);
    return files
        .filter(file => file.endsWith('-demo.js') && file !== 'interactive-runner.js')
        .map(file => ({
            name: file.replace('-demo.js', ''),
            path: path.join(DEMO_DIR, file)
        }));
}

async function collectIntegrationTests() {
    const testDir = './tests/integration';
    if (!fs.existsSync(testDir)) return [];
    
    const files = fs.readdirSync(testDir);
    return files
        .filter(file => file.endsWith('.test.js'))
        .map(file => path.join(testDir, file));
}

async function recordAllDemos() {
    const demos = await collectDemos();
    console.log(`Found ${demos.length} demos to record...\n`);
    
    for (const demo of demos) {
        try {
            await runAndRecordDemo(demo.name, demo.path, RECORDINGS_DIR);
        } catch (error) {
            console.error(`Stopping due to error in demo ${demo.name}`);
            process.exit(1);
        }
    }
    
    console.log('\n🎉 All demos recorded successfully!');
}

async function recordAllTests() {
    const tests = await collectIntegrationTests();
    console.log(`Found ${tests.length} integration tests to record...\n`);
    
    for (const test of tests) {
        try {
            await runAndRecordTest(test, TEST_RECORDINGS_DIR);
        } catch (error) {
            console.error(`Stopping due to error in test ${test}`);
            process.exit(1);
        }
    }
    
    console.log('\n🎉 All tests recorded successfully!');
}

async function recordSpecificDemo(demoName) {
    const demos = await collectDemos();
    const demo = demos.find(d => d.name === demoName);
    
    if (!demo) {
        console.error(`Demo ${demoName} not found!`);
        console.log('Available demos:', demos.map(d => d.name).join(', '));
        return;
    }
    
    try {
        await runAndRecordDemo(demo.name, demo.path, RECORDINGS_DIR);
        console.log(`\n🎉 Demo ${demoName} recorded successfully!`);
    } catch (error) {
        console.error(`Failed to record demo ${demoName}`);
        process.exit(1);
    }
}

async function recordSpecificTest(testPath) {
    if (!fs.existsSync(testPath)) {
        console.error(`Test file ${testPath} not found!`);
        return;
    }
    
    try {
        await runAndRecordTest(testPath, TEST_RECORDINGS_DIR);
        console.log(`\n🎉 Test ${testPath} recorded successfully!`);
    } catch (error) {
        console.error(`Failed to record test ${testPath}`);
        process.exit(1);
    }
}

async function showHelp() {
    console.log(`
SeNARS Demo and Test Recording Script

Usage:
  node scripts/record-demos.js [command] [options]

Commands:
  all-demos          Record all demos
  all-tests          Record all integration tests  
  demo <name>        Record a specific demo
  test <path>        Record a specific test file
  check              Check if recording tools are available
  help               Show this help message

Examples:
  node scripts/record-demos.js all-demos
  node scripts/record-demos.js demo basic
  node scripts/record-demos.js test tests/integration/WebSocket.test.js
    `);
}

async function checkTools() {
    try {
        const { stdout: asciinemaPath } = await execa('which', ['asciinema']).catch(() => ({ stdout: '' }));
        const hasAsciinema = !!asciinemaPath.trim();
        
        console.log('Recording tools check:');
        console.log(`- asciinema: ${hasAsciinema ? '✅ Available' : '❌ Not found (sudo apt install asciinema or brew install asciinema)'}`);
        console.log(`- node: ✅ Available`);
        console.log(`- npx: ✅ Available`);
        
        return hasAsciinema;
    } catch (error) {
        console.log('- asciinema: ❌ Not found');
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('help') || args.includes('--help')) {
        await showHelp();
        return;
    }
    
    if (args.includes('check')) {
        await checkTools();
        return;
    }
    
    if (args[0] === 'all-demos') {
        await recordAllDemos();
    } else if (args[0] === 'all-tests') {
        await recordAllTests();
    } else if (args[0] === 'demo' && args[1]) {
        await recordSpecificDemo(args[1]);
    } else if (args[0] === 'test' && args[1]) {
        await recordSpecificTest(args[1]);
    } else {
        await showHelp();
    }
}

if (import.meta.url.startsWith('file:') && path.basename(process.argv[1]) === path.basename(new URL(import.meta.url).pathname)) {
    main().catch(err => {
        console.error("An error occurred:", err);
        process.exit(1);
    });
}

export {
    collectDemos,
    collectIntegrationTests,
    runAndRecordDemo,
    runAndRecordTest,
    recordAllDemos,
    recordAllTests,
    recordSpecificDemo,
    recordSpecificTest,
    checkTools
};