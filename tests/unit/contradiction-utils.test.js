import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateSeverity, generateExplanation, trackOutcome } from '../../core/reasoner/ContradictionUtils.js';
import { CONTRADICTION_SEVERITY_WEIGHTS } from '../../core/reasoner/contradiction-types.js';

describe('ContradictionUtils', () => {
    describe('calculateSeverity', () => {
        it('should calculate severity based on contradiction type weights and confidence values', () => {
            const task1 = { state: { truthValue: { confidence: 0.8 } } };
            const task2 = { state: { truthValue: { confidence: 0.6 } } };
            
            // Use an unknown contradiction type to trigger default weight of 0.5
            const contradictionType = { type: 'unknown_type' };
            const result = calculateSeverity(contradictionType, task1, task2);
            
            // Expected: weight * average confidence
            // Default weight for unknown types is 0.5
            const expected = Math.min(1.0, 0.5 * (0.8 + 0.6) / 2);
            expect(result).toBe(expected); // This should be 0.35, not 0.7
        });
        
        it('should handle different contradiction types with specific weights', () => {
            // If there are specific weights, they should be used
            const task1 = { state: { truthValue: { confidence: 0.9 } } };
            const task2 = { state: { truthValue: { confidence: 0.9 } } };
            const contradictionType = { type: 'equivalence_conflict' };
            
            const result = calculateSeverity(contradictionType, task1, task2);
            const typeWeight = CONTRADICTION_SEVERITY_WEIGHTS[contradictionType.type] || 0.5;
            const expected = Math.min(1.0, typeWeight * (0.9 + 0.9) / 2);
            
            expect(result).toBeCloseTo(expected, 10);
        });
    });

    describe('generateExplanation', () => {
        it('should call command bus with correct payload when available', async () => {
            const mockCommandBus = {
                request: vi.fn(() => Promise.resolve())
            };
            
            const contradiction = {
                type: 'test_type',
                severity: 0.8,
                details: 'test details'
            };
            
            await generateExplanation(mockCommandBus, contradiction, 'test_strategy', true, 100);
            
            expect(mockCommandBus.request).toHaveBeenCalledWith(
                'lm:explain',
                expect.objectContaining({
                    termKey: 'contradiction_resolution',
                    context: expect.objectContaining({
                        contradiction: {
                            type: 'test_type',
                            severity: 0.8,
                            details: 'test details'
                        },
                        strategy: 'test_strategy',
                        outcome: 'success',
                        executionTime: 100,
                        error: null
                    })
                })
            );
        });
        
        it('should handle errors gracefully', async () => {
            const mockCommandBus = {
                request: vi.fn(() => Promise.reject(new Error('Test error')))
            };
            
            const contradiction = {
                type: 'test_type',
                severity: 0.8
            };
            
            // Should not throw an error even if command bus request fails
            await expect(
                generateExplanation(mockCommandBus, contradiction, 'test_strategy', true, 100)
            ).resolves.not.toThrow();
        });
        
        it('should do nothing when command bus is not provided', async () => {
            await expect(
                generateExplanation(null, {}, 'test_strategy', true, 100)
            ).resolves.toBeUndefined();
        });
    });

    describe('trackOutcome', () => {
        it('should track contradiction resolution outcomes properly', () => {
            const outcomeTracking = new Map();
            const effectiveStrategies = new Map();
            const contradictionTypeWeights = { test_type: 0.8 };
            
            trackOutcome(
                outcomeTracking, 
                effectiveStrategies, 
                contradictionTypeWeights,
                'test_type', 
                'test_strategy', 
                true, 
                100,
                null
            );
            
            expect(outcomeTracking.has('test_type')).toBe(true);
            const outcomes = outcomeTracking.get('test_type');
            expect(outcomes.length).toBe(1);
            const outcome = outcomes[0];
            expect(outcome.strategy).toBe('test_strategy');
            expect(outcome.success).toBe(true);
            expect(outcome.executionTime).toBe(100);
            expect(outcome.typeWeight).toBe(0.8);
            expect(outcome.effectiveness).toBeGreaterThan(0); // Should be calculated based on success and time
        });
        
        it('should update effective strategies map', () => {
            const outcomeTracking = new Map();
            const effectiveStrategies = new Map();
            const contradictionTypeWeights = { test_type: 0.8 };
            
            trackOutcome(
                outcomeTracking, 
                effectiveStrategies, 
                contradictionTypeWeights,
                'test_type', 
                'test_strategy', 
                true, 
                50,
                null
            );
            
            // Check that the effective strategies map was updated
            expect(effectiveStrategies.has('test_type')).toBe(true);
            const strategyMap = effectiveStrategies.get('test_type');
            expect(strategyMap.has('test_strategy')).toBe(true);
            
            const strategyStats = strategyMap.get('test_strategy');
            expect(strategyStats.totalAttempts).toBe(1);
            expect(strategyStats.totalSuccesses).toBe(1);
        });
    });
});