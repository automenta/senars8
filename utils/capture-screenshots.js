#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';

// Import the Asciinema recorder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AsciinemaRecorder = (await import('./AsciinemaRecorder.js')).default;

// --- Configuration ---
const ROOT_DIR = path.join(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs/screenshots');
const DEMOS_DIR = path.join(ROOT_DIR, 'tests/demos');
const UI_DIR = path.join(ROOT_DIR, 'ui');
const TUI_DIR = path.join(ROOT_DIR, 'tui');

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
        const demoPath = path.join(DEMOS_DIR, file);
        const output = await this.runDemoCapture(demoPath);
        const fileName = path.parse(file).name;
        await this.saveConsoleOutput(output, 'demos', `${fileName}-console.txt`);
        if (output.stdout.includes('interactive') || output.stdout.includes('TUI')) {
            const recorder = new AsciinemaRecorder(path.join(this.outputDir, 'demos'));
            console.log(chalk.gray(`  Recording interactive demo: ${file}`));
            const command = `node ${demoPath}`;
            await recorder.recordSession(command, `${fileName}-demo`, { timeout: 15000, cwd: ROOT_DIR });
            console.log(chalk.green(`  Interactive demo recording saved for ${file}`));
        }
        await this.delay(1000);
      } catch (error) {
        console.error(chalk.red(`    Error capturing demo ${file}:`), error.message);
      }
    }
  }

  /**
   * Run a demo and capture its output
   */
  async runDemoCapture(demoPath) {
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      const child = spawn('node', [demoPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: ROOT_DIR, // Run from root to resolve monorepo dependencies
        env: { ...process.env, NODE_ENV: 'test' }
      });
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', (data) => { errorOutput += data.toString(); });
      child.on('close', (code) => { resolve({ stdout: output, stderr: errorOutput, exitCode: code }); });
      setTimeout(() => {
        child.kill();
        resolve({ stdout: output, stderr: errorOutput, exitCode: -1 });
      }, this.timeout);
    });
  }

  /**
   * Capture screenshots for unit tests (currently disabled)
   */
  async captureUnitTests() {
    console.log(chalk.yellow('Skipping unit test capture due to ongoing memory issues in the test suite.'));
  }

  /**
   * Capture console animations for TUI
   */
  async captureTUI() {
    console.log(chalk.blue('Capturing console animations for TUI...'));
    try {
        const recorder = new AsciinemaRecorder(path.join(this.outputDir, 'tui'));
        const tuiScriptPath = path.join(TUI_DIR, 'src', 'index.js');
        const command = `node ${tuiScriptPath}`;
        const inputs = ['help', 'status', 'list', 'stats', 'config list', 'exit'];
        console.log(chalk.gray('  Recording TUI session with asciinema...'));
        await recorder.recordSession(command, 'tui-demo', { timeout: 20000, inputs, cwd: ROOT_DIR });
        console.log(chalk.green('  TUI animation capture completed and saved as tui-demo.cast'));
    } catch (error) {
      console.error(chalk.red(`    Error capturing TUI:`), error.message);
    }
  }

  /**
   * Capture screenshots for Web UI
   */
  async captureWebUI() {
    console.log(chalk.blue('Capturing screenshots for Web UI...'));
    let webUIServer;
    try {
      let playwright;
      try {
        playwright = await import('playwright');
      } catch (error) {
        console.log(chalk.yellow('  Playwright not available. Installing temporarily...'));
        execSync('npm install playwright', { cwd: ROOT_DIR, stdio: 'pipe' });
        playwright = await import('playwright');
      }
      webUIServer = await this.startWebUIServer();
      await this.delay(12000); // Allow more time for the dev server to start
      await this.captureWebUIPages(playwright, webUIServer.port);
      console.log(chalk.green('  Web UI capture completed'));
    } catch (error) {
      console.error(chalk.red('    Error capturing Web UI:'), error.message);
    } finally {
        if (webUIServer && webUIServer.server) {
            webUIServer.server.kill();
        }
    }
  }

  /**
   * Start the Web UI server
   */
  async startWebUIServer() {
    return new Promise((resolve, reject) => {
      const server = spawn('npm', ['run', 'dev'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: UI_DIR, // Run from the UI directory
        env: { ...process.env, BROWSER: 'none' }
      });
      let serverStarted = false;
      server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(chalk.gray(`    WebUI: ${output.trim()}`));
        if (output.includes('http://localhost:3001')) {
          serverStarted = true;
          console.log(chalk.green(`    Web UI server started on port 3001`));
          resolve({ server, port: 3001 });
        }
      });
      server.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.log(chalk.red(`    WebUI Error: ${errorOutput.trim()}`));
      });
      server.on('error', (error) => {
        console.log(chalk.red(`    Web UI server error: ${error.message}`));
        reject(error);
      });
      setTimeout(() => {
        if (!serverStarted) {
          server.kill();
          reject(new Error('Web UI server failed to start within timeout.'));
        }
      }, 35000); // Increased timeout
    });
  }

  /**
   * Capture web UI pages using Playwright based on a config file
   */
  async captureWebUIPages(playwright, port) {
    const browser = await playwright.chromium.launch({ headless: this.isHeadless });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        const configPath = path.join(__dirname, 'screenshot-config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        for (const p of config.pages) {
            console.log(chalk.gray(`  Capturing page: ${p.name}`));
            await page.goto(`http://localhost:${port}${p.url}`, { waitUntil: 'networkidle' });
            await page.screenshot({ path: path.join(this.outputDir, 'web_ui', `${p.name}.png`), fullPage: p.fullPage });
            console.log(chalk.green(`    Screenshot saved for ${p.name}`));
        }
        for (const component of config.components) {
            console.log(chalk.gray(`  Capturing component: ${component.name}`));
            try {
                await page.waitForSelector(component.selector, { timeout: 5000 });
                const element = await page.$(component.selector);
                if (element) {
                    await element.screenshot({ path: path.join(this.outputDir, 'web_ui', `component-${component.name}.png`) });
                    console.log(chalk.green(`    Screenshot saved for component ${component.name}`));
                }
            } catch (error) {
                console.log(chalk.yellow(`    Component selector ${component.selector} not found, skipping...`));
            }
        }
        for (const interaction of config.interactions) {
            console.log(chalk.gray(`  Performing interaction: ${interaction.name}`));
            try {
                for (const step of interaction.steps) {
                    if (step.action === 'click') { await page.click(step.selector); }
                    else if (step.action === 'wait') { await page.waitForTimeout(step.duration); }
                }
                await page.screenshot({ path: path.join(this.outputDir, 'web_ui', `interaction-${interaction.name}.png`), fullPage: true });
                console.log(chalk.green(`    Screenshot saved for interaction ${interaction.name}`));
            } catch (error) {
                console.log(chalk.yellow(`    Interaction ${interaction.name} failed, skipping...`));
            }
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
    let content = `# ${filename}\n\n`;
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
   * Main capture method to run all or selected capture types
   */
  async captureAll(types = Object.values(CAPTURE_TYPES)) {
    await this.ensureOutputDir();
    console.log(chalk.bold('Starting screenshot capture process...'));
    console.log(chalk.gray(`Output directory: ${this.outputDir}\n`));
    if (types.includes(CAPTURE_TYPES.DEMOS)) await this.captureDemos();
    if (types.includes(CAPTURE_TYPES.UNIT_TESTS)) await this.captureUnitTests();
    if (types.includes(CAPTURE_TYPES.TUI)) await this.captureTUI();
    if (types.includes(CAPTURE_TYPES.WEB_UI)) await this.captureWebUI();
    console.log(chalk.bold.green('\nScreenshot capture completed successfully!'));
    console.log(chalk.gray(`Screenshots saved to: ${this.outputDir}`));
  }
}

async function main() {
    const capture = new ScreenshotCapture();
    const args = process.argv.slice(2);
    let captureTypes = [];
    if (args.length === 0 || args.includes('all')) {
        captureTypes = Object.values(CAPTURE_TYPES);
    } else {
        captureTypes = args.filter(arg => Object.values(CAPTURE_TYPES).includes(arg));
    }
    if (captureTypes.length > 0) {
        console.log(chalk.blue(`Capturing: ${captureTypes.join(', ')}`));
        await capture.captureAll(captureTypes);
    } else {
        console.log(chalk.yellow('No valid capture types specified. Use "all" or a combination of: demos, unit_tests, tui, web_ui.'));
    }
}

if (import.meta.url.startsWith('file:') && process.argv[1] === import.meta.url.slice(7)) {
    main().catch(error => {
        console.error(chalk.red('Capture process failed:'), error);
        process.exit(1);
    });
}

export default ScreenshotCapture;