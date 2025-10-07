import {beforeEach, describe, it} from 'vitest';
import {expect} from 'chai';
import LMTemporalPatternPredictor from '../../core/reasoner/temporal/LMTemporalPatternPredictor.js';
import TemporalCache from '../../core/reasoner/temporal/TemporalCache.js';
import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/parser/narseseParser.js';

describe('LMTemporalPatternPredictor', () => {
    let predictor;
    let mockLM;

    beforeEach(() => {
        mockLM = {
            generate: async (prompt, options) => {
                // Mock LM response with predicted patterns
                return JSON.stringify({
                    "predictedPatterns": [
                        {
                            "patternType": "periodic",
                            "estimatedFrequency": "high",
                            "estimatedConfidence": 0.8,
                            "predictedTask": "some predicted task"
                        }
                    ],
                    "temporalInferences": [
                        {
                            "task1": "task A",
                            "relationship": "before",
                            "task2": "task B"
                        }
                    ]
                });
            }
        };
        predictor = new LMTemporalPatternPredictor(mockLM);
    });

    it('should initialize with LM instance', () => {
        expect(predictor.lm).toBe(mockLM);
        expect(predictor.cache).toBeNull();
    });

    it('should set cache instance', () => {
        const cache = new TemporalCache();
        predictor.setCache(cache);
        expect(predictor.cache).toBe(cache);
    });

    it('should predict temporal patterns', async () => {
        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];

        const result = predictor.predictTemporalPatterns(tasks);

        expect(result).toHaveProperty('predictedPatterns');
        expect(result).toHaveProperty('temporalInferences');
        expect(Array.isArray(result.predictedPatterns)).toBe(true);
        expect(Array.isArray(result.temporalInferences)).toBe(true);
    });

    it('should handle LM unavailability gracefully', async () => {
        // Create predictor without LM
        const predictorWithoutLM = new LMTemporalPatternPredictor(null);

        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];

        const result = predictorWithoutLM.predictTemporalPatterns(tasks);

        expect(result).toEqual([]);
    });

    it('should handle LM error gracefully', async () => {
        const errorLM = {
            generate: async (prompt, options) => {
                throw new Error('LM unavailable');
            }
        };

        const predictorWithErrorLM = new LMTemporalPatternPredictor(errorLM);
        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];

        const result = predictorWithErrorLM.predictTemporalPatterns(tasks);

        expect(result).toEqual([]);
    });
});