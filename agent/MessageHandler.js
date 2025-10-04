import {debug} from '../core/utils/logger.js';
import {
    handleCreateDirectory,
    handleCreateFile,
    handleDeletePath,
    handleReadDirectory,
    handleReadFile,
    handleRenamePath,
    handleWriteFile
} from './api/fileSystem.js';
import {handleRunCommand} from './api/command.js';
import {
    handleAddTask,
    handleAgentControl,
    handleGetBeliefs,
    handleGetGoals,
    handleGetQuestions,
    handleGetSystemStats,
    handleGetTasks,
    handleNarsese,
    handleSearch,
    handleTaskAction
} from './api/agent.js';

export const createMessageHandler = (agentManager, broadcast) => {
    const agent = agentManager.getAgent();
    const messageHandlers = {
        // File System
        readDirectory: (payload, ws) => handleReadDirectory(payload, ws),
        readFile: (payload, ws) => handleReadFile(payload, ws),
        writeFile: (payload, ws) => handleWriteFile(payload, ws),
        createFile: (payload, ws) => handleCreateFile(payload, ws),
        createDirectory: (payload, ws) => handleCreateDirectory(payload, ws),
        deletePath: (payload, ws) => handleDeletePath(payload, ws),
        renamePath: (payload, ws) => handleRenamePath(payload, ws),

        // Command
        runCommand: (payload, ws) => handleRunCommand(payload, ws),

        // Agent
        narsese: (payload, ws) => handleNarsese(payload, ws, agent, broadcast),
        agentControl: (payload, ws) => handleAgentControl(payload, ws, agentManager, broadcast),
        get_system_stats: (payload, ws) => handleGetSystemStats(payload, ws, agent),
        get_tasks: (payload, ws) => handleGetTasks(payload, ws, agent),
        get_beliefs: (payload, ws) => handleGetBeliefs(payload, ws, agent),
        get_goals: (payload, ws) => handleGetGoals(payload, ws, agent),
        get_questions: (payload, ws) => handleGetQuestions(payload, ws, agent),
        task_action: (payload, ws) => handleTaskAction(payload, ws, agent, broadcast),
        add_task: (payload, ws) => handleAddTask(payload, ws, agent, broadcast),
        search: (payload, ws) => handleSearch(payload, ws, agent),
    };

    return async (message, ws) => {
        const {type, payload} = message;
        debug(`received: ${type}`, payload);

        const handler = messageHandlers[type];
        if (handler) {
            await handler(payload, ws);
        } else {
            // Use custom JSON serialization to handle BigInt values
            const errorMessage = JSON.stringify({
                type: 'error',
                payload: {message: `Unknown message type: ${type}`}
            }, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            });
            ws.send(errorMessage);
        }
    };
};