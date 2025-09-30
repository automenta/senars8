import { promisify } from 'util';
import { exec as childExec } from 'child_process';
import path from 'path';
import { serverError } from '../utils/logger.js';

const exec = promisify(childExec);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..'); // Project root directory

export const handleRunCommand = async (payload, ws) => {
    const { command } = payload;
    try {
        const { stdout, stderr } = await exec(command, { cwd: ROOT_DIR });
        ws.send(JSON.stringify({ type: 'commandOutput', payload: { stdout, stderr } }));
    } catch (error) {
        serverError('Failed to execute command:', error);
        ws.send(JSON.stringify({ type: 'commandOutput', payload: { stdout: '', stderr: error.message } }));
    }
};