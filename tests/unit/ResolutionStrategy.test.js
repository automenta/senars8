import {beforeEach, describe, it} from 'vitest';
import ResolutionStrategy from '../../core/reasoner/strategies/ResolutionStrategy.js';
import {CONTRADICTION_TYPES} from '../../core/reasoner/contradiction-types.js';

// Mock dependencies
class MockTruthValueManager {
    constructor() {
        this.truthValues = new Map();
    }

    updateTruthValue(task, updatedValue) {
        this.truthValues.set(task.id, updatedValue);
    }
}

class MockMetricsService {
    constructor() {
        this.trackedContradictions = [];
    }

    trackContradictionResolution(contradictionType, strategy, success, outcome) {
        this.trackedContradictions.push({
            contradictionType,
            strategy,
            success,
            outcome
        });
    }
}

class MockCommandBus {
    constructor() {
        this.requestedCommands = [];
    }

    async request(command, payload) {
        this.requestedCommands.push({command, payload});
        // Mock explanation response
        if (command === 'lm:explain') {
            return 'Mocked explanation for contradiction resolution';
        }
        return null;
    }
}

describe('ResolutionStrategy', () => {
    let resolutionStrategy;
    let mockTruthValueManager;
    let mockMetricsService;
    let mockCommandBus;

    beforeEach(() => {
        mockTruthValueManager = new MockTruthValueManager();
        mockMetricsService = new MockMetricsService();
        mockCommandBus = new MockCommandBus();

        resolutionStrategy = new ResolutionStrategy(
            mockTruthValueManager,
            mockMetricsService,
            mockCommandBus
        );
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(resolutionStrategy.truthValueManager).toBe(mockTruthValueManager);
            expect(resolutionStrategy.metricsService).toBe(mockMetricsService);
            expect(resolutionStrategy.commandBus).toBe(mockCommandBus);
            expect(resolutionStrategy.effectiveStrategies).toBeInstanceOf(Map);
            expect(resolutionStrategy.outcomeTracking).toBeInstanceOf(Map);
        });

        it('should initialize with null metricsService and commandBus if not provided', () => {
            const strategy = new ResolutionStrategy(mockTruthValueManager);
            expect(strategy.metricsService).toBeNull();
            expect(strategy.commandBus).toBeNull();
        });
    });

    describe('resolve method', () => {
        const mockContradiction = {
            type: CONTRADICTION_TYPES.INHERITANCE_CONFLICT,
            severity: 0.7,
            tasks: [{state: {stamp: {occurrenceTime: Date.now()}}}],
            details: 'Test contradiction details'
        };

        it('should use auto strategy selection when strategy is "auto"', async () => {
            const result = await resolutionStrategy.resolve(mockContradiction, 'auto');
            expect(Array.isArray(result)).toBe(true);
        });

        it('should use provided strategy directly', async () => {
            const result = await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');
            expect(Array.isArray(result)).toBe(true);
        });

        it('should track resolution outcome with metrics service', async () => {
            await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');
            expect(mockMetricsService.trackedContradictions.length).toBe(1);
            const tracked = mockMetricsService.trackedContradictions[0];
            expect(tracked.contradictionType).toBe(mockContradiction.type);
            expect(tracked.strategy).toBe('evidence_gathering');
        });

        it('should generate explanation via command bus', async () => {
            await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');
            const explanationRequest = mockCommandBus.requestedCommands.find(
                cmd => cmd.command === 'lm:explain'
            );
            expect(explanationRequest).toBeDefined();
            expect(explanationRequest.payload.context.contradiction.type).toBe(mockContradiction.type);
            expect(explanationRequest.payload.context.strategy).toBe('evidence_gathering');
        });

        it('should handle executor not found gracefully', async () => {
            const result = await resolutionStrategy.resolve(mockContradiction, 'nonexistent_strategy');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0); // Should return empty array
        });

        it('should handle execution errors gracefully', async () => {
            const errorContradiction = {
                type: 'test_error',
                severity: 0.5,
                tasks: [],
                details: 'Test error contradiction'
            };

            // We'll test error handling by using an invalid strategy that doesn't exist
            const result = await resolutionStrategy.resolve(errorContradiction, 'nonexistent_strategy');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('effectiveness tracking', () => {
        const mockContradiction = {
            type: CONTRADICTION_TYPES.INHERITANCE_CONFLICT,
            severity: 0.7,
            tasks: [{state: {stamp: {occurrenceTime: Date.now()}}}],
            details: 'Test contradiction details'
        };

        it('should track outcomes for contradiction type', async () => {
            await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');

            expect(resolutionStrategy.outcomeTracking.has(mockContradiction.type)).toBe(true);
            const outcomes = resolutionStrategy.outcomeTracking.get(mockContradiction.type);
            expect(outcomes.length).toBe(1);
            expect(outcomes[0].strategy).toBe('evidence_gathering');
            expect(typeof outcomes[0].success).toBe('boolean');
            expect(typeof outcomes[0].executionTime).toBe('number');
        });

        it('should calculate effectiveness scores', async () => {
            await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');

            const outcomes = resolutionStrategy.outcomeTracking.get(mockContradiction.type);
            expect(outcomes[0].effectiveness).toBeGreaterThanOrEqual(0);
        });
    });

    describe('strategy effectiveness', () => {
        const mockContradiction = {
            type: CONTRADICTION_TYPES.DIRECT_NEGATION,
            severity: 0.9,
            tasks: [{state: {stamp: {occurrenceTime: Date.now()}}}],
            details: 'Test contradiction details'
        };

        it('should update effective strategies', async () => {
            await resolutionStrategy.resolve(mockContradiction, 'revision');

            const strategyMap = resolutionStrategy.effectiveStrategies.get(mockContradiction.type);
            expect(strategyMap).toBeDefined();
            expect(strategyMap.has('revision')).toBe(true);

            const stats = strategyMap.get('revision');
            expect(stats.totalAttempts).toBe(1);
            expect(typeof stats.averageEffectiveness).toBe('number');
        });

        it('should calculate weighted effectiveness', () => {
            const stats = {
                averageEffectiveness: 0.8,
                totalAttempts: 5,
                successRate: 0.85,
                averageExecutionTime: 50,
                effectivenessHistory: [0.7, 0.8, 0.9]
            };

            const weighted = resolutionStrategy._calculateWeightedEffectiveness(stats);
            expect(weighted).toBeGreaterThanOrEqual(0);
        });
    });

    describe('strategy selection', () => {
        const mockContradiction = {
            type: CONTRADICTION_TYPES.DIRECT_NEGATION,
            severity: 0.9,
            tasks: [{state: {stamp: {occurrenceTime: Date.now()}}}],
            details: 'Test contradiction details'
        };

        it('should select optimal strategy based on effectiveness when available', async () => {
            // First, add some successful outcomes to make 'revision' effective
            resolutionStrategy.addFeedback(mockContradiction.type, 'revision', true, 100);
            resolutionStrategy.addFeedback(mockContradiction.type, 'revision', true, 120);
            resolutionStrategy.addFeedback(mockContradiction.type, 'revision', true, 80);

            const selectedStrategy = resolutionStrategy._selectOptimalResolutionStrategy(mockContradiction);
            expect(selectedStrategy).toBe('revision');
        });

        it('should use original logic when no effective strategy found', () => {
            const lowSeverityContradiction = {
                type: CONTRADICTION_TYPES.DIRECT_NEGATION,
                severity: 0.3, // Below all the thresholds in original logic
                tasks: []
            };

            const selectedStrategy = resolutionStrategy._selectOptimalResolutionStrategy(lowSeverityContradiction);
            expect(selectedStrategy).toBe('evidence_gathering');
        });

        it('should consider temporal conflicts for temporal_analysis strategy', () => {
            const temporalContradiction = {
                type: CONTRADICTION_TYPES.TEMPORAL_CONFLICT,
                severity: 0.3,
                tasks: [{state: {stamp: {occurrenceTime: Date.now()}}}]
            };

            const selectedStrategy = resolutionStrategy._selectOptimalResolutionStrategy(temporalContradiction);
            expect(selectedStrategy).toBe('temporal_analysis');
        });

        it('should select appropriate strategy for inheritance conflicts', () => {
            const inheritanceContradiction = {
                type: 'inheritance_conflict',
                severity: 0.3,
                tasks: []
            };

            const selectedStrategy = resolutionStrategy._selectOptimalResolutionStrategy(inheritanceContradiction);
            expect(selectedStrategy).toBe('causal_analysis');
        });
    });

    describe('feedback mechanism', () => {
        it('should add feedback to update strategy effectiveness', () => {
            resolutionStrategy.addFeedback('test_type', 'test_strategy', true, 100);

            const strategyMap = resolutionStrategy.effectiveStrategies.get('test_type');
            expect(strategyMap).toBeDefined();
            expect(strategyMap.has('test_strategy')).toBe(true);

            const stats = strategyMap.get('test_strategy');
            expect(stats.totalAttempts).toBe(1);
            expect(stats.totalSuccesses).toBe(1);
            expect(stats.averageExecutionTime).toBe(100);
        });
    });

    describe('metrics and statistics', () => {
        const mockContradiction = {
            type: 'test_type',
            severity: 0.5,
            tasks: [],
            details: 'Test contradiction details'
        };

        beforeEach(async () => {
            await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');
            await resolutionStrategy.resolve(mockContradiction, 'revision');
        });

        it('should provide strategy effectiveness statistics', () => {
            const stats = resolutionStrategy.getStrategyEffectivenessStats('test_type');
            expect(stats).toBeDefined();
            expect(stats['evidence_gathering']).toBeDefined();
            expect(stats['revision']).toBeDefined();
        });

        it('should provide contradiction resolution metrics', () => {
            const metrics = resolutionStrategy.getContradictionResolutionMetrics();
            expect(metrics.totalContradictions).toBe(2);
            expect(metrics.totalSuccesses).toBeGreaterThanOrEqual(0);
            expect(metrics.strategyBreakdown['test_type']).toBeDefined();
        });
    });

    describe('LM explanation integration', () => {
        const mockContradiction = {
            type: CONTRADICTION_TYPES.INHERITANCE_CONFLICT,
            severity: 0.7,
            tasks: [{state: {stamp: {occurrenceTime: Date.now()}}}],
            details: 'Test contradiction details'
        };

        it('should handle cases where commandBus is not available', async () => {
            resolutionStrategy.commandBus = null;
            const result = await resolutionStrategy.resolve(mockContradiction, 'evidence_gathering');
            expect(Array.isArray(result)).toBe(true);
        });

        it('should handle errors when LM explanation service fails', async () => {
            // Mock commandBus to throw an error
            const failingCommandBus = {
                async request() {
                    throw new Error('LM service unavailable');
                }
            };

            const failingStrategy = new ResolutionStrategy(
                mockTruthValueManager,
                mockMetricsService,
                failingCommandBus
            );

            const result = await failingStrategy.resolve(mockContradiction, 'evidence_gathering');
            expect(Array.isArray(result)).toBe(true); // Should still return valid result despite LM failure
        });
    });
});