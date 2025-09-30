import { SystemCommands } from '../../core/system/SystemCommands.js';
import Task from '../../core/core/Task.js';
import { serverError, serverWarn } from '../utils/logger.js';
import {
    createTaskFilter,
    createPriorityFilter,
    createCompositeFilter,
} from '../utils/taskUtils.js';

export const handleNarsese = async (payload, ws, agent, broadcast) => {
    const narseseInput = payload;
    broadcast({ type: 'log', payload: { source: 'user', message: narseseInput } });

    if (agent.system && agent.system.commandBus) {
        try {
            await agent.system.commandBus.request(SystemCommands.PROCESS_RAW_INPUT, {
                modality: 'narsese',
                input: narseseInput,
            });
        } catch (error) {
            serverError('Failed to process Narsese input:', error);
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: `Failed to process input: ${error.message}` }
            }));
        }
    } else {
        serverWarn('CommandBus not available. Cannot process Narsese input.');
    }
};

export const handleAgentControl = async (payload, ws, agent, broadcast) => {
    if (!agent.system || !agent.system.commandBus) {
        serverWarn('CommandBus not available. Cannot process agent control command.');
        return;
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
            broadcast({
                type: 'log',
                payload: { source: 'system', message: `Agent command received: ${command}` }
            });
            await agent.system.commandBus.request(systemCommand, { maxCycles });
        } catch (error) {
            serverError(`Failed to execute agent control command '${command}':`, error);
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: `Failed to execute command: ${error.message}` }
            }));
        }
    } else {
        serverWarn(`Unknown agent control command: ${command}`);
    }
};

export const handleGetTasks = async (payload, ws, agent) => {
    try {
        if (!agent.system || !agent.system.commandBus) {
            return ws.send(JSON.stringify({ type: 'error', payload: { message: 'CommandBus not available.' } }));
        }

        const allTasks = await agent.system.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);

        const { filter, priority } = payload;
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
            payload: { message: `Failed to get tasks: ${error.message}` }
        }));
    }
};

export const handleTaskAction = async (payload, ws, agent, broadcast) => {
    try {
        const { action, taskId, task } = payload;

        switch (action) {
            case 'execute':
                if (!agent.system || !agent.system.commandBus) {
                    return ws.send(JSON.stringify({
                        type: 'error',
                        payload: { message: 'CommandBus not available.' }
                    }));
                }
                await agent.system.commandBus.request(SystemCommands.EXECUTE_ACTION, task);
                broadcast({
                    type: 'task_execution_result',
                    payload: { taskId, status: 'executed', task: task }
                });
                break;

            case 'pause':
                broadcast({
                    type: 'task_status_change',
                    payload: { taskId, status: 'paused', task }
                });
                break;

            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: { message: `Unknown task action: ${action}` }
                }));
                break;
        }
    } catch (error) {
        serverError('Failed to execute task action:', error);
        ws.send(JSON.stringify({
            type: 'error',
            payload: { message: `Failed task action: ${error.message}` }
        }));
    }
};

export const handleAddTask = async (payload, ws, agent, broadcast) => {
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
};

export const handleSearch = async (payload, ws, agent) => {
    try {
        const { query, scope, limit, _filters } = payload || {};

        if (!query) {
            ws.send(JSON.stringify({
                type: 'search_results',
                payload: { results: [], query, total: 0 }
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
            payload: { results, query, total: results.length }
        }));
    } catch (error) {
        serverError('Search failed:', error);
        ws.send(JSON.stringify({
            type: 'search_error',
            payload: { message: `Search failed: ${error.message}` }
        }));
    }
};