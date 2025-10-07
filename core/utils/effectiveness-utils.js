/**
 * Standardized effectiveness calculation utilities for consistent metrics across all components
 */

/**
 * Calculate effectiveness based on success rate and execution time
 * Uses logarithmic scaling to prevent execution time from overly penalizing faster strategies
 * @param {number} successRate - Success rate between 0 and 1
 * @param {number} averageTime - Average execution time in milliseconds
 * @param {Object} options - Configuration options
 * @param {number} options.timeWeight - Weight of execution time in effectiveness calculation (default: 1)
 * @param {number} options.successWeight - Weight of success rate in effectiveness calculation (default: 1)
 * @returns {number} Effectiveness score
 */
function calculateEffectiveness(successRate, averageTime, options = {}) {
    const { timeWeight = 1, successWeight = 1 } = options;
    
    if (averageTime <= 0) {
        return successRate * successWeight;
    }
    
    // Logarithmic scaling to prevent execution time from overly penalizing faster strategies
    const timeFactor = Math.log(averageTime + 1);
    return (successRate * successWeight) / (timeFactor * timeWeight);
}

/**
 * Calculate overall strategy effectiveness object
 * @param {Object} stats - Statistics object containing executions, successes, averageTime, etc.
 * @param {Object} options - Configuration options
 * @returns {Object} Effectiveness metrics object
 */
function calculateStrategyEffectiveness(stats, options = {}) {
    const executions = stats.executions || 0;
    const successes = stats.successes || 0;
    const averageTime = stats.averageTime || 0;
    
    const successRate = executions > 0 ? successes / executions : 0;
    const effectiveness = calculateEffectiveness(successRate, averageTime, options);
    
    return {
        successRate,
        effectiveness,
        averageExecutionTime: averageTime,
        totalExecutions: executions,
        totalSuccesses: successes,
        totalFailures: (stats.failures || 0),
        ...(stats.taskTypePerformance && { taskTypePerformance: stats.taskTypePerformance })
    };
}

/**
 * Calculate temporal module effectiveness
 * @param {Object} moduleStats - Module statistics
 * @param {Object} options - Configuration options
 * @returns {Object} Effectiveness metrics for temporal modules
 */
function calculateTemporalModuleEffectiveness(moduleStats, options = {}) {
    const callCount = moduleStats.callCount || 0;
    const totalExecutionTime = moduleStats.totalExecutionTime || 0;
    const totalTasksGenerated = moduleStats.totalTasksGenerated || 0;
    
    const averageExecutionTime = callCount > 0 ? totalExecutionTime / callCount : 0;
    const tasksPerSecond = totalExecutionTime > 0 ? totalTasksGenerated / (totalExecutionTime / 1000) : 0;
    
    // Use execution time effectiveness for temporal modules
    const effectiveness = calculateEffectiveness(
        tasksPerSecond > 0 ? Math.min(1, tasksPerSecond / 100) : 0, // Normalize tasks per second
        averageExecutionTime,
        options
    );
    
    return {
        effectiveness,
        averageExecutionTime,
        tasksPerSecond,
        totalTasksGenerated,
        callCount,
        totalExecutionTime
    };
}

/**
 * Calculate contradiction resolution effectiveness
 * @param {Object} resolutionStats - Resolution statistics
 * @param {Object} options - Configuration options
 * @returns {Object} Effectiveness metrics for contradiction resolution
 */
function calculateContradictionResolutionEffectiveness(resolutionStats, options = {}) {
    const resolved = resolutionStats.resolved || 0;
    const successes = resolutionStats.successes || 0;
    const failures = resolutionStats.failures || 0;
    
    const successRate = resolved > 0 ? successes / resolved : 0;
    // For contradiction resolution, we might weight success rate higher
    const effectiveness = calculateEffectiveness(successRate, resolutionStats.averageTime || 0, {
        timeWeight: options.timeWeight || 0.5,
        successWeight: options.successWeight || 1.5
    });
    
    return {
        effectiveness,
        successRate,
        successPercentage: resolved > 0 ? (successes / resolved * 100).toFixed(2) : '0.00',
        totalResolved: resolved,
        totalSuccesses: successes,
        totalFailures: failures,
        successRateRaw: successRate
    };
}

/**
 * Standardized event tracking wrapper that ensures consistent metrics collection
 * @param {Function} metricsService - Metrics service instance or null
 * @param {string} trackMethod - Name of the tracking method to call
 * @param {Array} params - Parameters to pass to the tracking method
 * @param {Function} defaultAction - Function to execute when metrics service is not available
 */
function trackEvent(metricsService, trackMethod, params, defaultAction = () => {}) {
    if (metricsService && typeof metricsService[trackMethod] === 'function') {
        try {
            return metricsService[trackMethod](...params);
        } catch (error) {
            // Silent failure to not break the main flow
            console.warn(`Metrics tracking failed for ${trackMethod}:`, error.message);
        }
    }
    return defaultAction();
}

/**\n * Calculate resolution effectiveness score based on success and execution time\n * @param {boolean} success - Whether the resolution was successful\n * @param {number} executionTime - Execution time in milliseconds\n * @returns {number} Effectiveness score\n */
function calculateResolutionEffectiveness(success, executionTime) {
    if (!success) return 0;
    
    // Simple effectiveness calculation: higher success with faster execution gets higher score
    // Use logarithmic scaling to prevent execution time from overly penalizing faster strategies
    const timeFactor = executionTime > 0 ? Math.log(executionTime + 1) : 0;
    return success ? (1 / (timeFactor + 1)) : 0;
}

/**\n * Calculate weighted effectiveness considering both historical performance and recent trends\n * @param {object} stats - Strategy statistics\n * @returns {number} Weighted effectiveness score\n */
function calculateWeightedEffectiveness(stats) {
    // Base effectiveness score
    let effectiveness = stats.averageEffectiveness;
    
    // Add weight for recent performance if we have enough history
    if (stats.effectivenessHistory?.length > 0) {
        // Calculate recent effectiveness (average of last entries)
        const recentEffectiveness = stats.effectivenessHistory
            .slice(-3)
            .reduce((sum, val) => sum + val, 0) / 
            Math.min(3, stats.effectivenessHistory.length);
        
        // Weight recent performance more heavily (0.7) than historical (0.3)
        effectiveness = (0.3 * stats.averageEffectiveness) + (0.7 * recentEffectiveness);
    }
    
    // Boost effectiveness if success rate is high
    if (stats.successRate > 0.8) {
        effectiveness *= 1.2; // 20% boost for high success rates
    } else if (stats.successRate > 0.6) {
        effectiveness *= 1.1; // 10% boost for moderate success rates
    }
    
    // Reduce effectiveness if execution time is too high (relative to other strategies)
    if (stats.averageExecutionTime > 100) { // Adjust threshold as needed
        effectiveness *= 0.9; // 10% penalty for slow execution
    } else if (stats.averageExecutionTime < 50) {
        effectiveness *= 1.05; // 5% boost for fast execution
    }
    
    return effectiveness;
}

/**\n * Update effective strategy tracking for a contradiction type\n * @param {Map} effectiveStrategies - Map of effective strategies\n * @param {string} contradictionType - Type of contradiction\n * @param {string} strategy - Strategy used\n * @param {boolean} success - Whether resolution was successful\n * @param {number} effectiveness - Effectiveness score\n * @param {number} executionTime - Execution time in milliseconds\n */
function updateEffectiveStrategy(effectiveStrategies, contradictionType, strategy, success, effectiveness, executionTime) {
    if (!effectiveStrategies.has(contradictionType)) {
        effectiveStrategies.set(contradictionType, new Map());
    }

    const strategyMap = effectiveStrategies.get(contradictionType);
    if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, {
            totalAttempts: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            totalEffectiveness: 0,
            averageEffectiveness: 0,
            averageExecutionTime: 0,
            effectivenessHistory: [], // Store recent effectiveness scores
            successRate: 0
        });
    }

    const stats = strategyMap.get(strategy);
    stats.totalAttempts++;
    
    if (success) {
        stats.totalSuccesses++;
    } else {
        stats.totalFailures++;
    }
    
    stats.totalEffectiveness += effectiveness;
    stats.averageEffectiveness = stats.totalEffectiveness / stats.totalAttempts;
    stats.successRate = stats.totalSuccesses / stats.totalAttempts;
    
    // Track execution time
    stats.averageExecutionTime = ((stats.averageExecutionTime * (stats.totalAttempts - 1)) + executionTime) / stats.totalAttempts;
    
    // Store recent effectiveness for trend analysis (keep last 10 entries)
    stats.effectivenessHistory.push(effectiveness);
    if (stats.effectivenessHistory.length > 10) {
        stats.effectivenessHistory.shift();
    }
}

/**\n * Select the optimal resolution strategy based on effectiveness metrics\n * @param {Map} effectiveStrategies - Map of effective strategies\n * @param {object} contradiction - Contradiction object\n * @param {number} [fallbackStrategy] - Fallback strategy if no effective strategy found\n * @returns {string} Selected strategy name\n */
function selectOptimalResolutionStrategy(effectiveStrategies, contradiction, fallbackStrategy = 'evidence_gathering') {
    // Check if we have effective strategies for this contradiction type
    if (effectiveStrategies.has(contradiction.type)) {
        const strategyMap = effectiveStrategies.get(contradiction.type);
        if (strategyMap.size > 0) {
            // Find the strategy with the highest average effectiveness
            let bestStrategy = null;
            let bestEffectiveness = -1;
            
            for (const [strategy, stats] of strategyMap) {
                // Only consider strategies with at least 3 attempts to avoid bias from limited data
                // Weight strategies based on success rate and recent effectiveness
                const weightedEffectiveness = calculateWeightedEffectiveness(stats);
                
                if (stats.totalAttempts >= 3 && weightedEffectiveness > bestEffectiveness) {
                    bestEffectiveness = weightedEffectiveness;
                    bestStrategy = strategy;
                }
            }
            
            // If we found an effective strategy, use it
            if (bestStrategy) {
                return bestStrategy;
            }
        }
    }
    
    // If no effective strategy is found, use the original logic with severity-based selection
    // But also consider contradiction type as a factor in strategy selection
    if (contradiction.severity > 0.8) {
        return 'revision';
    }
    if (contradiction.severity > 0.6) {
        return 'reconciliation';
    }
    if (contradiction.tasks.some(t => t.state.stamp?.occurrenceTime)) {
        return 'temporal_analysis';
    }
    if (['inheritance_conflict', 'implication_conflict'].includes(contradiction.type)) {
        return 'causal_analysis';
    }
    if (contradiction.type === 'transitive_inheritance_conflict') {
        return 'hierarchical_reconciliation';
    }
    if (contradiction.severity > 0.4) {
        return 'contextual_reconciliation';
    }
    return 'evidence_gathering';
}

/**\n * Get strategy effectiveness statistics for a specific contradiction type\n * @param {Map} effectiveStrategies - Map of effective strategies\n * @param {string} contradictionType - Type of contradiction\n * @returns {object} Effectiveness statistics\n */
function getStrategyEffectivenessStats(effectiveStrategies, contradictionType) {
    if (!effectiveStrategies.has(contradictionType)) {
        return null;
    }
    
    const strategyMap = effectiveStrategies.get(contradictionType);
    const result = {};
    
    for (const [strategy, stats] of strategyMap) {
        result[strategy] = {
            totalAttempts: stats.totalAttempts,
            totalSuccesses: stats.totalSuccesses,
            totalFailures: stats.totalFailures,
            successRate: stats.successRate,
            averageEffectiveness: stats.averageEffectiveness,
            averageExecutionTime: stats.averageExecutionTime
        };
    }
    
    return result;
}

export {
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
};