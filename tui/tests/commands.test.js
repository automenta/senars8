import { handleCommand } from '../src/modules/commands.js';
import { appState } from '../src/modules/state.js';
import * as ui from '../src/modules/ui.js';
import * as theme from '../src/modules/theme.js';
import agentService from '../src/services/AgentCommunicationService.js';
import * as formatters from '../src/utils/formatters.js';

// Mock dependencies
jest.mock('../src/modules/state.js', () => ({
  appState: {
    commandHistory: [],
    currentHistoryIndex: -1,
  },
}));
jest.mock('../src/modules/ui.js', () => ({
  logMessage: jest.fn(),
  updateTaskDisplay: jest.fn(),
}));
jest.mock('../src/modules/theme.js', () => ({
  applyTheme: jest.fn(),
  getAvailableThemes: jest.fn(() => ['default', 'light']),
}));
jest.mock('../src/services/AgentCommunicationService.js', () => ({
  startAgent: jest.fn(),
  stopAgent: jest.fn(),
  resetAgent: jest.fn(),
  sendNarsese: jest.fn(),
  addTask: jest.fn(),
  getSystemStats: jest.fn(),
  getConfig: jest.fn(),
  search: jest.fn(),
  sendMessage: jest.fn(),
}));
jest.mock('../src/utils/formatters.js', () => ({
  formatTasks: jest.fn(),
  formatReasoningTrace: jest.fn(),
  formatNotifications: jest.fn(),
  createDashboardContent: jest.fn(),
}));

describe('TUI Commands', () => {
  let components;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    appState.commandHistory = [];
    appState.currentHistoryIndex = -1;
    components = { screen: { render: jest.fn() } };
  });

  describe('handleCommand', () => {
    it('should add command to history', () => {
      handleCommand('!start', components);
      expect(appState.commandHistory).toEqual(['!start']);
    });

    it('should call executeCommand for commands starting with "!"', () => {
      handleCommand('!start', components);
      expect(agentService.startAgent).toHaveBeenCalled();
    });

    it('should call sendNarsese for other input', () => {
      handleCommand('<a --> b>.', components);
      expect(agentService.sendNarsese).toHaveBeenCalledWith('<a --> b>.');
    });

    it('should not process empty commands', () => {
        handleCommand('  ', components);
        expect(ui.logMessage).not.toHaveBeenCalledWith(expect.stringContaining('>'));
    });
  });

  describe('!theme command', () => {
    it('should apply a theme when a valid theme name is provided', () => {
        handleCommand('!theme light', components);
        expect(theme.applyTheme).toHaveBeenCalledWith(components, 'light');
    });

    it('should log available themes when no theme name is provided', () => {
        handleCommand('!theme', components);
        expect(ui.logMessage).toHaveBeenCalledWith('Available themes: default, light. Usage: !theme <theme_name>');
    });
  });

  describe('!start command', () => {
    it('should call agentService.startAgent', () => {
        handleCommand('!start', components);
        expect(agentService.startAgent).toHaveBeenCalled();
        expect(ui.logMessage).toHaveBeenCalledWith('Sent command to start agent');
    });
  });

  describe('!stop command', () => {
    it('should call agentService.stopAgent', () => {
        handleCommand('!stop', components);
        expect(agentService.stopAgent).toHaveBeenCalled();
        expect(ui.logMessage).toHaveBeenCalledWith('Sent command to stop agent');
    });
  });

  describe('!reset command', () => {
    it('should call agentService.resetAgent', () => {
        handleCommand('!reset', components);
        expect(agentService.resetAgent).toHaveBeenCalled();
        expect(ui.logMessage).toHaveBeenCalledWith('Sent command to reset agent');
    });
  });

  describe('!add command', () => {
    it('should add a task when a statement is provided', () => {
        handleCommand('!add <a --> b>.', components);
        expect(agentService.addTask).toHaveBeenCalledWith({
            statement: '<a --> b>.',
            punctuation: '.',
            priority: 0.5,
        });
    });

    it('should show usage when no statement is provided', () => {
        handleCommand('!add', components);
        expect(ui.logMessage).toHaveBeenCalledWith('Usage: !add <task_statement>');
    });
  });
});