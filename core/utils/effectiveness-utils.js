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
            metricsService[trackMethod](...params);
        } catch (error) {
            // Silent failure to not break the main flow
            console.warn(`Metrics tracking failed for ${trackMethod}:`, error.message);
        }
    }
    return defaultAction();
}

export {
    calculateEffectiveness,
    calculateStrategyEffectiveness,
    calculateTemporalModuleEffectiveness,
    calculateContradictionResolutionEffectiveness,
    trackEvent
};