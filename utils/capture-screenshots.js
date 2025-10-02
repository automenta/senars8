#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';

// Import the console animation recorder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ConsoleAnimationRecorder = (await import('./console-animation-recorder.js')).default;

// Configuration
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const DEMOS_DIR = path.join(__dirname, '../tests/demos');
const UNIT_TESTS_DIR = path.join(__dirname, '../tests/unit');
const TUI_DIR = path.join(__dirname, '../tui');
const UI_DIR = path.join(__dirname, '../ui');

// Supported capture types
const CAPTURE_TYPES = {
  DEMOS: 'demos',
  UNIT_TESTS: 'unit_tests',
  TUI: 'tui',
  WEB_UI: 'web_ui'
};

class ScreenshotCapture {
  constructor() {
    this.isHeadless = true;
    this.timeout = 30000;
    this.outputDir = SCREENSHOTS_DIR;
  }

  async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'demos'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'unit_tests'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'tui'), { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'web_ui'), { recursive: true });
  }

  /**
   * Capture screenshots for demos
   */
  async captureDemos() {
    console.log(chalk.blue('Capturing screenshots for demos...'));

    const files = await fs.readdir(DEMOS_DIR);
    const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('.test.'));

    for (const file of jsFiles) {
      try {
        console.log(chalk.gray(`  Processing demo: ${file}`));

        // Run the demo and capture its output
        const demoPath = path.join(DEMOS_DIR, file);
        const output = await this.runDemoCapture(demoPath, file);

        // Save the output as a console animation or screenshot
        const fileName = path.parse(file).name;
        await this.saveConsoleOutput(output, 'demos', `${fileName}-console.txt`);

        // For interactive demos, save as animation frames if applicable
        if (output.stdout.includes('interactive') || output.stdout.includes('TUI')) {
          const recorder = new ConsoleAnimationRecorder(path.join(this.outputDir, 'demos'));
          // Convert the single output to animation frames (simplified)
          const frames = [{
            timestamp: 0,
            content: output.stdout || output.stderr || 'No output',
            frameNumber: 0
          }];
          await recorder.saveAnimationAsFrames(frames, `${fileName}-demo`);
          await recorder.createReplayScript(`${fileName}-demo`);
        }

        // Wait a bit between captures
        await this.delay(1000);
      } catch (error) {
        console.error(chalk.red(`    Error capturing demo ${file}:`), error.message);
      }
    }
  }

  /**
   * Run a demo and capture its output
   */
  async runDemoCapture(demoPath, fileName) {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      // Use 'node -r esm' or similar to run in a more compatible mode
      // Or run with a custom environment that doesn't conflict
      const child = spawn('node', ['-r', 'module', demoPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(demoPath),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          NODE_OPTIONS: '--experimental-vm-modules'
        }
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        // Resolve even if there's an error code, as we still want the output
        resolve({ stdout: output, stderr: errorOutput, exitCode: code });
      });

      // Set timeout for the process
      setTimeout(() => {
        child.kill();
        resolve({ stdout: output, stderr: errorOutput, exitCode: -1 });
      }, this.timeout);
    });
  }

  /**
   * Capture screenshots for unit tests
   */
  async captureUnitTests() {
    console.log(chalk.blue('Capturing screenshots for unit tests...'));

    const files = await fs.readdir(UNIT_TESTS_DIR);
    const testFiles = files.filter(file => file.endsWith('.test.js') || file.endsWith('.js'));

    for (const file of testFiles) {
      try {
        console.log(chalk.gray(`  Processing unit test: ${file}`));

        const testPath = path.join(UNIT_TESTS_DIR, file);
        const output = await this.runTestCapture(testPath, file);

        // Save the test output
        const fileName = path.parse(file).name;
        await this.saveConsoleOutput(output, 'unit_tests', `${fileName}-output.txt`);

        await this.delay(500);
      } catch (error) {
        console.error(chalk.red(`    Error capturing unit test ${file}:`), error.message);
      }
    }
  }

  /**
   * Run a unit test and capture its output
   */
  async runTestCapture(testPath, fileName) {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      // Use vitest to run the specific test file but in a child process
      // Run in the project root to avoid module resolution issues
      const child = spawn('npx', ['vitest', 'run', testPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(path.dirname(__dirname)), // Root directory (go up two levels from utils/capture-screenshots.js)
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ORT_LOGGING_LEVEL: 'FATAL', // Suppress transformers logging
          CI: 'true' // Run in CI mode to avoid interactive prompts
        }
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout: output, stderr: errorOutput, exitCode: code });
      });

      // Set timeout for the process
      setTimeout(() => {
        child.kill();
        resolve({ stdout: output, stderr: errorOutput, exitCode: -1 });
      }, this.timeout);
    });
  }

  /**
   * Capture console animations for TUI
   */
  async captureTUI() {
    console.log(chalk.blue('Capturing console animations for TUI...'));

    try {
      const recorder = new ConsoleAnimationRecorder(path.join(this.outputDir, 'tui'));

      // Define a script of TUI commands to demonstrate different features
      const tuiScript = [
        'help',
        'status',
        'list',
        'stats',
        'config list',
        'exit'
      ];

      console.log(chalk.gray('  Recording TUI session...'));
      const animationFrames = await recorder.recordTUISession(tuiScript, 15000); // 15 seconds recording

      console.log(chalk.gray(`  Recorded ${animationFrames.length} frames`));

      await recorder.saveAnimationAsFrames(animationFrames, 'tui-demo');
      await recorder.createReplayScript('tui-demo');

      console.log(chalk.green('  TUI animation capture completed'));
    } catch (error) {
      console.error(chalk.red('    Error capturing TUI:'), error.message);
    }
  }

  /**
   * Capture screenshots for Web UI
   */
  async captureWebUI() {
    console.log(chalk.blue('Capturing screenshots for Web UI...'));

    try {
      // Check if Playwright is available
      let playwright;
      try {
        playwright = await import('playwright');
      } catch (error) {
        console.log(chalk.yellow('  Playwright not available. Installing temporarily...'));
        // Try to install playwright dynamically
        execSync('npm install playwright', { cwd: path.dirname(__dirname), stdio: 'pipe' });
        playwright = await import('playwright');
      }

      // Start the Web UI server
      const webUIServer = await this.startWebUIServer();

      // Wait for server to start
      await this.delay(3000);

      // Capture screenshots using Playwright
      await this.captureWebUIPages(playwright, webUIServer.port);

      // Stop the server
      webUIServer.server.kill();

      console.log(chalk.green('  Web UI capture completed'));
    } catch (error) {
      console.error(chalk.red('    Error capturing Web UI:'), error.message);
    }
  }

  /**
   * Start the Web UI server
   */
  async startWebUIServer() {
    return new Promise((resolve, reject) => {
      // Try running with vite dev server instead of node directly
      const server = spawn('npx', ['vite', '--port', '3001'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: UI_DIR,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '3001',
          BROWSER: 'none' // Don't open browser
        }
      });

      let serverPort = 3001;
      let serverStarted = false;

      server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(chalk.gray(`    WebUI: ${output.trim()}`));
        // Look for the server start message in the output
        if (output.includes('http://') && output.includes('3001')) {
          serverStarted = true;
          console.log(chalk.green(`    Web UI server started on port ${serverPort}`));
          resolve({ server, port: serverPort });
        }
      });

      server.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.log(chalk.red(`    WebUI Error: ${errorOutput.trim()}`));
        if (errorOutput.includes('EADDRINUSE') || errorOutput.includes('port')) {
          // Try different port
          serverPort = 3002;
          server.kill();
          setTimeout(() => resolve(this.startWebUIServer()), 1000);
        }
      });

      server.on('error', (error) => {
        console.log(chalk.red(`    Web UI server error: ${error.message}`));
        reject(error);
      });

      setTimeout(() => {
        if (!serverStarted) {
          server.kill();
          reject(new Error('Web UI server failed to start within timeout'));
        }
      }, 15000); // Increased timeout
    });
  }

  /**
   * Capture web UI pages using Playwright
   */
  async captureWebUIPages(playwright, port) {
    const browser = await playwright.chromium.launch({ headless: this.isHeadless });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to the Web UI
      await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle', timeout: 10000 });

      // Wait a bit for the page to load fully
      await page.waitForTimeout(2000);

      // Take screenshot of the main page
      await page.screenshot({
        path: path.join(this.outputDir, 'web_ui', 'main-page.png'),
        fullPage: true
      });

      console.log(chalk.green('    Main page screenshot saved'));

      // Simulate some interactions and take more screenshots
      // Example: Click on different components if they exist
      const selectors = [
        '[data-testid="reasoning-panel"]',
        '[data-testid="memory-panel"]',
        '[data-testid="task-list"]',
        '.graph-container', // Common selector for graph components
        '.terminal-container' // Common selector for terminal components
      ];

      for (const [index, selector] of selectors.entries()) {
        try {
          // Wait for element to be available
          await page.waitForSelector(selector, { timeout: 2000 });

          // Highlight the element temporarily
          await page.$eval(selector, el => {
            el.style.border = '2px solid #ff0000';
          });

          // Take screenshot
          await page.screenshot({
            path: path.join(this.outputDir, 'web_ui', `component-${index}.png`),
            fullPage: false
          });

          // Remove highlight
          await page.$eval(selector, el => {
            el.style.border = '';
          });

          console.log(chalk.green(`    Component screenshot ${index} saved`));
        } catch (error) {
          // Element not found, continue with next
          console.log(chalk.yellow(`    Component selector ${selector} not found, skipping...`));
          continue;
        }
      }

      // Additional screenshots for different UI states
      // Try to capture different views by interacting with the UI
      try {
        // Example: If there are navigation elements, click them
        const navSelectors = [
          'nav a',
          '.sidebar a',
          '[data-testid="nav-item"]',
          '.menu-item'
        ];

        for (const [index, navSelector] of navSelectors.entries()) {
          try {
            const elements = await page.$(navSelector);
            if (elements.length > 0) {
              // Click the first navigation element we find
              await elements[0].click();
              await page.waitForTimeout(1000); // Wait for transition

              await page.screenshot({
                path: path.join(this.outputDir, 'web_ui', `nav-view-${index}.png`),
                fullPage: true
              });

              console.log(chalk.green(`    Navigation view ${index} screenshot saved`));
              break; // Only capture one nav view to avoid too many clicks
            }
          } catch (error) {
            continue; // Try next selector
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`    Could not capture navigation views: ${error.message}`));
      }
    } catch (error) {
      console.error(chalk.red('    Error during Web UI capture:'), error.message);
    } finally {
      await browser.close();
    }
  }

  /**
   * Save console output to file
   */
  async saveConsoleOutput(output, type, filename) {
    const content = `# ${filename}\n\n`;
    content += `STDOUT:\n${output.stdout || 'No stdout'}\n\n`;
    content += `STDERR:\n${output.stderr || 'No stderr'}\n\n`;
    content += `EXIT CODE: ${output.exitCode || 'N/A'}\n`;

    const filePath = path.join(this.outputDir, type, filename);
    await fs.writeFile(filePath, content);
  }

  /**
   * Add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main capture method
   */
  async captureAll() {
    await this.ensureOutputDir();

    console.log(chalk.bold('Starting screenshot capture process...'));
    console.log(chalk.gray(`Output directory: ${this.outputDir}\n`));

    // Capture all types
    await this.captureDemos();
    await this.captureUnitTests();
    await this.captureTUI();
    await this.captureWebUI();

    console.log(chalk.bold.green('\nScreenshot capture completed successfully!'));
    console.log(chalk.gray(`Screenshots saved to: ${this.outputDir}`));
  }
}

// Main execution
if (import.meta.url.startsWith('file:') && process.argv[1] === import.meta.url.slice(7)) {
  const capture = new ScreenshotCapture();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const captureTypes = [];

  if (args.length === 0 || args.includes('all')) {
    captureTypes.push(...Object.values(CAPTURE_TYPES));
  } else {
    for (const arg of args) {
      if (Object.values(CAPTURE_TYPES).includes(arg)) {
        captureTypes.push(arg);
      }
    }
  }

  console.log(chalk.blue(`Capturing: ${captureTypes.join(', ')}`));

  capture.captureAll().catch(error => {
    console.error(chalk.red('Capture process failed:'), error);
    process.exit(1);
  });
}

export default ScreenshotCapture;