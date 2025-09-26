/**
 * @file commandHandler.js
 * @description Command handling logic for the TUI.
 */

/**
 * Command definitions containing description, usage, and handler function.
 */
export const commandDefinitions = {
    '!start': {
        description: 'Starts the agent cycling process.',
        usage: '!start',
        handler: (args, { agentService, uiManager }) => {
            agentService.start();
            uiManager.log('Sent !start command.');
        },
    },
    '!stop': {
        description: 'Stops the agent cycling process.',
        usage: '!stop',
        handler: (args, { agentService, uiManager }) => {
            agentService.stop();
            uiManager.log('Sent !stop command.');
        },
    },
    '!reset': {
        description: 'Resets the agent to its initial state.',
        usage: '!reset',
        handler: (args, { agentService, uiManager }) => {
            agentService.reset();
            uiManager.log('Sent !reset command.');
        },
    },
    '!add': {
        description: 'Adds a new task to the agent.',
        usage: '!add <narsese_task>',
        handler: (args, { agentService, uiManager }) => {
            const task = args.join(' ');
            if (task) {
                agentService.send(task);
                uiManager.log(`Added task: ${task}`);
            } else {
                uiManager.log(`Usage: ${commandDefinitions['!add'].usage}`);
            }
        },
    },
    '!query': {
        description: 'Sends a query to the agent.',
        usage: '!query <narsese_query>',
        handler: (args, { agentService, uiManager }) => {
            const query = args.join(' ');
            if (query) {
                agentService.send(query);
                uiManager.log(`Sent query: ${query}`);
            } else {
                uiManager.log(`Usage: ${commandDefinitions['!query'].usage}`);
            }
        },
    },
    '!stats': {
        description: 'Retrieves system statistics from the agent.',
        usage: '!stats',
        handler: (args, { agentService }) => agentService.getStats(),
    },
    '!help': {
        description: 'Shows or hides the help screen.',
        usage: '!help',
        handler: (args, { uiManager }) => uiManager.toggleHelp(),
    },
    '!connect': {
        description: 'Connects to the agent WebSocket server.',
        usage: '!connect [url]',
        handler: (args, { agentService }) => agentService.connect(args[0]),
    },
    '!disconnect': {
        description: 'Disconnects from the agent WebSocket server.',
        usage: '!disconnect',
        handler: (args, { agentService }) => agentService.disconnect(),
    },
    '!clear': {
        description: 'Clears the log view.',
        usage: '!clear',
        handler: (args, { uiManager }) => uiManager.clearLog(),
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
 * @param {import('./AgentCommunicationService').default} agentService - The agent communication service.
 * @returns {function(string): void} A function that handles commands.
 */
export function createCommandHandler(stateManager, uiManager, agentService) {
    return function handleCommand(command) {
        stateManager.addCommandToHistory(command);
        const [cmd, ...args] = command.trim().split(/\s+/);

        const commandDef = commandDefinitions[cmd];
        if (commandDef) {
            commandDef.handler(args, { stateManager, uiManager, agentService });
        } else {
            uiManager.log(`Unknown command: ${command}`);
        }
        uiManager.render();
    };
}