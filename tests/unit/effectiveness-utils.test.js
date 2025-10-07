import { describe, it, expect } from 'vitest';
import {
    calculateEffectiveness,
    calculateResolutionEffectiveness,
    calculateWeightedEffectiveness,
    calculateStrategyEffectiveness,
    calculateTemporalModuleEffectiveness,
    calculateContradictionResolutionEffectiveness,
    updateEffectiveStrategy,
    selectOptimalResolutionStrategy,
    getStrategyEffectivenessStats,
    trackEvent
} from '../../core/utils/effectiveness-utils.js';

describe('Effectiveness Utilities', () => {
    describe('calculateEffectiveness', () => {
        it('should calculate effectiveness based on success rate and execution time', () => {
            // High success rate, low time should be high effectiveness
            const result1 = calculateEffectiveness(0.9, 10);
            expect(result1).toBeGreaterThan(0);
            
            // Low success rate should be low effectiveness regardless of time
            const result2 = calculateEffectiveness(0.1, 10);
            expect(result2).toBeLessThan(result1);
            
            // With same success rate, faster execution time should have higher effectiveness
            const result3 = calculateEffectiveness(0.8, 100);
            const result4 = calculateEffectiveness(0.8, 50);
            expect(result4).toBeGreaterThan(result3);
        });
        
        it('should handle edge cases', () => {
            // Zero execution time
            const result = calculateEffectiveness(0.9, 0);
            expect(result).toBe(0.9);
            
            // Zero success rate
            const result2 = calculateEffectiveness(0, 100);
            expect(result2).toBe(0);
        });
    });

    describe('calculateResolutionEffectiveness', () => {
        it('should return 0 for unsuccessful resolution', () => {
            const result = calculateResolutionEffectiveness(false, 100);
            expect(result).toBe(0);
        });
        
        it('should return effectiveness score for successful resolution', () => {
            const result = calculateResolutionEffectiveness(true, 50);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(1); // Should be normalized
            
            // Faster execution should have higher effectiveness for successful resolutions
            const result1 = calculateResolutionEffectiveness(true, 10);
            const result2 = calculateResolutionEffectiveness(true, 100);
            expect(result1).toBeGreaterThan(result2);
        });
    });

    describe('calculateStrategyEffectiveness', () => {
        it('should calculate comprehensive strategy effectiveness', () => {
            const stats = {
                executions: 10,
                successes: 8,
                averageTime: 50
            };
            
            const result = calculateStrategyEffectiveness(stats);
            expect(result.successRate).toBe(0.8);
            expect(result.effectiveness).toBeGreaterThan(0);
            expect(result.averageExecutionTime).toBe(50);
            expect(result.totalExecutions).toBe(10);
            expect(result.totalSuccesses).toBe(8);
        });
    });

    describe('calculateTemporalModuleEffectiveness', () => {
        it('should calculate temporal module effectiveness', () => {
            const moduleStats = {
                callCount: 5,
                totalExecutionTime: 500,
                totalTasksGenerated: 20
            };
            
            const result = calculateTemporalModuleEffectiveness(moduleStats);
            expect(result.averageExecutionTime).toBe(100); // 500/5
            expect(result.tasksPerSecond).toBe(40); // 20 tasks in 500ms, or 40/sec
            expect(result.effectiveness).toBeGreaterThanOrEqual(0);
        });
    });

    describe('calculateContradictionResolutionEffectiveness', () => {
        it('should calculate contradiction resolution effectiveness', () => {
            const resolutionStats = {
                resolved: 10,
                successes: 8,
                failures: 2,
                averageTime: 100
            };
            
            const result = calculateContradictionResolutionEffectiveness(resolutionStats);
            expect(result.successRate).toBe(0.8);
            expect(result.successPercentage).toBe('80.00');
            expect(result.effectiveness).toBeGreaterThan(0);
            expect(result.totalResolved).toBe(10);
        });
    });

    describe('updateEffectiveStrategy', () => {
        it('should update strategy effectiveness in the map', () => {
            const effectiveStrategies = new Map();
            const contradictionType = 'test_type';
            
            // First update
            updateEffectiveStrategy(effectiveStrategies, contradictionType, 'test_strategy', 
                true, 0.9, 50);
                
            expect(effectiveStrategies.has(contradictionType)).toBe(true);
            const strategyMap = effectiveStrategies.get(contradictionType);
            expect(strategyMap.has('test_strategy')).toBe(true);
            
            const stats = strategyMap.get('test_strategy');
            expect(stats.totalAttempts).toBe(1);
            expect(stats.totalSuccesses).toBe(1);
            expect(stats.averageEffectiveness).toBe(0.9);
            expect(stats.averageExecutionTime).toBe(50);
        });
    });

    describe('selectOptimalResolutionStrategy', () => {
        it('should select the optimal strategy based on effectiveness', () => {
            const effectiveStrategies = new Map();
            const contradiction = { type: 'test_type', severity: 0.7 };
            
            // Add some test data
            effectiveStrategies.set('test_type', new Map());
            const strategyMap = effectiveStrategies.get('test_type');
            
            // Add two strategies with different effectivenesses
            strategyMap.set('strategy_a', {
                totalAttempts: 5,
                totalSuccesses: 4,
                averageEffectiveness: 0.8,
                averageExecutionTime: 50,
                effectivenessHistory: [0.8, 0.8, 0.8, 0.8, 0.8],
                successRate: 0.8
            });
            
            strategyMap.set('strategy_b', {
                totalAttempts: 5,
                totalSuccesses: 2,
                averageEffectiveness: 0.4,
                averageExecutionTime: 100,
                effectivenessHistory: [0.4, 0.4, 0.4, 0.4, 0.4],
                successRate: 0.4
            });
            
            const result = selectOptimalResolutionStrategy(effectiveStrategies, contradiction);
            expect(result).toBe('strategy_a'); // Should pick the better performing strategy
        });
        
        it('should fall back to default logic when no effective strategy found', () => {
            const effectiveStrategies = new Map();
            const contradiction = { type: 'test_type', severity: 0.9 }; // High severity
            
            const result = selectOptimalResolutionStrategy(effectiveStrategies, contradiction);
            expect(result).toBe('revision'); // High severity should default to revision
        });
    });

    describe('getStrategyEffectivenessStats', () => {
        it('should return effectiveness stats for a contradiction type', () => {
            const effectiveStrategies = new Map();
            const contradictionType = 'test_type';
            
            effectiveStrategies.set(contradictionType, new Map());
            const strategyMap = effectiveStrategies.get(contradictionType);
            
            strategyMap.set('test_strategy', {
                totalAttempts: 10,
                totalSuccesses: 7,
                totalFailures: 3,
                averageEffectiveness: 0.7,
                averageExecutionTime: 100,
                successRate: 0.7
            });
            
            const result = getStrategyEffectivenessStats(effectiveStrategies, contradictionType);
            expect(result).toHaveProperty('test_strategy');
            expect(result.test_strategy.totalAttempts).toBe(10);
            expect(result.test_strategy.successRate).toBe(0.7);
            expect(result.test_strategy.averageEffectiveness).toBe(0.7);
        });
    });

    describe('trackEvent', () => {
        it('should track event when metrics service is available', () => {
            const mockMetricsService = {
                testMethod: vi.fn(() => 'result')
            };
            
            const result = trackEvent(mockMetricsService, 'testMethod', ['param1', 'param2']);
            
            expect(mockMetricsService.testMethod).toHaveBeenCalledWith('param1', 'param2');
            expect(result).toBe('result');
        });
        
        it('should execute default action when metrics service is not available', () => {
            const defaultAction = vi.fn(() => 'default_result');
            const result = trackEvent(null, 'testMethod', ['param1'], defaultAction);
            
            expect(defaultAction).toHaveBeenCalled();
            expect(result).toBe('default_result');
        });
    });
});