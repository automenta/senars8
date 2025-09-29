// playwright.global-teardown.js
import {serverProcess} from './playwright.global-setup.js';

export default async function globalTeardown() {
    console.log('Stopping Vite dev server...');
    if (serverProcess) {
        serverProcess.kill();
    }
    console.log('Vite dev server stopped');
}