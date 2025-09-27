import {createCommandHandler} from '../src/services/commandHandler.js';

describe('createCommandHandler', () => {
    let mockStateManager;
    let mockUIManager;
    let mockAgentService;
    let handleCommand;

    beforeEach(() => {
        mockStateManager = {
            addCommandToHistory: vi.fn(),
        };
        mockUIManager = {
            log: vi.fn(),
            render: vi.fn(),
            toggleHelp: vi.fn(),
            clearLog: vi.fn(),
        };
        mockAgentService = {
            startAgent: vi.fn(),
            stopAgent: vi.fn(),
            resetAgent: vi.fn(),
            sendNarsese: vi.fn(),
            getSystemStats: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
        };
        handleCommand = createCommandHandler(mockStateManager, mockUIManager, mockAgentService);
    });

    test('should add command to history', () => {
        handleCommand('!start');
        expect(mockStateManager.addCommandToHistory).toHaveBeenCalledWith('!start');
    });

    test('should call agentService.start on !start command', () => {
        handleCommand('!start');
        expect(mockAgentService.startAgent).toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent !start command.');
    });

    test('should call agentService.stop on !stop command', () => {
        handleCommand('!stop');
        expect(mockAgentService.stopAgent).toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent !stop command.');
    });

    test('should call agentService.reset on !reset command', () => {
        handleCommand('!reset');
        expect(mockAgentService.resetAgent).toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Sent !reset command.');
    });

    test('should add task on !add command', () => {
        const task = '<test_task>.';
        handleCommand(`!add ${task}`);
        expect(mockAgentService.sendNarsese).toHaveBeenCalledWith(task);
        expect(mockUIManager.log).toHaveBeenCalledWith(`Added task: ${task}`);
    });

    test('should show usage on !add command without task', () => {
        handleCommand('!add');
        expect(mockAgentService.sendNarsese).not.toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Invalid task format: Statement must be a non-empty string');
    });

    test('should send query on !query command', () => {
        const query = '<test_query>?';
        handleCommand(`!query ${query}`);
        expect(mockAgentService.sendNarsese).toHaveBeenCalledWith(query);
        expect(mockUIManager.log).toHaveBeenCalledWith(`Sent query: ${query}`);
    });

    test('should show usage on !query command without query', () => {
        handleCommand('!query');
        expect(mockAgentService.sendNarsese).not.toHaveBeenCalled();
        expect(mockUIManager.log).toHaveBeenCalledWith('Invalid query format: Statement must be a non-empty string');
    });

    test('should call agentService.getStats on !stats command', () => {
        handleCommand('!stats');
        expect(mockAgentService.getSystemStats).toHaveBeenCalled();
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