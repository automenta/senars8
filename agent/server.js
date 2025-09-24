import {WebSocketServer} from 'ws';
import fs from 'fs/promises';
import path from 'path';
import {exec as childExec} from 'child_process';
import {promisify} from 'util';
const exec = promisify(childExec);
import {Agent} from './index.js';
import {debug as coreDebug, info as coreInfo, warn as coreWarn, error as coreError} from '@project/core/utils/logger.js';

const wss = new WebSocketServer({port: 8080});

// Wrapper logger functions to also broadcast messages to connected clients
const broadcastLog = (level, message, ...args) => {
    broadcast({type: 'logMessage', payload: {level, message, args, timestamp: new Date().toISOString()}});
};

const serverDebug = (message, ...args) => { coreDebug(message, ...args); broadcastLog('DEBUG', message, ...args); };
const serverInfo = (message, ...args) => { coreInfo(message, ...args); broadcastLog('INFO', message, ...args); };
const serverWarn = (message, ...args) => { coreWarn(message, ...args); broadcastLog('WARN', message, ...args); };
const serverError = (message, ...args) => { coreError(message, ...args); broadcastLog('ERROR', message, ...args); };

serverInfo('Agent WebSocket server started on port 8080');

const agent = new Agent();

// Function to broadcast to all clients
const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// Initialize and set up agent event listeners
agent.initialize().then(() => {
    serverInfo('Agent initialized');
    broadcast({type: 'agentStatus', payload: 'initialized'});

    const eventBus = agent.system.eventBus;
    if (eventBus) {
        serverInfo('Attaching event listeners to EventBus');

        eventBus.on('status_update', (status) => {
            broadcast({type: 'status_update', payload: status});
        });

        eventBus.on('system_cycle', (cycleCount) => {
            broadcast({type: 'system_cycle', payload: {cycleCount}});
        });

        eventBus.on('add_belief', (belief) => {
            // Assuming belief has a serializable representation
            broadcast({type: 'add_belief', payload: belief.toString()});
        });

        eventBus.on('reasoning_step', (step) => {
            // Assuming the step object is serializable or has a useful string representation
            broadcast({type: 'reasoning_step', payload: step});
        });

    } else {
        serverWarn('Agent event bus not available. UI will not receive real-time updates.');
    }

    return true; // Return a value to satisfy the eslint rule
}).catch(err => {
    serverError('Agent initialization failed:', err);
    broadcast({type: 'agentStatus', payload: 'initialization_failed'});
    return false; // Return a value to satisfy the eslint rule
});


wss.on('connection', (ws) => {
    serverInfo('A new client connected');
    ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));
    ws.send(JSON.stringify({type: 'agentStatus', payload: agent.isInitialized ? 'initialized' : 'initializing'}));

    ws.on('error', (err) => serverError('WebSocket error:', err));

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleMessage(message, ws);
        } catch (err) {
            serverError('Failed to handle message:', err);
            ws.send(JSON.stringify({type: 'error', payload: {message: 'Invalid message format or handler error.'}}));
        }
    });

    ws.on('close', () => {
        serverInfo('Client disconnected');
    });
});

async function handleMessage(message, ws) {
    const {type, payload} = message;
    serverDebug(`received: ${type}`, payload);

    const ROOT_DIR = path.resolve(__dirname, '..', '..'); // Project root directory

    switch (type) {
        case 'readDirectory': {
            const {directoryPath} = payload;
            const absolutePath = path.join(ROOT_DIR, directoryPath);
            try {
                const entries = await fs.readdir(absolutePath, {withFileTypes: true});
                const files = entries
                    .filter(dirent => dirent.isFile())
                    .map(dirent => dirent.name);
                const directories = entries
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                ws.send(JSON.stringify({type: 'readDirectoryResponse', payload: {files, directories, directoryPath}}));
            } catch (error) {
                serverError('Failed to read directory:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to read directory: ${error.message}`}}));
            }
            break;
        }

        case 'readFile': {
            const {filePath} = payload;
            const absolutePath = path.join(ROOT_DIR, filePath);
            try {
                const content = await fs.readFile(absolutePath, 'utf8');
                ws.send(JSON.stringify({type: 'readFileResponse', payload: {filePath, content}}));
            } catch (error) {
                serverError('Failed to read file:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to read file: ${error.message}`}}));
            }
            break;
        }

        case 'writeFile': {
            const {filePath, content} = payload;
            const absolutePath = path.join(ROOT_DIR, filePath);
            try {
                await fs.writeFile(absolutePath, content, 'utf8');
                ws.send(JSON.stringify({type: 'writeFileResponse', payload: {filePath, success: true}}));
            } catch (error) {
                serverError('Failed to write file:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to write file: ${error.message}`}}));
            }
            break;
        }

        case 'createFile': {
            const {filePath} = payload;
            const absolutePath = path.join(ROOT_DIR, filePath);
            try {
                await fs.writeFile(absolutePath, '', 'utf8'); // Create empty file
                ws.send(JSON.stringify({type: 'createFileResponse', payload: {filePath, success: true}}));
            } catch (error) {
                serverError('Failed to create file:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to create file: ${error.message}`}}));
            }
            break;
        }

        case 'createDirectory': {
            const {directoryPath} = payload;
            const absolutePath = path.join(ROOT_DIR, directoryPath);
            try {
                await fs.mkdir(absolutePath, {recursive: true});
                ws.send(JSON.stringify({type: 'createDirectoryResponse', payload: {directoryPath, success: true}}));
            } catch (error) {
                serverError('Failed to create directory:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to create directory: ${error.message}`}}));
            }
            break;
        }

        case 'deletePath': {
            const {path: pathToDelete} = payload;
            const absolutePath = path.join(ROOT_DIR, pathToDelete);
            try {
                await fs.rm(absolutePath, {recursive: true, force: true});
                ws.send(JSON.stringify({type: 'deletePathResponse', payload: {path: pathToDelete, success: true}}));
            } catch (error) {
                serverError('Failed to delete path:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to delete path: ${error.message}`}}));
            }
            break;
        }

        case 'renamePath': {
            const {oldPath, newPath} = payload;
            const absoluteOldPath = path.join(ROOT_DIR, oldPath);
            const absoluteNewPath = path.join(ROOT_DIR, newPath);
            try {
                await fs.rename(absoluteOldPath, absoluteNewPath);
                ws.send(JSON.stringify({type: 'renamePathResponse', payload: {oldPath, newPath, success: true}}));
            } catch (error) {
                serverError('Failed to rename path:', error);
                ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to rename path: ${error.message}`}}));
            }
            break;
        }

        case 'runCommand': {
            const {command} = payload;
            try {
                const {stdout, stderr} = await exec(command, {cwd: ROOT_DIR});
                ws.send(JSON.stringify({type: 'commandOutput', payload: {stdout, stderr}}));
            } catch (error) {
                serverError('Failed to execute command:', error);
                ws.send(JSON.stringify({type: 'commandOutput', payload: {stdout: '', stderr: error.message}}));
            }
            break;
        }

        case 'narsese': {
            // This is a simplified interaction. A real implementation would involve
            // converting natural language to Narsese or handling commands.
            const narseseInput = payload;
            broadcast({type: 'log', payload: {source: 'user', message: narseseInput}});

            // For the sketch, we'll treat input as a goal for the planner.
            const plan = await agent.createPlan(narseseInput);

            if (plan && plan.steps.length > 0) {
                const planSteps = plan.steps.map(s => s.toString());
                broadcast({type: 'planCreated', payload: {goal: narseseInput, plan: planSteps}});
                broadcast({
                    type: 'log',
                    payload: {source: 'agent', message: `Plan created for "${narseseInput}": ${planSteps.join(' -> ')}`}
                });
            } else {
                broadcast({
                    type: 'log',
                    payload: {source: 'agent', message: `Could not create a plan for "${narseseInput}".`}
                });
            }
            break;
        }

        case 'agentControl': {
            switch (payload.command) {
                case 'start':
                    // Placeholder for starting the agent's continuous cycle
                    agent.start(); // Assuming this method exists on the Agent
                    broadcast({type: 'log', payload: {source: 'system', message: 'Agent cycling started.'}});
                    break;
                case 'stop':
                    // Placeholder for stopping the agent's continuous cycle
                    agent.stop(); // Assuming this method exists on the Agent
                    broadcast({type: 'log', payload: {source: 'system', message: 'Agent cycling stopped.'}});
                    break;
                case 'reset':
                    // Placeholder for resetting the agent's state
                    await agent.reset(); // Assuming this method exists on the Agent
                    broadcast({type: 'log', payload: {source: 'system', message: 'Agent reset.'}});
                    break;
            }
            break;
        }

        default:
            ws.send(JSON.stringify({type: 'error', payload: {message: `Unknown message type: ${type}`}}));
    }
}