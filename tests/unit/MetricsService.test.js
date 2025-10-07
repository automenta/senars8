import {beforeEach, describe, expect, it} from 'vitest';
import MetricsService from '../../core/system/MetricsService.js';

describe('MetricsService', () => {
    let metricsService;

    beforeEach(() => {
        metricsService = new MetricsService();
    });

    it('should initialize with default metrics', () => {
        const metrics = metricsService.getMetrics();

        expect(metrics.system).toBeDefined();
        expect(metrics.lm).toBeDefined();
        expect(metrics.reasoning).toBeDefined();
        expect(metrics.temporal).toBeDefined();
        expect(metrics.contradiction).toBeDefined();
    });

    it('should track system metrics correctly', () => {
        metricsService.updateSystemMetrics(10, {terms: 5, shortTermTasks: 3, longTermTasks: 2, totalUsage: 10},
            {beliefs: 4, goals: 3, questions: 2, total: 9});

        const metrics = metricsService.getMetrics();
        expect(metrics.system.cycleCount).toBe(10);
        expect(metrics.system.memoryStats.terms).toBe(5);
        expect(metrics.system.taskStats.beliefs).toBe(4);
    });

    it('should track LM embedding generation metrics', () => {
        // Track successful embedding generation
        metricsService.trackEmbeddingGeneration(true, 100);
        metricsService.trackEmbeddingGeneration(true, 200);
        metricsService.trackEmbeddingGeneration(false, 50); // failed

        const metrics = metricsService.getMetrics();
        expect(metrics.lm.embeddingGeneration.totalGenerated).toBe(2);
        expect(metrics.lm.embeddingGeneration.totalFailed).toBe(1);
        expect(metrics.lm.embeddingGeneration.averageTime).toBe(150); // (100+200)/2
    });

    it('should track LM hypothesis generation metrics', () => {
        metricsService.trackHypothesisGeneration(true, 150);
        metricsService.trackHypothesisGeneration(false, 100);

        const metrics = metricsService.getMetrics();
        expect(metrics.lm.hypothesisGeneration.totalGenerated).toBe(1);
        expect(metrics.lm.hypothesisGeneration.totalFailed).toBe(1);
        expect(metrics.lm.hypothesisGeneration.averageTime).toBe(150);
    });

    it('should track reasoning strategy execution', () => {
        metricsService.trackStrategyExecution('testStrategy', true, 100);
        metricsService.trackStrategyExecution('testStrategy', false, 200);
        metricsService.trackStrategyExecution('anotherStrategy', true, 50);

        const metrics = metricsService.getMetrics();
        expect(metrics.reasoning.strategyBreakdown.testStrategy).toBeDefined();
        expect(metrics.reasoning.strategyBreakdown.testStrategy.executions).toBe(2);
        expect(metrics.reasoning.strategyBreakdown.testStrategy.successes).toBe(1);
        expect(metrics.reasoning.strategyBreakdown.anotherStrategy.executions).toBe(1);
    });

    it('should track contradiction detection', () => {
        metricsService.trackContradictionDetection('direct_negation');
        metricsService.trackContradictionDetection('direct_negation');
        metricsService.trackContradictionDetection('inheritance_conflict');

        const metrics = metricsService.getMetrics();
        expect(metrics.contradiction.detection.totalDetected).toBe(3);
        expect(metrics.contradiction.detection.byType.get('direct_negation')).toBe(2);
        expect(metrics.contradiction.detection.byType.get('inheritance_conflict')).toBe(1);
    });

    it('should track contradiction resolution outcomes', () => {
        metricsService.trackContradictionResolution('direct_negation', 'revision', true, 'success');
        metricsService.trackContradictionResolution('direct_negation', 'revision', false, 'failure');
        metricsService.trackContradictionResolution('inheritance_conflict', 'reconciliation', true, 'success');

        const metrics = metricsService.getMetrics();
        expect(metrics.contradiction.resolution.totalResolved).toBe(3);
        expect(metrics.contradiction.resolution.byType.get('direct_negation').resolved).toBe(2);
        expect(metrics.contradiction.resolution.byType.get('direct_negation').successes).toBe(1);
        expect(metrics.contradiction.resolution.byType.get('inheritance_conflict').resolved).toBe(1);
        expect(metrics.contradiction.resolution.byType.get('inheritance_conflict').successes).toBe(1);
    });

    it('should track temporal caching metrics', () => {
        metricsService.trackTemporalCaching(true);  // hit
        metricsService.trackTemporalCaching(true);  // hit
        metricsService.trackTemporalCaching(false); // miss

        const metrics = metricsService.getMetrics();
        expect(metrics.temporal.caching.hits).toBe(2);
        expect(metrics.temporal.caching.misses).toBe(1);
        expect(metrics.temporal.caching.totalRequests).toBe(3);
        expect(metrics.temporal.caching.effectiveness).toBe(2 / 3);
    });

    it('should update temporal performance stats', () => {
        const mockStats = {
            modules: {testModule: {callCount: 10}},
            totalCalls: 10,
            totalTasksGenerated: 5
        };

        metricsService.updateTemporalPerformanceStats(mockStats);

        const metrics = metricsService.getMetrics();
        expect(metrics.temporal.moduleBreakdown).toEqual(mockStats);
    });

    it('should reset all metrics', () => {
        // Add some metrics
        metricsService.trackEmbeddingGeneration(true, 100);
        metricsService.trackHypothesisGeneration(true, 150);

        metricsService.reset();

        const metrics = metricsService.getMetrics();
        expect(metrics.lm.embeddingGeneration.totalGenerated).toBe(0);
        expect(metrics.lm.hypothesisGeneration.totalGenerated).toBe(0);
    });
});