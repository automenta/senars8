import * as ui from './ui.js';
import { appState } from './state.js';

export const handleCommand = (command, agentService) => {
  if (!command) return;

  appState.commandHistory.push(command);
  appState.currentHistoryIndex = appState.commandHistory.length;

  const parts = command.split(' ');
  const cmd = parts[0];

  switch (cmd) {
    case '!help':
      ui.toggleHelp();
      break;
    case '!connect':
      if (!appState.isConnected) {
        ui.logMessage('Connecting...');
        agentService.connect();
      } else {
        ui.logMessage('Already connected.');
      }
      break;
    case '!disconnect':
      if (appState.isConnected) {
        ui.logMessage('Disconnecting...');
        agentService.disconnect();
      } else {
        ui.logMessage('Already disconnected.');
      }
      break;
    default:
      if (appState.isConnected) {
        agentService.send(command);
        ui.logMessage(`Sent: ${command}`);
      } else {
        ui.logMessage('Not connected to agent. Use !connect');
      }
  }
};