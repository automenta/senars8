import * as ui from './ui.js';
import { appState } from './state.js';

export const registerEventHandlers = (agentService) => {
  agentService.on('open', () => {
    appState.isConnected = true;
    ui.updateStatus({ connected: true });
    ui.logMessage('Connected to agent service.');
  });

  agentService.on('close', () => {
    appState.isConnected = false;
    ui.updateStatus({ connected: false });
    ui.logMessage('Disconnected from agent service.');
  });

  agentService.on('error', (error) => {
    ui.logMessage(`WebSocket error: ${error.message}`);
  });

  agentService.on('message', (data) => {
    const message = JSON.parse(data);
    switch (message.type) {
      case 'status':
        ui.updateStatus({ ...appState.agentStatus, ...message.payload });
        break;
      case 'tasks':
        ui.updateTasks(message.payload);
        break;
      case 'log':
        ui.logMessage(`AGENT: ${message.payload}`);
        break;
      default:
        ui.logMessage(`Unknown message type: ${message.type}`);
    }
  });
};