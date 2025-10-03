import {SystemCommands} from '../../core/system/SystemCommands.js';
import Task from '../../core/core/Task.js';
import {warn} from '../../core/utils/logger.js';
import {createCompositeFilter, createPriorityFilter, createTaskFilter,} from '../utils/taskUtils.js';
import {executeAsync} from '../utils/asyncWrapper.js';

export const handleNarsese = async (payload, ws, agent, broadcast) => {
    const narseseInput = payload;
    broadcast({type: 'log', payload: {source: 'user', message: narseseInput}});

    if (agent.system && agent.system.commandBus) {
        return executeAsync(async () => {
            await agent.system.commandBus.request(SystemCommands.PROCESS_RAW_INPUT, {
                modality: 'narsese',
                input: narseseInput,
            });
        }, ws, 'process Narsese input');
    } else {
        warn('CommandBus not available. Cannot process Narsese input.');
    }
};

export const handleAgentControl = async (payload, ws, agentManager, broadcast) => {
    const {command, maxCycles} = payload;

    return executeAsync(async () => {
        switch (command) {
            case 'start':
                await agentManager.start(maxCycles);
                break;
            case 'stop':
                await agentManager.stop();
                break;
            case 'reset':
                await agentManager.reset();
                break;
            default:
                warn(`Unknown agent control command: ${command}`);
        }
    }, ws, `execute agent control command '${command}'`);
};

const commandMap = {
    start: SystemCommands.SYSTEM_START_CYCLING,
    stop: SystemCommands.SYSTEM_STOP_CYCLING,
    reset: SystemCommands.SYSTEM_RESET,
};


export const handleGetTasks = async (payload, ws, agent) => {
    return executeAsync(async () => {
        if (!agent.system || !agent.system.commandBus) {
            return ws.send(JSON.stringify({type: 'error', payload: {message: 'CommandBus not available.'}}));
        }

        const allTasks = await agent.system.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);

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
    }, ws, 'get tasks');
};

export const handleTaskAction = async (payload, ws, agent, broadcast) => {
    return executeAsync(async () => {
        const {action, taskId, task} = payload;

        switch (action) {
            case 'execute':
                if (!agent.system || !agent.system.commandBus) {
                    return ws.send(JSON.stringify({
                        type: 'error',
                        payload: {message: 'CommandBus not available.'}
                    }));
                }
                await agent.system.commandBus.request(SystemCommands.EXECUTE_ACTION, task);
                broadcast({
                    type: 'task_execution_result',
                    payload: {taskId, status: 'executed', task: task}
                });
                break;

            case 'pause':
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
    }, ws, 'execute task action');
};

export const handleAddTask = async (payload, ws, agent, _broadcast) => {
    return executeAsync(async () => {
        const {taskData} = payload;
        if (!agent.system || !agent.system.commandBus) {
            return ws.send(JSON.stringify({type: 'error', payload: {message: 'CommandBus not available.'}}));
        }

        const task = new Task(
            taskData.statement || taskData.termKey,
            taskData.punctuation || '!',
            {
                priority: taskData.priority || 0.5,
                truthValue: taskData.truthValue || {frequency: 0.5, confidence: 0.5}
            }
        );

        await agent.system.commandBus.request(SystemCommands.SYSTEM_ADD_TASKS, [task]);

        // The confirmation is now handled by the AgentManager's event listener for 'add_task'
    }, ws, 'add task');
};

export const handleSearch = async (payload, ws, agent) => {
    return executeAsync(async () => {
        const {query, scope, limit, _filters} = payload || {};

        if (!query) {
            ws.send(JSON.stringify({
                type: 'search_results',
                payload: {results: [], query, total: 0}
            }));
            return;
        }

        if (!agent.system || !agent.system.commandBus) {
            return ws.send(JSON.stringify({type: 'error', payload: {message: 'CommandBus not available.'}}));
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
    }, ws, 'search');
};