#!/usr/bin/env node

import { createScreen } from './components/screen.js';
import { createHeader } from './components/header.js';
import { createStatusBox } from './components/statusBox.js';
import { createTaskBox } from './components/taskBox.js';
import { createLogBox } from './components/logBox.js';
import { createInputField } from './components/inputField.js';
import { createCommandInput } from './components/commandInput.js';
import { createHelpBox } from './components/helpBox.js';

import { appState } from './modules/state.js';
import { handleCommand } from './modules/commands.js';
import { registerEventHandlers } from './modules/events.js';
import * as ui from './modules/ui.js';

import AgentCommunicationService from './services/AgentCommunicationService.js';

// Create UI components
const screen = createScreen();
const header = createHeader();
const statusBox = createStatusBox();
const taskBox = createTaskBox();
const logBox = createLogBox();
const inputField = createInputField();
const commandInput = createCommandInput();
const helpBox = createHelpBox();

// Append components to the screen
screen.append(header);
screen.append(statusBox);
screen.append(taskBox);
screen.append(logBox);
screen.append(inputField);
screen.append(commandInput);
screen.append(helpBox);

// Set up UI module
ui.setScreen(screen);
ui.setHeader(header);
ui.setStatusBox(statusBox);
ui.setTaskBox(taskBox);
ui.setLogBox(logBox);
ui.setInputField(inputField);
ui.setCommandInput(commandInput);
ui.setHelpBox(helpBox);

// Initialize Agent Communication
const agentService = new AgentCommunicationService('ws://localhost:8080');
registerEventHandlers(agentService);

const components = { screen, header, statusBox, taskBox, logBox, inputField, commandInput, helpBox };

// Handle command input
commandInput.on('submit', (data) => {
  handleCommand(data, components);
  ui.clearCommandInput();
  commandInput.focus();
});

// Handle history navigation
commandInput.key('up', () => {
  if (appState.commandHistory.length > 0 && appState.currentHistoryIndex > 0) {
    appState.currentHistoryIndex--;
    commandInput.setValue(appState.commandHistory[appState.currentHistoryIndex]);
    commandInput.setScrollPerc(100);
  } else if (appState.commandHistory.length > 0 && appState.currentHistoryIndex === -1) {
    appState.currentHistoryIndex = appState.commandHistory.length -1;
    commandInput.setValue(appState.commandHistory[appState.currentHistoryIndex]);
    commandInput.setScrollPerc(100);
  }
});

commandInput.key('down', () => {
  if (appState.commandHistory.length > 0 && appState.currentHistoryIndex < appState.commandHistory.length - 1) {
    appState.currentHistoryIndex++;
    commandInput.setValue(appState.commandHistory[appState.currentHistoryIndex]);
    commandInput.setScrollPerc(100);
  } else {
    commandInput.clearValue();
    appState.currentHistoryIndex = -1;
  }
});

// Handle global key presses
screen.key(['q', 'Q', 'C-c'], () => {
  agentService.disconnect();
  return process.exit(0);
});

screen.key(['escape'], () => {
    commandInput.focus();
    ui.logMessage('Returned focus to command input');
});

// Initial focus
commandInput.focus();

// Render the screen
screen.render();

// Initial log messages
ui.logMessage('SeNARS TUI started. Type !help for commands.');
ui.logMessage('Attempting to connect to agent service...');
agentService.connect();