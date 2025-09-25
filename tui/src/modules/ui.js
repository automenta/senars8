import { appState } from './state.js';

let screen, header, statusBox, taskBox, logBox, inputField, commandInput, helpBox;

export const setScreen = (component) => screen = component;
export const setHeader = (component) => header = component;
export const setStatusBox = (component) => statusBox = component;
export const setTaskBox = (component) => taskBox = component;
export const setLogBox = (component) => logBox = component;
export const setInputField = (component) => inputField = component;
export const setCommandInput = (component) => commandInput = component;
export const setHelpBox = (component) => helpBox = component;

export const logMessage = (message) => {
  logBox.log(message);
  screen.render();
};

export const updateStatus = (status) => {
  appState.agentStatus = status;
  statusBox.setContent(`Agent Status: ${status.connected ? 'Connected' : 'Disconnected'}\n` +
                       `NALs: ${status.NARS ? status.NALS_count : 'N/A'}`);
  screen.render();
};

export const updateTasks = (tasks) => {
  appState.tasks = tasks;
  taskBox.setContent(tasks.map(t => `> ${t.id}: ${t.sentence.value}`).join('\n'));
  screen.render();
};

export const clearCommandInput = () => {
  commandInput.clearValue();
  screen.render();
};

export const toggleHelp = () => {
  helpBox.toggle();
  screen.render();
};

export const focusCommandInput = () => {
    commandInput.focus();
    screen.render();
}

export const renderScreen = () => {
    screen.render();
};