import {CONTRADICTION_SEVERITY_WEIGHTS} from './contradiction-types.js';
import {SystemCommands} from '../system/SystemCommands.js';
import {debug} from '../utils/logger.js';
import {calculateResolutionEffectiveness, updateEffectiveStrategy} from '../utils/effectiveness-utils.js';

/**\n * Calculate contradiction severity based on task truth values and contradiction type\n * @param {string} contradictionType - Type of contradiction\n * @param {object} task1 - First task\n * @param {object} task2 - Second task\n * @returns {number} Severity score between 0 and 1\n */
function calculateSeverity(contradictionType, task1, task2) {
    const c1 = task1.state.truthValue.confidence;
    const c2 = task2.state.truthValue.confidence;
    const typeWeight = CONTRADICTION_SEVERITY_WEIGHTS[contradictionType.type] || 0.5;
    return Math.min(1.0, typeWeight * (c1 + c2) / 2);
}

/**\n * Generate explanation using LM service for contradiction analysis and resolution rationale\n * @param {object} commandBus - Command bus instance\n * @param {object} contradiction - The contradiction object\n * @param {string} strategy - The strategy used\n * @param {boolean} success - Whether the resolution was successful\n * @param {number} executionTime - Execution time in milliseconds\n * @param {Error} [error] - Error object if resolution failed\n */
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

/**\n * Track resolution outcomes for effectiveness feedback\n * @param {Map} outcomeTracking - Map to store outcome tracking data\n * @param {Map} effectiveStrategies - Map to store effective strategies\n * @param {object} contradictionTypeWeights - Weights for contradiction types\n * @param {string} contradictionType - Type of contradiction\n * @param {string} strategy - Strategy used\n * @param {boolean} success - Whether resolution was successful\n * @param {number} [executionTime=0] - Execution time in milliseconds\n * @param {string} [errorMessage=null] - Error message if any\n */
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

    // Update effective strategies map using the utility function
    updateEffectiveStrategy(effectiveStrategies, contradictionType, strategy, success, effectiveness, executionTime);
}

export {
    calculateSeverity,
    generateExplanation,
    trackOutcome
};