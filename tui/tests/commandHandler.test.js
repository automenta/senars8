import {commandDefinitions, createCommandHandler} from '../src/services/commandHandler.js';

describe('createCommandHandler', () => {
    let mockStateManager;
    let mockUIManager;
    let mockAgentService;
    let handleCommand;

    beforeEach(() => {
        mockStateManager = {
            addCommandToHistory: jest.fn(),
        };
        mockUIManager = {
            log: jest.fn(),
            render: jest.fn(),
            toggleHelp: jest.fn(),
            clearLog: jest.fn(),
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

    test('should add task on !add command', () => {
        const task = '<test_task>.';
        handleCommand(`!add ${task}`);
        expect(mockAgentService.send).toHaveBeenCalledWith(task);
        expect(mockUIManager.log).toHaveBeenCalledWith(`Added task: ${task}`);
    });

    test('should show usage on !add command without task', () => {
        handleCommand('!add');
        expect(mockAgentService.send).not.toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith(`Usage: ${commandDefinitions['!add'].usage}`);
    });

    test('should send query on !query command', () => {
        const query = '<test_query>?';
        handleCommand(`!query ${query}`);
        expect(mockAgentService.send).toHaveBeenCalledWith(query);
        expect(mockUIManager.log).toHaveBeenCalledWith(`Sent query: ${query}`);
    });

    test('should show usage on !query command without query', () => {
        handleCommand('!query');
        expect(mockAgentService.send).not.toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith(`Usage: ${commandDefinitions['!query'].usage}`);
    });

    test('should call agentService.getStats on !stats command', () => {
        handleCommand('!stats');
        expect(mockAgentService.getStats).toHaveBeenCalled();
    });

    test('should toggle help box on !help command', () => {
        handleCommand('!help');
        expect(mockUIManager.toggleHelp).toHaveBeenCalled();
    });

    test('should call agentService.connect on !connect command', () => {
        const url = 'ws://localhost:1234';
        handleCommand(`!connect ${url}`);
        expect(mockAgentService.connect).toHaveBeenCalledWith(url);
    });

    test('should call agentService.disconnect on !disconnect command', () => {
        handleCommand('!disconnect');
        expect(mockAgentService.disconnect).toHaveBeenCalled();
    });


    test('should clear log box on !clear command', () => {
        handleCommand('!clear');
        expect(mockUIManager.clearLog).toHaveBeenCalled();
    });

    test('should log unknown command', () => {
        const unknownCommand = '!unknown';
        handleCommand(unknownCommand);
        expect(mockUIManager.log).toHaveBeenCalledWith(`Unknown command: ${unknownCommand}`);
    });
});