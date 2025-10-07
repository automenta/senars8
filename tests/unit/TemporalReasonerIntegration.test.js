import {beforeEach, describe, it} from 'vitest';
import {expect} from 'chai';
import TemporalReasoner from '../../core/reasoner/TemporalReasoner.js';
import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/parser/narseseParser.js';

describe('TemporalReasoner with Caching', () => {
    let temporalReasoner;
    let mockConfigManager;
    let mockMetricsService;
    let mockLM;

    beforeEach(() => {
        mockConfigManager = {
            get: (key) => {
                if (key === 'temporal') {
                    return {enabled: true};
                }
                return null;
            }
        };

        mockMetricsService = {
            trackTemporalCaching: (hit) => {
            },
            updateTemporalPerformanceStats: (stats) => {
            }
        };

        mockLM = {
            generate: async (prompt, options) => {
                return JSON.stringify({
                    "predictedPatterns": [
                        {
                            "patternType": "periodic",
                            "estimatedFrequency": "high",
                            "estimatedConfidence": 0.8,
                            "predictedTask": "some predicted task"
                        }
                    ],
                    "temporalInferences": []
                });
            }
        };

        temporalReasoner = new TemporalReasoner(mockConfigManager, mockMetricsService, mockLM);
    });

    it('should initialize with cache and LM predictor', () => {
        expect(temporalReasoner.cache).toBeDefined();
        expect(temporalReasoner.lmPredictor).toBeDefined();
        expect(temporalReasoner.getCache()).toBeDefined();
    });

    it('should have cache statistics', () => {
        const stats = temporalReasoner.getCacheStats();
        expect(stats).toBeDefined();
        expect(stats).toHaveProperty('hitRate');
        expect(stats).toHaveProperty('effectiveness');
    });

    it('should clear cache', () => {
        const initialStats = temporalReasoner.getCacheStats();
        temporalReasoner.clearCache();
        const finalStats = temporalReasoner.getCacheStats();

        // Cache should be cleared, though hit/miss counts might be preserved
        expect(finalStats.size).toBe(0);
    });

    it('should perform temporal inference with caching', async () => {
        const tasks = [
            new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9},
                {occurrenceTime: Date.now() - 1000}),
            new Task(parseTerm('B'), '.', {frequency: 0.8, confidence: 0.85},
                {occurrenceTime: Date.now()})
        ];

        // Perform inference
        const results = await temporalReasoner.infer(tasks, {useLMEnhancement: false});

        // Should return an array (might be empty depending on implementation)
        expect(Array.isArray(results)).toBe(true);
    });

    it('should detect temporal patterns with caching', () => {
        const tasks = [
            new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9},
                {occurrenceTime: Date.now() - 1000})
        ];

        const results = temporalReasoner.detectTemporalPatterns(tasks);

        expect(Array.isArray(results)).toBe(true);
    });

    it('should predict future tasks with caching', () => {
        const tasks = [
            new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9},
                {occurrenceTime: Date.now() - 1000})
        ];

        const results = temporalReasoner.predictFutureTasks(tasks);

        expect(Array.isArray(results)).toBe(true);
    });
});