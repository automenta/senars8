import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createCommandHandler } from '../src/services/commandHandler.js';

describe('createCommandHandler', () => {
    let mockStateManager;
    let mockUIManager;
    let mockAgentService;
    let handleCommand;

    beforeEach(() => {
        jest.clearAllMocks();

        mockStateManager = {
            addCommandToHistory: jest.fn(),
        };

        mockUIManager = {
            log: jest.fn(),
            render: jest.fn(),
            components: {
                logBox: {
                    clear: jest.fn(),
                },
                helpBox: {
                    toggle: jest.fn(),
                },
            },
        };

        mockAgentService = {
            start: jest.fn(),
            stop: jest.fn(),
            reset: jest.fn(),
            send: jest.fn(),
            getStats: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
        };

        handleCommand = createCommandHandler(mockStateManager, mockUIManager, mockAgentService);
    });

    test('should add command to history', () => {
        handleCommand('!start');
        expect(mockStateManager.addCommandToHistory).toHaveBeenCalledWith('!start');
    });

    test('should call agentService.start on !start command', () => {
        handleCommand('!start');
        expect(mockAgentService.start).toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent !start command.');
    });

    test('should call agentService.stop on !stop command', () => {
        handleCommand('!stop');
        expect(mockAgentService.stop).toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent !stop command.');
    });

    test('should call agentService.reset on !reset command', () => {
        handleCommand('!reset');
        expect(mockAgentService.reset).toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent !reset command.');
    });

    test('should send task on !add command', () => {
        handleCommand('!add <a --> b>.');
        expect(mockAgentService.send).toHaveBeenCalledWith('<a --> b>.');
        expect(mockUIManager.log).toHaveBeenCalledWith('Added task: <a --> b>.');
    });

    test('should show usage on !add command without task', () => {
        handleCommand('!add');
        expect(mockAgentService.send).not.toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Usage: !add <task>');
    });

    test('should send query on !query command', () => {
        handleCommand('!query what is love?');
        expect(mockAgentService.send).toHaveBeenCalledWith('what is love?');
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent query: what is love?');
    });

    test('should show usage on !query command without query', () => {
        handleCommand('!query');
        expect(mockAgentService.send).not.toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Usage: !query <text>');
    });

    test('should call agentService.getStats on !stats command', () => {
        handleCommand('!stats');
        expect(mockAgentService.getStats).toHaveBeenCalled();
    });

    test('should toggle help box on !help command', () => {
        handleCommand('!help');
        expect(mockUIManager.components.helpBox.toggle).toHaveBeenCalled();
    });

    test('should connect to agent on !connect command', () => {
        handleCommand('!connect ws://new-agent:9090');
        expect(mockAgentService.connect).toHaveBeenCalledWith('ws://new-agent:9090');
    });

    test('should disconnect from agent on !disconnect command', () => {
        handleCommand('!disconnect');
        expect(mockAgentService.disconnect).toHaveBeenCalled();
    });

    test('should clear log box on !clear command', () => {
        handleCommand('!clear');
        expect(mockUIManager.components.logBox.clear).toHaveBeenCalled();
    });

    test('should exit process on !quit command', () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        handleCommand('!quit');
        expect(mockExit).toHaveBeenCalledWith(0);
        mockExit.mockRestore();
    });

    test('should log unknown command', () => {
        handleCommand('!unknown');
        expect(mockUIManager.log).toHaveBeenCalledWith('Unknown command: !unknown');
    });

    test('should call uiManager.render after every command', () => {
        handleCommand('!start');
        expect(mockUIManager.render).toHaveBeenCalledTimes(1);
        handleCommand('!unknown');
        expect(mockUIManager.render).toHaveBeenCalledTimes(2);
    });
});