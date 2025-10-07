import {info, debug, warn} from '../utils/logger.js';
import {
    calculateStrategyEffectiveness,
    calculateTemporalModuleEffectiveness,
    calculateContradictionResolutionEffectiveness
} from '../utils/effectiveness-utils.js';

/**
 * Centralized metrics service for system observability
 */
class MetricsService {
    constructor() {
        this.metrics = new Map();
        this.startTime = Date.now();
        
        // Initialize metric categories
        this.initSystemMetrics();
        this.initLMMetrics();
        this.initReasoningMetrics();
        this.initTemporalMetrics();
        this.initContradictionMetrics();
        
        info('MetricsService initialized');
    }

    initSystemMetrics() {
        this.metrics.set('system', {
            cycleCount: 0,
            startTime: this.startTime,
            uptime: 0,
            memoryStats: {
                terms: 0,
                shortTermTasks: 0,
                longTermTasks: 0,
                totalUsage: 0
            },
            taskStats: {
                beliefs: 0,
                goals: 0,
                questions: 0,
                total: 0
            }
        });
    }

    initLMMetrics() {
        this.metrics.set('lm', {
            embeddingGeneration: {
                totalGenerated: 0,
                totalFailed: 0,
                averageTime: 0,
                totalTime: 0,
                totalTasksProcessed: 0
            },
            hypothesisGeneration: {
                totalGenerated: 0,
                totalFailed: 0,
                averageTime: 0,
                totalTime: 0
            },
            pipelineStats: {
                pipelineCount: 0
            }
        });
    }

    initReasoningMetrics() {
        this.metrics.set('reasoning', {
            strategyStats: new Map(),
            totalExecutions: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            successRate: 0
        });
    }

    initTemporalMetrics() {
        this.metrics.set('temporal', {
            performanceStats: {}, // Will sync with TemporalReasoner stats (object format)
            caching: {
                hits: 0,
                misses: 0,
                totalRequests: 0,
                effectiveness: 0
            }
        });
    }

    initContradictionMetrics() {
        this.metrics.set('contradiction', {
            detection: {
                totalDetected: 0,
                byType: new Map()
            },
            resolution: {
                totalResolved: 0,
                byType: new Map(),
                successRates: new Map(),
                outcomes: new Map()
            }
        });
    }

    /**
     * Update system metrics
     */
    updateSystemMetrics(cycleCount, memoryStats, taskStats) {
        const systemMetrics = this.metrics.get('system');
        systemMetrics.cycleCount = cycleCount;
        systemMetrics.uptime = Date.now() - this.startTime;
        systemMetrics.memoryStats = {...memoryStats};
        systemMetrics.taskStats = {...taskStats};
    }

    /**
     * Track embedding generation metrics
     */
    trackEmbeddingGeneration(success, executionTime) {
        const lmMetrics = this.metrics.get('lm');
        if (success) {
            lmMetrics.embeddingGeneration.totalGenerated++;
            lmMetrics.embeddingGeneration.totalTime += executionTime;
            lmMetrics.embeddingGeneration.averageTime = 
                lmMetrics.embeddingGeneration.totalTime / lmMetrics.embeddingGeneration.totalGenerated;
        } else {
            lmMetrics.embeddingGeneration.totalFailed++;
        }
    }

    /**
     * Track hypothesis generation metrics
     */
    trackHypothesisGeneration(success, executionTime) {
        const lmMetrics = this.metrics.get('lm');
        if (success) {
            lmMetrics.hypothesisGeneration.totalGenerated++;
            lmMetrics.hypothesisGeneration.totalTime += executionTime;
            lmMetrics.hypothesisGeneration.averageTime = 
                lmMetrics.hypothesisGeneration.totalTime / lmMetrics.hypothesisGeneration.totalGenerated;
        } else {
            lmMetrics.hypothesisGeneration.totalFailed++;
        }
    }

    /**
     * Track strategy execution
     */
    trackStrategyExecution(strategyName, success, executionTime) {
        const reasoningMetrics = this.metrics.get('reasoning');
        
        if (!reasoningMetrics.strategyStats.has(strategyName)) {
            reasoningMetrics.strategyStats.set(strategyName, {
                executions: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0
            });
        }

        const stats = reasoningMetrics.strategyStats.get(strategyName);
        stats.executions++;
        stats.totalTime += executionTime;
        stats.averageTime = stats.totalTime / stats.executions;

        if (success) {
            stats.successes++;
            reasoningMetrics.totalSuccesses++;
        } else {
            stats.failures++;
            reasoningMetrics.totalFailures++;
        }

        reasoningMetrics.totalExecutions++;
        reasoningMetrics.successRate = reasoningMetrics.totalSuccesses / 
            (reasoningMetrics.totalExecutions || 1);
    }

    /**
     * Track contradiction detection
     */
    trackContradictionDetection(contradictionType) {
        const contradictionMetrics = this.metrics.get('contradiction');
        contradictionMetrics.detection.totalDetected++;
        
        const count = contradictionMetrics.detection.byType.get(contradictionType) || 0;
        contradictionMetrics.detection.byType.set(contradictionType, count + 1);
    }

    /**
     * Track contradiction resolution outcome
     */
    trackContradictionResolution(contradictionType, strategy, success, outcome) {
        const contradictionMetrics = this.metrics.get('contradiction');
        contradictionMetrics.resolution.totalResolved++;
        
        // Track by contradiction type
        if (!contradictionMetrics.resolution.byType.has(contradictionType)) {
            contradictionMetrics.resolution.byType.set(contradictionType, {
                resolved: 0,
                successes: 0,
                failures: 0,
                successRate: 0
            });
        }
        
        const typeStats = contradictionMetrics.resolution.byType.get(contradictionType);
        typeStats.resolved++;
        if (success) {
            typeStats.successes++;
        } else {
            typeStats.failures++;
        }
        typeStats.successRate = typeStats.successes / typeStats.resolved;

        // Track success rates by strategy
        const strategySuccessRate = contradictionMetrics.resolution.successRates.get(strategy) || {successes: 0, total: 0};
        strategySuccessRate.total++;
        if (success) {
            strategySuccessRate.successes++;
        }
        contradictionMetrics.resolution.successRates.set(strategy, strategySuccessRate);

        // Track specific outcomes
        if (!contradictionMetrics.resolution.outcomes.has(outcome)) {
            contradictionMetrics.resolution.outcomes.set(outcome, 0);
        }
        contradictionMetrics.resolution.outcomes.set(outcome, 
            contradictionMetrics.resolution.outcomes.get(outcome) + 1);
    }

    /**
     * Update temporal reasoning performance stats
     */
    updateTemporalPerformanceStats(stats) {
        const temporalMetrics = this.metrics.get('temporal');
        // Sync with TemporalReasoner performance stats - stats is an object, not a Map
        temporalMetrics.performanceStats = stats;
    }

    /**
     * Track temporal caching effectiveness
     */
    trackTemporalCaching(hit) {
        const temporalMetrics = this.metrics.get('temporal');
        if (hit) {
            temporalMetrics.caching.hits++;
        } else {
            temporalMetrics.caching.misses++;
        }
        temporalMetrics.caching.totalRequests++;
        temporalMetrics.caching.effectiveness = temporalMetrics.caching.hits / 
            (temporalMetrics.caching.totalRequests || 1);
    }

    /**
     * Get unified metrics dashboard
     */
    getMetrics() {
        const systemMetrics = this.metrics.get('system');
        const lmMetrics = this.metrics.get('lm');
        const reasoningMetrics = this.metrics.get('reasoning');
        const temporalMetrics = this.metrics.get('temporal');
        const contradictionMetrics = this.metrics.get('contradiction');

        return {
            system: {
                ...systemMetrics,
                uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
            },
            lm: {
                ...lmMetrics,
                embeddingRate: lmMetrics.embeddingGeneration.totalTime > 0 ? 
                    lmMetrics.embeddingGeneration.totalGenerated / (lmMetrics.embeddingGeneration.totalTime / 1000) : 0,
                hypothesisSuccessRate: lmMetrics.hypothesisGeneration.totalGenerated > 0 ?
                    (lmMetrics.hypothesisGeneration.totalGenerated - lmMetrics.hypothesisGeneration.totalFailed) /
                    lmMetrics.hypothesisGeneration.totalGenerated : 0
            },
            reasoning: {
                ...reasoningMetrics,
                strategyBreakdown: Object.fromEntries(reasoningMetrics.strategyStats),
                strategyEffectiveness: this._calculateStrategyEffectiveness()
            },
            temporal: {
                ...temporalMetrics,
                moduleBreakdown: temporalMetrics.performanceStats
            },
            contradiction: {
                ...contradictionMetrics,
                resolutionSuccessRate: contradictionMetrics.resolution.totalResolved > 0 ?
                    contradictionMetrics.resolution.totalResolved / 
                    (contradictionMetrics.resolution.totalResolved + contradictionMetrics.detection.totalDetected) : 0
            },
            summary: {
                totalMetricsCollected: this.getTotalMetricsCount()
            }
        };
    }

    _calculateStrategyEffectiveness() {
        const reasoningMetrics = this.metrics.get('reasoning');
        const effectiveness = {};
        for (const [name, stats] of reasoningMetrics.strategyStats) {
            effectiveness[name] = calculateStrategyEffectiveness(stats);
        }
        return effectiveness;
    }

    getTotalMetricsCount() {
        let count = 0;
        for (const [category, data] of this.metrics) {
            if (typeof data === 'object' && data !== null) {
                count += Object.keys(data).filter(key => 
                    typeof data[key] !== 'object' && typeof data[key] !== 'function'
                ).length;
            }
        }
        return count;
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.clear();
        this.startTime = Date.now();
        this.initSystemMetrics();
        this.initLMMetrics();
        this.initReasoningMetrics();
        this.initTemporalMetrics();
        this.initContradictionMetrics();
        info('MetricsService reset');
    }
}

export default MetricsService;