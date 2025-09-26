#!/usr/bin/env node

import StateManager from './managers/StateManager.js';
import UIManager from './managers/UIManager.js';
import AgentCommunicationService from '../../common/services/AgentCommunicationService.js';
import { createCommandHandler } from './services/commandHandler.js';
import { CONNECTION_STATUS, MESSAGE_TYPES } from '../../common/constants/communication.js';

// --- Initialization ---
const stateManager = new StateManager();
const uiManager = new UIManager(stateManager);
const agentService = new AgentCommunicationService('ws://localhost:8080');
const handleCommand = createCommandHandler(stateManager, uiManager, agentService);

// --- Event Wiring ---

// Agent Service -> UI & State
agentService.on('status', (status) => {
    const isConnected = status === CONNECTION_STATUS.CONNECTED;
    stateManager.set('isConnected', isConnected);
    uiManager.log(isConnected ? 'Connected to agent service.' : 'Disconnected from agent service.');
    uiManager.updateStatusBar();
});

agentService.on('message', (data) => {
    switch (data.type) {
        case 'tasks':
            stateManager.setTasks(data.payload);
            uiManager.updateTasks(data.payload);
            break;
        case 'beliefs':
            stateManager.setBeliefs(data.payload);
            uiManager.updateBeliefs(data.payload);
            break;
        case 'log':
            uiManager.log(data.payload.message);
            break;
        case MESSAGE_TYPES.SYSTEM_STATS:
            uiManager.log('Agent Stats:\n' + JSON.stringify(data.payload, null, 2));
            break;
    }
    uiManager.render();
});

agentService.on('error', (error) => {
    uiManager.log(`Error: ${error.message}`);
});

// UI -> Agent Service & State
uiManager.components.narseseInput.on('submit', (narsese) => {
    if (narsese && stateManager.get('isConnected')) {
        agentService.sendNarsese(narsese);
        uiManager.components.narseseInput.clearValue();
    }
});

uiManager.components.commandInput.on('submit', (command) => {
    handleCommand(command);
    uiManager.components.commandInput.clearValue();
});

// --- Command Handling ---
// The handleCommand function is now created by createCommandHandler
// and initialized above.

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