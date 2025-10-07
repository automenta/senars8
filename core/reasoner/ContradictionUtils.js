import {CONTRADICTION_SEVERITY_WEIGHTS} from './contradiction-types.js';
import {SystemCommands} from '../system/SystemCommands.js';
import {debug} from '../utils/logger.js';
import {calculateEffectiveness} from '../utils/effectiveness-utils.js';

/**
 * Calculate contradiction severity based on task truth values and contradiction type
 * @param {string} contradictionType - Type of contradiction
 * @param {object} task1 - First task
 * @param {object} task2 - Second task
 * @returns {number} Severity score between 0 and 1
 */
function calculateSeverity(contradictionType, task1, task2) {
    const c1 = task1.state.truthValue.confidence;
    const c2 = task2.state.truthValue.confidence;
    const typeWeight = CONTRADICTION_SEVERITY_WEIGHTS[contradictionType.type] || 0.5;
    return Math.min(1.0, typeWeight * (c1 + c2) / 2);
}

/**
 * Calculate effectiveness score based on success and execution time
 * @param {boolean} success - Whether the resolution was successful
 * @param {number} executionTime - Execution time in milliseconds
 * @returns {number} Effectiveness score
 */
function calculateResolutionEffectiveness(success, executionTime) {
    if (!success) return 0;
    
    // Simple effectiveness calculation: higher success with faster execution gets higher score
    // Use logarithmic scaling to prevent execution time from overly penalizing faster strategies
    const timeFactor = executionTime > 0 ? Math.log(executionTime + 1) : 0;
    return success ? (1 / (timeFactor + 1)) : 0;
}

/**
 * Calculate weighted effectiveness considering both historical performance and recent trends
 * @param {object} stats - Strategy statistics
 * @returns {number} Weighted effectiveness score
 */
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

/**
 * Generate explanation using LM service for contradiction analysis and resolution rationale
 * @param {object} commandBus - Command bus instance
 * @param {object} contradiction - The contradiction object
 * @param {string} strategy - The strategy used
 * @param {boolean} success - Whether the resolution was successful
 * @param {number} executionTime - Execution time in milliseconds
 * @param {Error} [error] - Error object if resolution failed
 */
async function generateExplanation(commandBus, contradiction, strategy, success, executionTime, error = null) {
    if (!commandBus) return;
    
    try {
        const explanationPayload = {
            termKey: 'contradiction_resolution',
            context: {
                contradiction: {
                    type: contradiction.type,
                    severity: contradiction.severity,
                    details: contradiction.details || 'N/A'
                },
                strategy: strategy,
                outcome: success ? 'success' : 'failure',
                executionTime: executionTime,
                error: error ? error.message : null
            }
        };

        // Call the LM service via command bus to generate rationale for the resolution
        await commandBus.request(SystemCommands.LM_EXPLAIN, explanationPayload);
    } catch (explanationError) {
        // Don't let explanation service errors break resolution process
        debug('Explanation generation failed:', explanationError.message);
    }
}

/**
 * Track resolution outcomes for effectiveness feedback
 * @param {Map} outcomeTracking - Map to store outcome tracking data
 * @param {Map} effectiveStrategies - Map to store effective strategies
 * @param {object} contradictionTypeWeights - Weights for contradiction types
 * @param {string} contradictionType - Type of contradiction
 * @param {string} strategy - Strategy used
 * @param {boolean} success - Whether resolution was successful
 * @param {number} [executionTime=0] - Execution time in milliseconds
 * @param {string} [errorMessage=null] - Error message if any
 */
function trackOutcome(outcomeTracking, effectiveStrategies, contradictionTypeWeights, contradictionType, strategy, success, executionTime = 0, errorMessage = null) {
    if (!outcomeTracking.has(contradictionType)) {
        outcomeTracking.set(contradictionType, []);
    }
    
    // Calculate effectiveness score based on success, execution time, and contradiction type weight
    const baseEffectiveness = calculateResolutionEffectiveness(success, executionTime);
    const typeWeight = contradictionTypeWeights[contradictionType] || 0.5; // Use existing contradiction weight
    const effectiveness = baseEffectiveness * typeWeight;
    
    // Store outcome data
    outcomeTracking.get(contradictionType).push({
        strategy,
        success,
        executionTime,
        effectiveness,
        typeWeight,
        timestamp: Date.now(),
        error: errorMessage
    });

    // Update effective strategies map
    updateEffectiveStrategy(effectiveStrategies, contradictionType, strategy, success, effectiveness, executionTime);
}

/**
 * Update effective strategy tracking for a contradiction type
 * @param {Map} effectiveStrategies - Map of effective strategies
 * @param {string} contradictionType - Type of contradiction
 * @param {string} strategy - Strategy used
 * @param {boolean} success - Whether resolution was successful
 * @param {number} effectiveness - Effectiveness score
 * @param {number} executionTime - Execution time in milliseconds
 */
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

/**
 * Select the optimal resolution strategy based on effectiveness metrics
 * @param {Map} effectiveStrategies - Map of effective strategies
 * @param {object} contradiction - Contradiction object
 * @param {number} [fallbackStrategy] - Fallback strategy if no effective strategy found
 * @returns {string} Selected strategy name
 */
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

/**
 * Get strategy effectiveness statistics for a specific contradiction type
 * @param {Map} effectiveStrategies - Map of effective strategies
 * @param {string} contradictionType - Type of contradiction
 * @returns {object} Effectiveness statistics
 */
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
    calculateSeverity,
    calculateResolutionEffectiveness,
    calculateWeightedEffectiveness,
    generateExplanation,
    trackOutcome,
    updateEffectiveStrategy,
    selectOptimalResolutionStrategy,
    getStrategyEffectivenessStats
};