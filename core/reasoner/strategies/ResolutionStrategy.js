import {resolutionStrategies} from './resolution/index.js';
import {CONTRADICTION_SEVERITY_WEIGHTS} from '../contradiction-types.js';
import {
    calculateWeightedEffectiveness,
    getStrategyEffectivenessStats,
    selectOptimalResolutionStrategy
} from '../../utils/effectiveness-utils.js';
import {generateExplanation, trackOutcome} from '../ContradictionUtils.js';

class ResolutionStrategy {
    constructor(truthValueManager, metricsService = null, commandBus = null) {
        this.truthValueManager = truthValueManager;
        this.metricsService = metricsService;
        this.commandBus = commandBus; // For LM explanation integration via command bus
        this.strategies = resolutionStrategies;
        // Initialize effectiveness tracking by contradiction type
        this.effectiveStrategies = new Map(); // Map of contradiction types to strategy effectiveness
        this.outcomeTracking = new Map(); // Track resolution outcomes by contradiction type
        this.contradictionTypeWeights = CONTRADICTION_SEVERITY_WEIGHTS; // Use existing contradiction weights
    }

    async resolve(contradiction, strategy) {
        const startTime = Date.now();
        const selectedStrategy = strategy === 'auto' ?
            selectOptimalResolutionStrategy(this.effectiveStrategies, contradiction) :
            strategy;
        const executor = this.strategies[selectedStrategy] || this.strategies.monitoring;

        if (!executor) {
            const result = this.strategies.monitoring ? this.strategies.monitoring(contradiction, {}) : [];

            // Track resolution in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type,
                    strategy || 'monitoring',
                    result.length > 0,
                    result.length > 0 ? 'success' : 'failure'
                );
            }

            // Track outcome for effectiveness feedback
            trackOutcome(
                this.outcomeTracking,
                this.effectiveStrategies,
                this.contradictionTypeWeights,
                contradiction.type,
                strategy || 'monitoring',
                result.length > 0
            );

            // Generate explanation if command bus is available
            await generateExplanation(this.commandBus, contradiction, selectedStrategy, result.length > 0, startTime);

            return result;
        }

        const context = {
            truthValueManager: this.truthValueManager
        };

        try {
            const result = executor(contradiction, context);
            const executionTime = Date.now() - startTime;

            // Track resolution in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type,
                    selectedStrategy,
                    result && result.length > 0,
                    result && result.length > 0 ? 'success' : 'failure'
                );
            }

            // Track outcome for effectiveness feedback
            trackOutcome(
                this.outcomeTracking,
                this.effectiveStrategies,
                this.contradictionTypeWeights,
                contradiction.type,
                selectedStrategy,
                result && result.length > 0,
                executionTime
            );

            // Generate explanation if command bus is available
            await generateExplanation(this.commandBus, contradiction, selectedStrategy, result && result.length > 0, executionTime);

            return result;
        } catch (error) {
            // Track failure in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type,
                    selectedStrategy,
                    false,
                    'error'
                );
            }

            // Track outcome for effectiveness feedback
            trackOutcome(
                this.outcomeTracking,
                this.effectiveStrategies,
                this.contradictionTypeWeights,
                contradiction.type,
                selectedStrategy,
                false,
                Date.now() - startTime,
                error.message
            );

            // Generate explanation for failure if command bus is available
            await generateExplanation(this.commandBus, contradiction, selectedStrategy, false, Date.now() - startTime, error);

            // Return an empty array in case of error
            return [];
        }
    }

    /**
     * Get strategy effectiveness statistics for a specific contradiction type
     */
    getStrategyEffectivenessStats(contradictionType) {
        return getStrategyEffectivenessStats(this.effectiveStrategies, contradictionType);
    }

    /**
     * Add feedback to update strategy effectiveness based on external evaluation
     */
    addFeedback(contradictionType, strategy, success, executionTime = 0) {
        trackOutcome(
            this.outcomeTracking,
            this.effectiveStrategies,
            this.contradictionTypeWeights,
            contradictionType,
            strategy,
            success,
            executionTime
        );
    }

    /**
     * Calculate weighted effectiveness considering both historical performance and recent trends
     * @param {object} stats - Strategy statistics
     * @returns {number} Weighted effectiveness score
     */
    _calculateWeightedEffectiveness(stats) {
        return calculateWeightedEffectiveness(stats);
    }

    /**
     * Internal method to select the optimal resolution strategy (for testing purposes)
     * @param {object} contradiction - Contradiction object
     * @returns {string} Selected strategy name
     */
    _selectOptimalResolutionStrategy(contradiction) {
        return selectOptimalResolutionStrategy(this.effectiveStrategies, contradiction);
    }

    /**
     * Get performance metrics for contradiction resolution
     */
    getContradictionResolutionMetrics() {
        const metrics = {
            totalContradictions: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            successRate: 0,
            averageExecutionTime: 0,
            strategyBreakdown: {}
        };

        let totalExecutionTime = 0;
        let totalResolutions = 0;

        for (const [contradictionType, outcomes] of this.outcomeTracking) {
            metrics.strategyBreakdown[contradictionType] = {
                totalResolutions: outcomes.length,
                successes: outcomes.filter(o => o.success).length,
                failures: outcomes.filter(o => !o.success).length
            };

            // Calculate average execution time for this contradiction type
            const executionTimes = outcomes.map(o => o.executionTime);
            const avgTime = executionTimes.length > 0 ?
                executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0;

            metrics.strategyBreakdown[contradictionType].averageExecutionTime = avgTime;

            totalExecutionTime += executionTimes.reduce((sum, time) => sum + time, 0);
            totalResolutions += outcomes.length;
        }

        metrics.totalContradictions = totalResolutions;
        metrics.totalSuccesses = Array.from(this.outcomeTracking.values())
            .flat()
            .filter(o => o.success).length;
        metrics.totalFailures = Array.from(this.outcomeTracking.values())
            .flat()
            .filter(o => !o.success).length;
        metrics.successRate = totalResolutions > 0 ? metrics.totalSuccesses / totalResolutions : 0;
        metrics.averageExecutionTime = totalResolutions > 0 ? totalExecutionTime / totalResolutions : 0;

        return metrics;
    }
}

export default ResolutionStrategy;
