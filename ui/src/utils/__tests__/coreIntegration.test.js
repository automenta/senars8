import {
    createTaskFromStatement,
    formatCoreDataForUI,
    getAgentStateForUI,
    processNarseseThroughAgent,
    safeUICall,
    validateNarseseStatement
} from '../coreIntegration.js';
import agentIntegrationService from '../../services/agentIntegration.js';

// Mock the agent integration service
jest.mock('../../services/agentIntegration.js', () => ({
    getAgentInfo: jest.fn(),
    processNarsese: jest.fn(),
    initialize: jest.fn(),
}));

// Mock the core modules
jest.mock('../../../core/parser/parse-utils.js', () => ({
    parseTerm: jest.fn(),
}));

jest.mock('../../../core/index.js', () => ({
    Task: jest.fn(),
    Term: jest.fn(),
}));

jest.mock('../../../core/utils/errorHandler.js', () => ({
    createUnifiedErrorHandler: jest.fn(() => jest.fn()),
}));

describe('Core Integration Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('formatCoreDataForUI', () => {
        test('handles null/undefined input', () => {
            expect(formatCoreDataForUI(null)).toBeNull();
            expect(formatCoreDataForUI(undefined)).toBeNull();
        });

        test('processes arrays of data', () => {
            const mockArray = [{term: 'test', punctuation: '.'}, {key: 'term1', type: 'term'}];
            const result = formatCoreDataForUI(mockArray);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
        });

        test('formats Task objects', () => {
            const mockTask = {
                id: 'task1',
                term: {toString: () => 'bird'},
                punctuation: '.',
                priority: 0.8,
                creationTime: Date.now(),
                state: {truthValue: {frequency: 0.9, confidence: 0.7}},
                occurrenceTime: Date.now(),
                termKey: 'bird'
            };

            const result = formatCoreDataForUI(mockTask);

            expect(result.type).toBe('task');
            expect(result.id).toBe('task1');
            expect(result.punctuation).toBe('.');
            expect(result.priority).toBe(0.8);
        });

        test('formats Term objects', () => {
            const mockTerm = {
                key: 'animal',
                type: 'inheritance',
                terms: [],
                toString: () => 'animal'
            };

            const result = formatCoreDataForUI(mockTerm);

            expect(result.type).toBe('term');
            expect(result.key).toBe('animal');
            expect(result.toString).toBe('animal');
        });
    });

    describe('validateNarseseStatement', () => {
        test('validates empty string', () => {
            const result = validateNarseseStatement('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('non-empty string');
        });

        test('validates non-string input', () => {
            const result = validateNarseseStatement(123);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('non-empty string');
        });

        test('validates valid Narsese statement', () => {
            const mockParsed = {key: 'bird', type: 'statement'};
            jest.requireMock('@core/parser/parse-utils.js').parseTerm.mockReturnValue(mockParsed);

            const result = validateNarseseStatement('<bird --> animal>.');
            expect(result.valid).toBe(true);
            expect(result.parsed).toBe(mockParsed);
        });

        test('handles parsing errors', () => {
            jest.requireMock('@core/parser/parse-utils.js').parseTerm.mockImplementation(() => {
                throw new Error('Parse error');
            });

            const result = validateNarseseStatement('invalid');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Parse error');
        });
    });

    describe('createTaskFromStatement', () => {
        test('creates task from valid statement', () => {
            const mockParsed = {key: 'bird'};
            jest.requireMock('@core/parser/parse-utils.js').parseTerm.mockReturnValue(mockParsed);
            const mockTask = {id: 'mock-task', term: mockParsed, punctuation: '.', priority: 0.5};
            jest.requireMock('@core/index.js').Task.mockReturnValue(mockTask);

            const result = createTaskFromStatement('<bird --> animal>.', '.', 0.5);

            expect(jest.requireMock('@core/index.js').Task).toHaveBeenCalledWith(mockParsed, '.', {priority: 0.5});
            expect(result).toBe(mockTask);
        });

        test('throws error for invalid statement', () => {
            jest.requireMock('@core/parser/parse-utils.js').parseTerm.mockReturnValue(null);

            expect(() => createTaskFromStatement('invalid'))
                .toThrow('Invalid statement: Failed to parse statement');
        });
    });

    describe('getAgentStateForUI', () => {
        test('returns agent state from integration service', () => {
            const mockInfo = {
                isInitialized: true,
                isActive: true,
                beliefsCount: 10,
                goalsCount: 5,
                questionsCount: 2,
                timestamp: Date.now()
            };
            agentIntegrationService.getAgentInfo.mockReturnValue(mockInfo);

            const result = getAgentStateForUI();
            expect(result).toEqual(mockInfo);
            expect(agentIntegrationService.getAgentInfo).toHaveBeenCalled();
        });

        test('returns default state when integration service fails', () => {
            agentIntegrationService.getAgentInfo.mockImplementation(() => {
                throw new Error('Service error');
            });

            const result = getAgentStateForUI();
            expect(result.isInitialized).toBe(false);
            expect(result.isActive).toBe(false);
        });
    });

    describe('processNarseseThroughAgent', () => {
        test('processes Narsese through agent', async () => {
            const narsese = '<bird --> animal>.';
            agentIntegrationService.initialize.mockResolvedValue();
            agentIntegrationService.processNarsese.mockResolvedValue(true);

            const result = await processNarseseThroughAgent(narsese);

            expect(agentIntegrationService.initialize).toHaveBeenCalled();
            expect(agentIntegrationService.processNarsese).toHaveBeenCalledWith(narsese);
            expect(result).toBe(true);
        });

        test('rejects empty narsese input', async () => {
            await expect(processNarseseThroughAgent(''))
                .rejects.toThrow('Narsese input is required and must be a non-empty string');
        });

        test('handles agent processing errors', async () => {
            agentIntegrationService.initialize.mockResolvedValue();
            agentIntegrationService.processNarsese.mockRejectedValue(new Error('Processing failed'));

            await expect(processNarseseThroughAgent('<bird --> animal>.'))
                .rejects.toThrow('Processing failed');
        });
    });

    describe('safeUICall', () => {
        test('executes successful operation', async () => {
            const mockOperation = jest.fn().mockResolvedValue('success');

            const result = await safeUICall(mockOperation, 'test operation');

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalled();
        });

        test('handles operation failure', async () => {
            const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

            await expect(safeUICall(mockOperation, 'test operation'))
                .rejects.toThrow('Operation failed: Operation failed');
            expect(mockOperation).toHaveBeenCalled();
        });
    });
});