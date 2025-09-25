// playwright.global-setup.js
import {exec, spawn} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

let serverProcess;

export default async function globalSetup() {
    console.log('Starting Vite dev server...');

    // Start the Vite dev server
    serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: './',
        stdio: 'pipe',
        shell: true
    });

    // Wait for the server to start
    await new Promise((resolve, reject) => {
        let timeout = setTimeout(() => reject(new Error('Timeout waiting for server to start')), 30000);

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);
            if (output.includes('Local:') || output.includes('ready in')) {
                clearTimeout(timeout);
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        serverProcess.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });

    console.log('Vite dev server started');
}

// Export for teardown to access
export {serverProcess};