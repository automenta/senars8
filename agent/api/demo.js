import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { info, error } from '../../core/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

export const handleRunDemo = (payload, ws) => {
    const { path: demoPath } = payload;
    if (!demoPath) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Demo path is required.' } }));
        return;
    }

    const fullPath = path.join(projectRoot, demoPath);
    info(`Running demo: ${fullPath}`);
    ws.send(JSON.stringify({ type: 'demo-output', payload: { data: `Executing: node ${fullPath}\n\n` } }));

    const demoProcess = spawn('node', [fullPath], {
        cwd: projectRoot,
        env: { ...process.env, ORT_LOGGING_LEVEL: 'FATAL' },
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const sendOutput = (data) => {
        ws.send(JSON.stringify({ type: 'demo-output', payload: { data: data.toString() } }));
    };

    demoProcess.stdout.on('data', sendOutput);
    demoProcess.stderr.on('data', sendOutput);

    demoProcess.on('close', (code) => {
        const message = `\n--- Demo finished with exit code ${code} ---`;
        info(message);
        ws.send(JSON.stringify({ type: 'demo-output', payload: { data: message } }));
        ws.send(JSON.stringify({ type: 'demo-finished' }));
    });

    demoProcess.on('error', (err) => {
        error(`Failed to start demo: ${err.message}`);
        ws.send(JSON.stringify({ type: 'error', payload: { message: `Failed to start demo: ${err.message}` } }));
    });
};