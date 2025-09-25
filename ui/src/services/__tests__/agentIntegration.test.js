import agentIntegrationService from '../agentIntegration';
import agentService from '../agentService';

// Helper function for tests
const fail = (msg) => {
    throw new Error(msg);
};

// Mock the agent service
jest.mock('../agentService', () => ({
    sendNarsese: jest.fn(),
    getAgentState: jest.fn(),
    sendAgentControl: jest.fn(),
    isAgentRunning: jest.fn(),
    getBeliefsCount: jest.fn(),
    getGoalsCount: jest.fn(),
    getQuestionsCount: jest.fn(),
    getCycleCount: jest.fn(),
    getTasks: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

describe('Agent Integration Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the singleton instance by recreating the service
        agentIntegrationService.isInitialized = false;
        agentIntegrationService.initializationPromise = null;
    });

    describe('Initialization', () => {
        test('initializes successfully', async () => {
            await agentIntegrationService.initialize();
            expect(agentIntegrationService.isInitialized).toBe(true);
        });

        test('prevents duplicate initialization', async () => {
            const init1 = agentIntegrationService.initialize();
            const init2 = agentIntegrationService.initialize();

            await Promise.all([init1, init2]);
            expect(agentIntegrationService.isInitialized).toBe(true);
        });
    });

    describe('Narsese Processing', () => {
        beforeEach(async () => {
            await agentIntegrationService.initialize();
        });

        test('processes valid Narsese statement', async () => {
            const mockNarsese = '<bird --> animal>.';
            agentService.sendNarsese.mockReturnValue(true);

            const result = await agentIntegrationService.processNarsese(mockNarsese);

            expect(agentService.sendNarsese).toHaveBeenCalledWith(mockNarsese);
            expect(result).toBe(true);
        });

        test('rejects empty Narsese input', async () => {
            await expect(agentIntegrationService.processNarsese(''))
                .rejects.toThrow('Narsese input is required and must be a non-empty string');
        });

        test('rejects non-string Narsese input', async () => {
            await expect(agentIntegrationService.processNarsese(123))
                .rejects.toThrow('Narsese input is required and must be a non-empty string');

            await expect(agentIntegrationService.processNarsese(null))
                .rejects.toThrow('Narsese input is required and must be a non-empty string');
        });
    });

    describe('Agent State Management', () => {
        beforeEach(async () => {
            await agentIntegrationService.initialize();
        });

        test('gets agent state', () => {
            const mockState = {isRunning: true, beliefsCount: 5, goalsCount: 2};
            agentService.getAgentState.mockReturnValue(mockState);

            const state = agentIntegrationService.getAgentState();

            expect(agentService.getAgentState).toHaveBeenCalled();
            expect(state).toEqual(mockState);
        });

        test('gets agent info', () => {
            agentService.isAgentRunning.mockReturnValue(true);
            agentService.getBeliefsCount.mockReturnValue(10);
            agentService.getGoalsCount.mockReturnValue(5);
            agentService.getQuestionsCount.mockReturnValue(3);
            agentService.getCycleCount.mockReturnValue(100);

            const info = agentIntegrationService.getAgentInfo();

            expect(info.isInitialized).toBe(true);
            expect(info.isActive).toBe(true);
            expect(info.beliefsCount).toBe(10);
            expect(info.goalsCount).toBe(5);
            expect(info.questionsCount).toBe(3);
            expect(info.cycleCount).toBe(100);
        });
    });

    describe('Agent Commands', () => {
        beforeEach(async () => {
            await agentIntegrationService.initialize();
        });

        test('sends valid start command', async () => {
            agentService.sendAgentControl.mockReturnValue(true);

            const result = await agentIntegrationService.sendAgentCommand('start');

            expect(agentService.sendAgentControl).toHaveBeenCalledWith('start');
            expect(result).toBe(true);
        });

        test('sends valid stop command', async () => {
            agentService.sendAgentControl.mockReturnValue(true);

            const result = await agentIntegrationService.sendAgentCommand('stop');

            expect(agentService.sendAgentControl).toHaveBeenCalledWith('stop');
            expect(result).toBe(true);
        });

        test('sends valid reset command', async () => {
            agentService.sendAgentControl.mockReturnValue(true);

            const result = await agentIntegrationService.sendAgentCommand('reset');

            expect(agentService.sendAgentControl).toHaveBeenCalledWith('reset');
            expect(result).toBe(true);
        });

        test('rejects invalid command', async () => {
            try {
                await agentIntegrationService.sendAgentCommand('invalid');
                fail('Expected error was not thrown');
            } catch (error) {
                expect(error.message).toContain('Invalid command: invalid. Valid commands are: start, stop, reset');
            }
        });

        test('rejects non-string command', async () => {
            try {
                await agentIntegrationService.sendAgentCommand(123);
                fail('Expected error was not thrown');
            } catch (error) {
                expect(error.message).toContain('Command is required and must be a string');
            }
        });
    });

    describe('Task Management', () => {
        beforeEach(async () => {
            await agentIntegrationService.initialize();
        });

        test('gets all tasks', () => {
            const mockTasks = [{id: 'task1', statement: '<bird --> animal>.'}];
            agentService.getTasks.mockReturnValue(mockTasks);

            const tasks = agentIntegrationService.getAllTasks();

            expect(agentService.getTasks).toHaveBeenCalled();
            expect(tasks).toEqual(mockTasks);
        });
    });

    describe('Error Handling', () => {
        test('handles unitialized service', () => {
            agentIntegrationService.isInitialized = false;

            expect(() => agentIntegrationService.getAgentState())
                .toThrow('Agent integration not initialized');

            expect(() => agentIntegrationService.getAgentInfo())
                .toThrow('Agent integration not initialized');
        });
    });
});