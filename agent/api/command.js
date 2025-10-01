import {promisify} from 'util';
import {exec as childExec} from 'child_process';
import path from 'path';
import {executeCommandOperation} from '../utils/asyncWrapper.js';

const exec = promisify(childExec);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..'); // Project root directory

export const handleRunCommand = async (payload, ws) => {
    return executeCommandOperation(async () => {
        const {command} = payload;
        const {stdout, stderr} = await exec(command, {cwd: ROOT_DIR});
        ws.send(JSON.stringify({type: 'commandOutput', payload: {stdout, stderr}}));
    }, ws, 'execute command');
};