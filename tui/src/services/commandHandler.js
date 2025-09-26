/**
 * @file commandHandler.js
 * @description Command handling logic for the TUI.
 */

/**
 * Creates a command handler function.
 * @param {import('../managers/StateManager').default} stateManager - The state manager.
 * @param {import('../managers/UIManager').default} uiManager - The UI manager.
 * @param {import('./AgentCommunicationService').default} agentService - The agent communication service.
 * @returns {function(string): void} A function that handles commands.
 */
export function createCommandHandler(stateManager, uiManager, agentService) {
    const commandHandlers = {
        '!start': () => {
            agentService.start();
            uiManager.log('Sent !start command.');
        },
        '!stop': () => {
            agentService.stop();
            uiManager.log('Sent !stop command.');
        },
        '!reset': () => {
            agentService.reset();
            uiManager.log('Sent !reset command.');
        },
        '!add': (args) => {
            const task = args.join(' ');
            if (task) {
                agentService.send(task);
                uiManager.log(`Added task: ${task}`);
            } else {
                uiManager.log('Usage: !add <task>');
            }
        },
        '!query': (args) => {
            const query = args.join(' ');
            if (query) {
                agentService.send(query);
                uiManager.log(`Sent query: ${query}`);
            } else {
                uiManager.log('Usage: !query <text>');
            }
        },
        '!stats': () => agentService.getStats(),
        '!help': () => uiManager.components.helpBox.toggle(),
        '!connect': (args) => agentService.connect(args[0]),
        '!disconnect': () => agentService.disconnect(),
        '!clear': () => uiManager.components.logBox.clear(),
        '!quit': () => process.exit(0),
    };

    return function handleCommand(command) {
        stateManager.addCommandToHistory(command);
        const [cmd, ...args] = command.trim().split(/\s+/);

        if (commandHandlers[cmd]) {
            commandHandlers[cmd](args);
        } else {
            uiManager.log(`Unknown command: ${command}`);
        }
        uiManager.render();
    };
}