/**
 * @file commandHandler.js
 * @description Command handling logic for the TUI.
 */
import {validateNarseseStatement} from '../../../common/utils/coreUtils.js';

/**
 * Command definitions containing description, usage, and handler function.
 */
export const commandDefinitions = {
    '!start': {
        description: 'Starts the agent cycling process.',
        usage: '!start',
        handler: (args, {agentService, uiManager}) => {
            agentService.startAgent();
            uiManager.log('Sent !start command.');
        },
    },
    '!stop': {
        description: 'Stops the agent cycling process.',
        usage: '!stop',
        handler: (args, {agentService, uiManager}) => {
            agentService.stopAgent();
            uiManager.log('Sent !stop command.');
        },
    },
    '!reset': {
        description: 'Resets the agent to its initial state.',
        usage: '!reset',
        handler: (args, {agentService, uiManager}) => {
            agentService.resetAgent();
            uiManager.log('Sent !reset command.');
        },
    },
    '!add': {
        description: 'Adds a new task to the agent.',
        usage: '!add <narsese_task>',
        handler: (args, {agentService, uiManager}) => {
            const task = args.join(' ');
            const validation = validateNarseseStatement(task);
            if (validation.valid) {
                agentService.sendNarsese(task);
                uiManager.log(`Added task: ${task}`);
            } else {
                uiManager.log(`Invalid task format: ${validation.error}`);
            }
        },
    },
    '!query': {
        description: 'Sends a query to the agent.',
        usage: '!query <narsese_query>',
        handler: (args, {agentService, uiManager}) => {
            const query = args.join(' ');
            const validation = validateNarseseStatement(query);
            if (validation.valid) {
                agentService.sendNarsese(query);
                uiManager.log(`Sent query: ${query}`);
            } else {
                uiManager.log(`Invalid query format: ${validation.error}`);
            }
        },
    },
    '!stats': {
        description: 'Retrieves system statistics from the agent.',
        usage: '!stats',
        handler: (args, {agentService}) => agentService.getSystemStats(),
    },
    '!help': {
        description: 'Shows or hides the help screen.',
        usage: '!help',
        handler: (args, {uiManager}) => uiManager.toggleHelp(),
    },
    '!connect': {
        description: 'Connects to the agent WebSocket server.',
        usage: '!connect [url]',
        handler: (args, {agentService, uiManager}) => {
            const url = args[0] || 'ws://localhost:8080';
            agentService.connect(url);
            uiManager.log(`Connecting to: ${url}`);
        },
    },
    '!disconnect': {
        description: 'Disconnects from the agent WebSocket server.',
        usage: '!disconnect',
        handler: (args, {agentService, uiManager}) => {
            agentService.disconnect();
            uiManager.log('Disconnected from agent service');
        },
    },
    '!clear': {
        description: 'Clears the log view.',
        usage: '!clear',
        handler: (args, {uiManager}) => uiManager.clearLog(),
    },
    '!quit': {
        description: 'Exits the TUI application.',
        usage: '!quit',
        handler: () => process.exit(0),
    },
};

/**
 * Creates a command handler function.
 * @param {import('../managers/StateManager').default} stateManager - The state manager.
 * @param {import('../managers/UIManager').default} uiManager - The UI manager.
 * @param {import('../../common/services/AgentCommunicationService').default} agentService - The agent communication service.
 * @returns {function(string): void} A function that handles commands.
 */
export function createCommandHandler(stateManager, uiManager, agentService) {
    return function handleCommand(command) {
        stateManager.addCommandToHistory(command);
        const [cmd, ...args] = command.trim().split(/\s+/);

        const commandDef = commandDefinitions[cmd];
        if (commandDef) {
            commandDef.handler(args, {stateManager, uiManager, agentService});
        } else {
            uiManager.log(`Unknown command: ${command}`);
        }
        uiManager.render();
    };
}