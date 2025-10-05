#!/usr/bin/env node

/**
 * Web UI Capture Utility
 * Captures screenshots and generates documentation for the Web UI
 */

import {spawn} from 'child_process';
import {createWriteStream, existsSync, mkdirSync} from 'fs';
import {dirname, join, resolve} from 'path';
import {setTimeout} from 'timers/promises';
import {fileURLToPath} from 'url';
import puppeteer from 'puppeteer';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const capturesDir = resolve(__dirname, '../captures');

/**
 * Capture Web UI screenshots for documentation
 * @param {string} title - Title for the capture session
 * @param {number} port - Port for the Web UI server
 */
async function captureWebUIScreenshots(title, port = 5173) {
    console.log(`Starting Web UI capture: ${title}`);

    // Create captures directory if it doesn't exist
    if (!existsSync(capturesDir)) {
        mkdirSync(capturesDir, {recursive: true});
    }

    let browser;
    let uiProcess;

    try {
        // Start the UI server
        console.log('Starting Web UI server...');
        uiProcess = spawn('npx', ['vite', '--port', port.toString()], {
            cwd: resolve(__dirname, '..'),
            stdio: 'pipe'
        });

        // Wait for server to be ready
        await new Promise((resolve, reject) => {
            let timeout = setTimeout(() => reject(new Error('Timeout waiting for UI server')), 20000);

            uiProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(output);
                if (output.includes(`${port}`) || output.includes('ready in')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            uiProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            uiProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        console.log('Web UI server started, launching browser...');
        await setTimeout(3000); // Wait a bit more for full initialization

        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: true, // Set to false if you want to see the browser
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set viewport size for consistent screenshots
        await page.setViewport({width: 1200, height: 800});

        // Navigate to the Web UI
        console.log('Navigating to Web UI...');
        await page.goto(`http://localhost:${port}`, {waitUntil: 'networkidle2'});

        // Wait for the UI to fully load
        await setTimeout(2000);

        // Take the main screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${title.replace(/\s+/g, '_')}_${timestamp}.png`;
        const filepath = join(capturesDir, filename);

        await page.screenshot({path: filepath, fullPage: true});
        console.log(`Screenshot saved: ${filepath}`);

        // Take additional screenshots of different panels if they exist
        const panelSelectors = [
            {name: 'status', selector: '.status-bar'},
            {name: 'chat', selector: '.chat-panel'},
            {name: 'memory', selector: '.memory-panel'},
            {name: 'reasoning', selector: '.reasoning-panel'}
        ];

        for (const panel of panelSelectors) {
            try {
                const element = await page.$(panel.selector);
                if (element) {
                    const panelFilename = `${title.replace(/\s+/g, '_')}_${panel.name}_${timestamp}.png`;
                    const panelFilepath = join(capturesDir, panelFilename);

                    await element.screenshot({path: panelFilepath});
                    console.log(`Panel screenshot saved: ${panelFilepath}`);
                }
            } catch (e) {
                // Panel doesn't exist, continue
                console.log(`Panel ${panel.name} not found, skipping...`);
            }
        }

        console.log('Capture completed successfully!');
        return filepath;

    } catch (error) {
        console.error('Error during Web UI capture:', error);
        throw error;
    } finally {
        // Clean up
        if (browser) {
            await browser.close();
        }

        if (uiProcess) {
            uiProcess.kill();
        }
    }
}

/**
 * Create a simple asciinema-style text capture (simulated)
 * @param {string} title - Title for the capture
 */
async function simulateAsciinemaCapture(title) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${title.replace(/\s+/g, '_')}_${timestamp}.cast`;
    const filepath = join(capturesDir, filename);

    const writeStream = createWriteStream(filepath);

    // Write asciinema header
    writeStream.write(JSON.stringify({
        version: 2,
        width: 100,
        height: 30,
        timestamp: Math.floor(Date.now() / 1000),
        title: title,
        env: {SHELL: '/bin/bash', TERM: 'xterm-256color'}
    }) + '\n');

    // Simulate some terminal interactions
    const events = [
        [0.0, "o", "Starting Web UI Documentation Capture\\r\\n"],
        [0.5, "o", "Initializing connection to agent...\\r\\n"],
        [1.2, "o", "Connected to ws://localhost:8080\\r\\n"],
        [1.8, "o", "UI loaded successfully\\r\\n"],
        [2.5, "o", "Capturing main interface...\\r\\n"],
        [3.2, "o", "Capturing status panel...\\r\\n"],
        [4.0, "o", "Capturing memory visualization...\\r\\n"],
        [4.8, "o", "Capture completed!\\r\\n"]
    ];

    events.forEach(event => {
        writeStream.write(JSON.stringify(event) + '\n');
    });

    writeStream.end();
    console.log(`Simulated asciinema capture saved: ${filepath}`);
    return filepath;
}

/**
 * Main function to handle command line arguments
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Web UI Capture Utility

Usage: node capture-webui.js [options]

Options:
  --title, -t <title>    Title for the capture (default: "webui-capture")
  --port, -p <port>      Port for the Web UI (default: 5173)
  --type, -type <type>   Type of capture: 'screenshot', 'asciinema', or 'both' (default: 'screenshot')
  --help, -h            Show this help

Examples:
  node capture-webui.js --title "Dashboard View" --type screenshot
  node capture-webui.js -t "Full Demo" -type both
        `);
        return;
    }

    // Parse arguments
    let title = 'webui-capture';
    let port = 5173;
    let captureType = 'screenshot';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--title' || args[i] === '-t') {
            title = args[i + 1];
            i++;
        } else if (args[i] === '--port' || args[i] === '-p') {
            port = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--type' || args[i] === '-type') {
            captureType = args[i + 1];
            i++;
        }
    }

    try {
        if (captureType === 'screenshot' || captureType === 'both') {
            console.log('Starting screenshot capture...');
            const screenshotPath = await captureWebUIScreenshots(title, port);
            console.log(`Screenshot capture completed: ${screenshotPath}`);
        }

        if (captureType === 'asciinema' || captureType === 'both') {
            console.log('Starting asciinema-style capture...');
            const asciinemaPath = await simulateAsciinemaCapture(title);
            console.log(`Asciinema capture completed: ${asciinemaPath}`);
        }

        if (!['screenshot', 'asciinema', 'both'].includes(captureType)) {
            console.error(`Invalid capture type: ${captureType}. Use 'screenshot', 'asciinema', or 'both'.`);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error during capture:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export {captureWebUIScreenshots, simulateAsciinemaCapture};