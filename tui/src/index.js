#!/usr/bin/env node

import StateManager from './managers/StateManager.js';
import UIManager from './managers/UIManager.js';
import AgentCommunicationService from './services/AgentCommunicationService.js';

// --- Initialization ---
const stateManager = new StateManager();
const uiManager = new UIManager(stateManager);
const agentService = new AgentCommunicationService('ws://localhost:8080');

// --- Event Wiring ---

// Agent Service -> UI & State
agentService.on('connect', () => {
    stateManager.set('isConnected', true);
    uiManager.log('Connected to agent service.');
    uiManager.updateStatusBar();
});

agentService.on('disconnect', () => {
    stateManager.set('isConnected', false);
    uiManager.log('Disconnected from agent service.');
    uiManager.updateStatusBar();
});

agentService.on('data', (data) => {
    if (data.type === 'tasks') {
        stateManager.setTasks(data.tasks);
        uiManager.updateTasks(data.tasks);
    } else if (data.type === 'log') {
        uiManager.log(data.message);
    }
    uiManager.render();
});

agentService.on('error', (error) => {
    uiManager.log(`Error: ${error.message}`);
});

// UI -> Agent Service & State
uiManager.components.narseseInput.on('submit', (narsese) => {
    if (narsese && stateManager.get('isConnected')) {
        agentService.send(narsese);
        uiManager.components.narseseInput.clearValue();
    }
});

uiManager.components.commandInput.on('submit', (command) => {
    handleCommand(command);
    uiManager.components.commandInput.clearValue();
});

// --- Command Handling ---
function handleCommand(command) {
    stateManager.addCommandToHistory(command);
    const [cmd, ...args] = command.trim().split(/\s+/);

    switch (cmd) {
        case '!help':
            uiManager.components.helpBox.toggle();
            break;
        case '!connect':
            agentService.connect(args[0]);
            break;
        case '!disconnect':
            agentService.disconnect();
            break;
        case '!clear':
            uiManager.components.logBox.clear();
            break;
        default:
            uiManager.log(`Unknown command: ${command}`);
    }
    uiManager.render();
}

// --- History Navigation for Command Input ---
uiManager.components.commandInput.key('up', () => {
    const prevCommand = stateManager.getPreviousCommand();
    if (prevCommand !== null) {
        uiManager.components.commandInput.setValue(prevCommand);
        uiManager.render();
    }
});

uiManager.components.commandInput.key('down', () => {
    const nextCommand = stateManager.getNextCommand();
    uiManager.components.commandInput.setValue(nextCommand);
    uiManager.render();
});


// --- Initial State and Startup ---
uiManager.updateStatusBar();
uiManager.log('SeNARS TUI started. Press ":" to enter commands, "i" to input Narsese.');
uiManager.log('Type !help for a list of commands.');
uiManager.render();

// Automatically connect on startup
agentService.connect();

// Set initial focus
uiManager.components.narseseInput.focus();
stateManager.set('focusedComponent', 'narseseInput');
uiManager.updateStatusBar();