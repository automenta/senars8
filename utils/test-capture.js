#!/usr/bin/env node

import {exec} from 'child_process';
import {promisify} from 'util';
import {existsSync} from 'fs';
import {join} from 'path';

const execAsync = promisify(exec);

async function testCaptureTool() {
    console.log('Testing the screenshot capture tool...\n');

    try {
        // Test running the capture tool with 'demos' only (fastest option)
        console.log('Running capture tool for demos only...');
        const {stdout, stderr} = await execAsync('node tools/capture-screenshots.js demos', {
            cwd: process.cwd(),
            timeout: 60000  // 1 minute timeout
        });

        console.log('STDOUT:', stdout);
        if (stderr) {
            console.log('STDERR:', stderr);
        }

        console.log('\n✓ Capture tool executed successfully');

        // Check if output directory was created
        const outputDir = join(process.cwd(), 'docs', 'screenshots');
        if (existsSync(outputDir)) {
            console.log('✓ Output directory created at:', outputDir);
        } else {
            console.log('⚠ Output directory not found at:', outputDir);
        }

        // Check if demo outputs were created
        const demosDir = join(outputDir, 'demos');
        if (existsSync(demosDir)) {
            console.log('✓ Demo outputs directory created at:', demosDir);
        } else {
            console.log('⚠ Demo outputs directory not found at:', demosDir);
        }

        console.log('\nTest completed successfully!');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        if (error.stdout) console.error('STDOUT:', error.stdout);
        if (error.stderr) console.error('STDERR:', error.stderr);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testCaptureTool();
}