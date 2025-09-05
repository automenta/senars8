/**
 * Advanced Truth Value Revision Mechanisms
 * Implements sophisticated methods for revising and updating truth values.
 */

/**
 * Revises truth values using Bayesian updating when new evidence is available.
 * @param {object} oldTruthValue - The existing truth value.
 * @param {object} newEvidence - The new evidence truth value.
 * @param {number} weight - Weight for the new evidence (0-1).
 * @returns {object} Revised truth value.
 */
function bayesianRevision(oldTruthValue, newEvidence, weight = 0.5) {
    // Bayesian update: Posterior ∝ Prior × Likelihood
    // For simplicity, we use a weighted average approach

    const revisedFrequency = (1 - weight) * oldTruthValue.frequency + weight * newEvidence.frequency;
    const revisedConfidence = Math.min(1.0, oldTruthValue.confidence + newEvidence.confidence * weight);

    return {
        frequency: revisedFrequency,
        confidence: revisedConfidence
    };
}

/**
 * Revises truth values using consensus-based updating when multiple sources provide evidence.
 * @param {object} currentTruthValue - The current truth value.
 * @param {Array} evidenceSources - Array of evidence truth values from different sources.
 * @returns {object} Revised truth value.
 */
function consensusRevision(currentTruthValue, evidenceSources) {
    if (!evidenceSources || evidenceSources.length === 0) {
        return currentTruthValue;
    }

    // Calculate weighted average based on source confidence
    let totalWeightedFrequency = currentTruthValue.frequency * currentTruthValue.confidence;
    let totalWeight = currentTruthValue.confidence;
    let maxConfidence = currentTruthValue.confidence;

    for (const evidence of evidenceSources) {
        totalWeightedFrequency += evidence.frequency * evidence.confidence;
        totalWeight += evidence.confidence;
        maxConfidence = Math.max(maxConfidence, evidence.confidence);
    }

    const revisedFrequency = totalWeightedFrequency / totalWeight;
    const revisedConfidence = Math.min(1.0, maxConfidence);

    return {
        frequency: revisedFrequency,
        confidence: revisedConfidence
    };
}

/**
 * Revises truth values using temporal decay to reduce confidence over time.
 * @param {object} truthValue - The truth value to decay.
 * @param {number} currentTime - Current timestamp.
 * @param {number} creationTime - Time when the belief was created.
 * @param {number} decayRate - Rate of decay (higher means faster decay).
 * @returns {object} Decayed truth value.
 */
function temporalDecayRevision(truthValue, currentTime, creationTime, decayRate = 0.0001) {
    const age = currentTime - creationTime;
    const decayFactor = Math.exp(-decayRate * age);

    return {
        frequency: truthValue.frequency,
        confidence: truthValue.confidence * decayFactor
    };
}

/**
 * Revises truth values using conflict resolution when contradictory evidence is found.
 * @param {object} truthValue1 - First truth value.
 * @param {object} truthValue2 - Second (contradictory) truth value.
 * @returns {object} Resolved truth value.
 */
function conflictResolutionRevision(truthValue1, truthValue2) {
    // Simple conflict resolution: weighted average based on confidence
    const totalConfidence = truthValue1.confidence + truthValue2.confidence;

    if (totalConfidence === 0) {
        return {frequency: 0.5, confidence: 0.0};
    }

    const weight1 = truthValue1.confidence / totalConfidence;
    const weight2 = truthValue2.confidence / totalConfidence;

    // For conflicting frequencies, we take a weighted average but reduce overall confidence
    const revisedFrequency = weight1 * truthValue1.frequency + weight2 * truthValue2.frequency;
    const confidenceReduction = Math.abs(truthValue1.frequency - truthValue2.frequency);
    const revisedConfidence = Math.max(0.1, (weight1 * truthValue1.confidence + weight2 * truthValue2.confidence) * (1 - confidenceReduction));

    return {
        frequency: revisedFrequency,
        confidence: revisedConfidence
    };
}

/**
 * Revises truth values using reinforcement learning principles.
 * @param {object} truthValue - Current truth value.
 * @param {number} reward - Reward signal (-1 to 1).
 * @param {number} learningRate - Learning rate (0-1).
 * @returns {object} Updated truth value.
 */
function reinforcementRevision(truthValue, reward, learningRate = 0.1) {
    // Adjust frequency based on reward
    const delta = reward * learningRate;
    const revisedFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + delta));

    // Adjust confidence based on consistency of rewards
    const confidenceAdjustment = Math.abs(reward) * learningRate;
    const revisedConfidence = Math.min(1.0, truthValue.confidence + confidenceAdjustment);

    return {
        frequency: revisedFrequency,
        confidence: revisedConfidence
    };
}

/**
 * Revises truth values using entropy-based uncertainty management.
 * @param {object} truthValue - Current truth value.
 * @param {number} newInformation - New information that affects uncertainty.
 * @returns {object} Updated truth value.
 */
function entropyBasedRevision(truthValue, newInformation) {
    // Calculate entropy of current truth value
    const currentEntropy = -(truthValue.frequency * Math.log2(truthValue.frequency || 0.0001) +
        (1 - truthValue.frequency) * Math.log2((1 - truthValue.frequency) || 0.0001));

    // Adjust confidence based on entropy and new information
    const informationGain = Math.abs(newInformation) * 0.1;
    const entropyReduction = informationGain / (1 + currentEntropy);

    const revisedConfidence = Math.min(1.0, truthValue.confidence + entropyReduction);
    // Keep frequency relatively stable but allow small adjustments
    const revisedFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + (newInformation * 0.05)));

    return {
        frequency: revisedFrequency,
        confidence: revisedConfidence
    };
}

/**
 * Performs sophisticated truth value revision based on multiple factors.
 * @param {object} currentTruthValue - Current truth value.
 * @param {object} options - Revision options.
 * @returns {object} Revised truth value.
 */
function sophisticatedRevision(currentTruthValue, options = {}) {
    let revisedTruthValue = {...currentTruthValue};

    // Apply temporal decay if requested
    if (options.applyTemporalDecay && options.currentTime && options.creationTime) {
        revisedTruthValue = temporalDecayRevision(
            revisedTruthValue,
            options.currentTime,
            options.creationTime,
            options.decayRate
        );
    }

    // Apply Bayesian revision if new evidence is provided
    if (options.newEvidence) {
        revisedTruthValue = bayesianRevision(
            revisedTruthValue,
            options.newEvidence,
            options.evidenceWeight
        );
    }

    // Apply consensus revision if multiple evidence sources are provided
    if (options.evidenceSources && options.evidenceSources.length > 0) {
        revisedTruthValue = consensusRevision(revisedTruthValue, options.evidenceSources);
    }

    // Apply conflict resolution if contradictory evidence is provided
    if (options.contradictoryEvidence) {
        revisedTruthValue = conflictResolutionRevision(revisedTruthValue, options.contradictoryEvidence);
    }

    // Apply reinforcement learning update if reward is provided
    if (typeof options.reward !== 'undefined') {
        revisedTruthValue = reinforcementRevision(revisedTruthValue, options.reward, options.learningRate);
    }

    // Apply entropy-based revision if new information is provided
    if (typeof options.newInformation !== 'undefined') {
        revisedTruthValue = entropyBasedRevision(revisedTruthValue, options.newInformation);
    }

    return revisedTruthValue;
}

module.exports = {
    bayesianRevision,
    consensusRevision,
    temporalDecayRevision,
    conflictResolutionRevision,
    reinforcementRevision,
    entropyBasedRevision,
    sophisticatedRevision
};