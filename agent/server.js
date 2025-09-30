import {WebSocketServer} from 'ws';
import fs from 'fs/promises';
import path from 'path';
import {exec as childExec} from 'child_process';
import {promisify} from 'util';
import {Agent} from './index.js';
import {debug as coreDebug, error as coreError, info as coreInfo, warn as coreWarn} from '../core/utils/logger.js';
import { SystemCommands } from '../core/system/SystemCommands.js';
import Task from '../core/core/Task.js';

const exec = promisify(childExec);

/**
 * Format a task object for broadcasting to clients
 * @param {Object} task - The task object to format
 * @returns {Object} - The formatted task
 */
const formatTaskForBroadcast = (task) => ({
    id: task.id,
    termKey: task.termKey,
    punctuation: task.punctuation,
    priority: task.state?.priority || 0,
    truthValue: task.state?.truthValue || {frequency: 0.5, confidence: 0.5},
    occurrenceTime: task.state?.occurrenceTime || null,
    creationTime: task.state?.stamp?.creationTime || Date.now()
});

/**
 * Creates a filter function for tasks based on their punctuation type
 * @param {string} filter - The filter type ('belief', 'goal', 'question', or 'all')
 * @returns {Function} - A filter function
 */
const createTaskFilter = (filter) => (task) => {
    switch (filter) {
        case 'belief':
            return task.punctuation === '.';
        case 'goal':
            return task.punctuation === '!';
        case 'question':
            return task.punctuation === '?';
        default:
            return true;
    }
};

/**
 * Creates a filter function for tasks based on their priority level
 * @param {string} priority - The priority level ('high', 'medium', 'low', or 'all')
 * @returns {Function} - A filter function
 */
const createPriorityFilter = (priority) => (task) => {
    const taskPriority = task.state?.priority || task.priority || 0;
    switch (priority) {
        case 'high':
            return taskPriority >= 0.7;
        case 'medium':
            return taskPriority >= 0.3 && taskPriority < 0.7;
        case 'low':
            return taskPriority < 0.3;
        default:
            return true;
    }
};

/**
 * Utility function to create a composite filter that combines multiple filter functions
 * @param {...Function} filters - Filter functions to combine
 * @returns {Function} - A function that returns true if all filters pass
 */
const createCompositeFilter = (...filters) => (task) => {
    for (const filter of filters) {
        if (!filter(task)) {
            return false;
        }
    }
    return true;
};

const getSystemStats = async () => {
    if (!agent.system || !agent.system.commandBus) {
        serverWarn('Cannot get system stats, command bus not available.');
        return {
            cycleCount: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            temperature: 0,
            beliefs: 0,
            goals: 0,
            questions: 0,
            tasks: 0
        };
    }
    try {
        const stats = await agent.system.commandBus.request(SystemCommands.SYSTEM_GET_STATS);
        return {
            ...stats,
            cpuUsage: 0, // Not implemented yet
            temperature: 0, // Not implemented yet
        };
    } catch (error) {
        serverError('Failed to get system stats via command:', error);
        return {
            cycleCount: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            temperature: 0,
            beliefs: 0,
            goals: 0,
            questions: 0,
            tasks: 0
        };
    }
};

const wss = new WebSocketServer({port: 8080});

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

const broadcastLog = (level, message, ...args) => {
    broadcast({type: 'logMessage', payload: {level, message, args, timestamp: new Date().toISOString()}})
};

const serverDebug = (message, ...args) => {
    coreDebug(message, ...args);
    broadcastLog('DEBUG', message, ...args);
};
const serverInfo = (message, ...args) => {
    coreInfo(message, ...args);
    broadcastLog('INFO', message, ...args);
};
const serverWarn = (message, ...args) => {
    coreWarn(message, ...args);
    broadcastLog('WARN', message, ...args);
};
const serverError = (message, ...args) => {
    coreError(message, ...args);
    broadcastLog('ERROR', message, ...args);
};

serverInfo('Agent WebSocket server started on port 8080');

const agent = new Agent();

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
            broadcast({type: 'add_belief', payload: formatTaskForBroadcast(belief)});
        });

        eventBus.on('add_goal', (goal) => {
            broadcast({type: 'add_goal', payload: formatTaskForBroadcast(goal)});
        });

        eventBus.on('add_question', (question) => {
            broadcast({type: 'add_question', payload: formatTaskForBroadcast(question)});
        });

        eventBus.on('add_task', (task) => {
            broadcast({type: 'task_added', payload: formatTaskForBroadcast(task)});
        });

        eventBus.on('reasoning_step', (step) => {
            broadcast({type: 'reasoning_step', payload: step});
        });

        eventBus.on('memory_changed', (changes) => {
            broadcast({type: 'memory_update', payload: changes});
        });

        const systemStatsInterval = setInterval(async () => {
            try {
                broadcast({
                    type: 'system_stats',
                    payload: await getSystemStats()
                });
            } catch (error) {
                serverError('Error broadcasting system stats:', error);
            }
        }, 3000); // Broadcast every 3 seconds

        // Store interval ID to clear it on error
        agent.systemStatsInterval = systemStatsInterval;

    } else {
        serverWarn('Agent event bus not available. UI will not receive real-time updates.');
    }

    return true; // Return a value to satisfy the eslint rule
}).catch(err => {
    serverError('Agent initialization failed:', err);
    broadcast({type: 'agentStatus', payload: 'initialization_failed'});

    // Clear interval if it was set
    if (agent.systemStatsInterval) {
        clearInterval(agent.systemStatsInterval);
        agent.systemStatsInterval = null;
    }

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
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to read directory: ${error.message}`}
                }));
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
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to create directory: ${error.message}`}
                }));
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
            const narseseInput = payload;
            broadcast({ type: 'log', payload: { source: 'user', message: narseseInput } });

            if (agent.system && agent.system.commandBus) {
                try {
                    await agent.system.commandBus.request(SystemCommands.PROCESS_RAW_INPUT, {
                        modality: 'narsese',
                        input: narseseInput,
                    });
                    // Optional: Add a confirmation message if needed
                    // broadcast({ type: 'log', payload: { source: 'system', message: 'Input processed.' } });
                } catch (error) {
                    serverError('Failed to process Narsese input:', error);
                    ws.send(JSON.stringify({ type: 'error', payload: { message: `Failed to process input: ${error.message}` } }));
                }
            } else {
                serverWarn('CommandBus not available. Cannot process Narsese input.');
            }
            break;
        }

        case 'agentControl': {
            if (!agent.system || !agent.system.commandBus) {
                serverWarn('CommandBus not available. Cannot process agent control command.');
                break;
            }

            const { command, maxCycles } = payload;
            const commandMap = {
                start: SystemCommands.SYSTEM_START_CYCLING,
                stop: SystemCommands.SYSTEM_STOP_CYCLING,
                reset: SystemCommands.SYSTEM_RESET,
            };

            const systemCommand = commandMap[command];
            if (systemCommand) {
                try {
                    broadcast({ type: 'log', payload: { source: 'system', message: `Agent command received: ${command}` } });
                    await agent.system.commandBus.request(systemCommand, { maxCycles });
                } catch (error) {
                    serverError(`Failed to execute agent control command '${command}':`, error);
                    ws.send(JSON.stringify({ type: 'error', payload: { message: `Failed to execute command: ${error.message}` } }));
                }
            } else {
                serverWarn(`Unknown agent control command: ${command}`);
            }
            break;
        }

        case 'get_tasks': {
            // Return the current tasks from the agent's memory
            try {
                if (!agent.system || !agent.system.commandBus) {
                    return ws.send(JSON.stringify({ type: 'error', payload: { message: 'CommandBus not available.' } }));
                }

                const allTasks = await agent.system.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);

                // Apply filters if provided
                const {filter, priority} = payload;
                let filteredTasks = allTasks;

                const activeFilters = [];
                if (filter && filter !== 'all') {
                    activeFilters.push(createTaskFilter(filter));
                }

                if (priority && priority !== 'all') {
                    activeFilters.push(createPriorityFilter(priority));
                }

                if (activeFilters.length > 0) {
                    const combinedFilter = createCompositeFilter(...activeFilters);
                    filteredTasks = filteredTasks.filter(combinedFilter);
                }

                ws.send(JSON.stringify({
                    type: 'tasks_response',
                    payload: {
                        tasks: filteredTasks,
                        total: filteredTasks.length
                    }
                }));
            } catch (error) {
                serverError('Failed to get tasks:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to get tasks: ${error.message}`}
                }));
            }
            break;
        }

        case 'task_action': {
            try {
                const {action, taskId, task} = payload;

                switch (action) {
                    case 'execute':
                        if (!agent.system || !agent.system.commandBus) {
                            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'CommandBus not available.' } }));
                        }
                        // The core system should be responsible for creating the task.
                        // We just pass the raw data.
                        await agent.system.commandBus.request(SystemCommands.EXECUTE_ACTION, task);
                        broadcast({
                            type: 'task_execution_result',
                            payload: {taskId, status: 'executed', task: task}
                        });
                        break;

                    case 'pause':
                        // For now, just broadcast the action for UI feedback
                        broadcast({
                            type: 'task_status_change',
                            payload: {taskId, status: 'paused', task}
                        });
                        break;

                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: {message: `Unknown task action: ${action}`}
                        }));
                        break;
                }
            } catch (error) {
                serverError('Failed to execute task action:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed task action: ${error.message}`}
                }));
            }
            break;
        }

        case 'add_task': {
            try {
                const { taskData } = payload;
                if (!agent.system || !agent.system.commandBus) {
                    return ws.send(JSON.stringify({ type: 'error', payload: { message: 'CommandBus not available.' } }));
                }

                const task = new Task(
                    taskData.statement || taskData.termKey,
                    taskData.punctuation || '!',
                    {
                        priority: taskData.priority || 0.5,
                        truthValue: taskData.truthValue || { frequency: 0.5, confidence: 0.5 }
                    }
                );

                await agent.system.commandBus.request(SystemCommands.SYSTEM_ADD_TASKS, [task]);
                broadcast({
                    type: 'task_added',
                    payload: { task: task.toString(), id: task.id }
                });

            } catch (error) {
                serverError('Failed to add task:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: { message: `Failed to add task: ${error.message}` }
                }));
            }
            break;
        }

        case 'search': {
            try {
                const {query, scope, limit, _filters} = payload || {};

                if (!query) {
                    ws.send(JSON.stringify({
                        type: 'search_results',
                        payload: {results: [], query, total: 0}
                    }));
                    return;
                }

                if (!agent.system || !agent.system.commandBus) {
                    return ws.send(JSON.stringify({ type: 'error', payload: { message: 'CommandBus not available.' } }));
                }

                const allTasks = await agent.system.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);
                const normalizedQuery = query.toLowerCase();

                const scopeFilter = (task) => {
                    if (!scope || scope === 'all') return true;
                    if (scope === 'beliefs') return task.punctuation === '.';
                    if (scope === 'goals') return task.punctuation === '!';
                    if (scope === 'questions') return task.punctuation === '?';
                    return false;
                };

                const results = allTasks
                    .filter(task => task.termKey && task.termKey.toLowerCase().includes(normalizedQuery))
                    .filter(scopeFilter)
                    .slice(0, limit || 50);


                ws.send(JSON.stringify({
                    type: 'search_results',
                    payload: {results, query, total: results.length}
                }));
            } catch (error) {
                serverError('Search failed:', error);
                ws.send(JSON.stringify({
                    type: 'search_error',
                    payload: {message: `Search failed: ${error.message}`}
                }));
            }
            break;
        }

        case 'get_system_stats': {
            try {
                const systemStats = await getSystemStats();
                ws.send(JSON.stringify({
                    type: 'system_stats',
                    payload: systemStats
                }));
            } catch (error) {
                serverError('Failed to get system stats:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to get system stats: ${error.message}`}
                }));
            }
            break;
        }

        case 'system_stats': {
            // This is handled by the UI
            ws.send(JSON.stringify({
                type: 'error',
                payload: {message: 'system_stats is for server-to-client communication only'}
            }));
            break;
        }

        case 'get_config': {
            try {
                // Return the current agent configuration
                // For now, return a basic config - in a real implementation,
                // this would return the actual system configuration
                const config = {
                    core: {
                        CYCLE_DELAY_MS: 50,
                        FOCUS_SET_SIZE: 20,
                        META_TASK_PRIORITY: 0.9,
                        ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.1,
                        MAX_GOALS_TO_EXECUTE: 3,
                        RECENCY_DECAY_FACTOR: 10000,
                        SIMILARITY_OFFSET: 0.1
                    },
                    memory: {
                        FORGETTING_STRATEGY_NAME: 'TimeBased',
                        CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
                        CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9,
                        MAINTENANCE_CYCLE_FREQUENCY: 10,
                        MAX_SHORT_TERM_TASKS: 1000,
                        MAX_LONG_TERM_TASKS: 10000
                    },
                    reasoning: {
                        MAX_REASONING_DEPTH: 5,
                        MAX_REASONING_STEPS: 100,
                        SIMILARITY_THRESHOLD: 0.8,
                        CONTRADICTION_RESOLUTION_ENABLED: true,
                        TEMPORAL_REASONING_ENABLED: true
                    },
                    agent: {
                        MAX_CYCLES: 0, // 0 means infinite
                        LOG_LEVEL: 'info',
                        ENABLE_SELF_MODIFICATION: false
                    }
                };

                ws.send(JSON.stringify({
                    type: 'config_response',
                    payload: config
                }));
            } catch (error) {
                serverError('Failed to get config:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to get config: ${error.message}`}
                }));
            }
            break;
        }

        case 'update_config': {
            try {
                const {config} = payload;

                if (!config || typeof config !== 'object') {
                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: {message: 'Invalid config object provided'}
                    }));
                    return;
                }

                // In a real implementation, this would update the actual system configuration
                // For now, we'll just acknowledge the update
                serverInfo('Configuration update requested:', config);

                // Update the agent's config if available
                if (agent.config) {
                    const updateConfig = (target, updates) => {
                        for (const [key, value] of Object.entries(updates)) {
                            if (typeof value === 'object' && value !== null && target[key] && typeof target[key] === 'object') {
                                updateConfig(target[key], value);
                            } else {
                                target[key] = value;
                            }
                        }
                    };
                    
                    updateConfig(agent.config, config);
                    
                    ws.send(JSON.stringify({
                        type: 'config_updated',
                        payload: {success: true, message: 'Configuration updated successfully', updatedConfig: config}
                    }));
                } else {
                    ws.send(JSON.stringify({
                        type: 'config_updated',
                        payload: {success: false, message: 'Config system not available for updates', updatedConfig: config}
                    }));
                }
            } catch (error) {
                serverError('Failed to update config:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to update config: ${error.message}`}
                }));
            }
            break;
        }

        case 'reasoning_debug': {
            try {
                const {statement, parsedTerm} = payload;

                // For now, return a mock debug response
                // In a real implementation, this would perform actual reasoning debugging
                const debugResponse = {
                    statement: statement,
                    parsedTerm: parsedTerm,
                    reasoningSteps: [
                        {
                            type: 'input_processing',
                            description: 'Input statement parsed and validated',
                            timestamp: new Date().toISOString()
                        },
                        {
                            type: 'task_creation',
                            description: 'Created task from input statement',
                            timestamp: new Date().toISOString()
                        },
                        {
                            type: 'reasoning_cycle',
                            description: 'Processing in reasoning cycle',
                            timestamp: new Date().toISOString()
                        }
                    ],
                    newTasks: [],
                    success: true
                };

                ws.send(JSON.stringify({
                    type: 'reasoning_debug_response',
                    payload: debugResponse
                }));
            } catch (error) {
                serverError('Failed to debug reasoning:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Failed to debug reasoning: ${error.message}`}
                }));
            }
            break;
        }

        default:
            ws.send(JSON.stringify({type: 'error', payload: {message: `Unknown message type: ${type}`}}));
    }
}