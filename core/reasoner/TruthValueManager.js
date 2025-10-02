/**
 * High-quality TruthValueManager for managing truth value calculations and revisions
 * This refactored version improves maintainability, performance, and extensibility
 */

import config from '../config/index.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {getBeliefTasks} from '../utils/task-utils.js';
import {error as logError} from '../utils/logger.js';

const errorHandler = createUnifiedErrorHandler('TruthValueManager');

class TruthValueManager {
    constructor() {
        // Map to store revision history for each task (taskId -> array of revisions)
        this.revisionHistory = new Map();

        // Map to store conflict resolution sets (conflictKey -> conflict data)
        this.conflictSets = new Map();

        // Map to store evidence sources for each task (taskId -> Map of sourceId -> truthValue)
        this.evidenceSources = new Map();

        // Default configuration values
        this.defaultConfig = {
            ...config.DEFAULT_TRUTH_VALUE,
            decayRate: 0.0001,
            learningRate: 0.1,
            evidenceWeight: 0.5,
            conflictResolutionThreshold: 0.7
        };
    }

    // ========================================================================
    // Static Methods - Pure functions for truth value calculations
    // ========================================================================

    /**
     * Performs deductive inference: P(A) = P(B) * P(A|B)
     * @param {object} tv1 - First truth value {frequency, confidence}
     * @param {object} tv2 - Second truth value {frequency, confidence}
     * @param {object} [options] - Additional options for the calculation
     * @returns {object} New truth value after deduction
     */
    static deduce(tv1, tv2, options = {}) {
        const {baseConfidence = config.DEFAULT_TRUTH_VALUE.confidence} = options;

        return {
            frequency: tv1.frequency * tv2.frequency,
            confidence: Math.min(1.0, tv1.confidence * tv2.confidence * baseConfidence),
        };
    }

    /**
     * Performs inductive inference: P(A) = (P(B) + P(A))/2 with reduced confidence
     * @param {object} tv1 - First truth value {frequency, confidence}
     * @param {object} tv2 - Second truth value {frequency, confidence}
     * @param {object} [options] - Additional options for the calculation
     * @returns {object} New truth value after induction
     */
    static induce(tv1, tv2, options = {}) {
        const {confidenceReduction = 0.5} = options;

        return {
            frequency: (tv1.frequency + tv2.frequency) / 2,
            confidence: Math.min(1.0, tv1.confidence * tv2.confidence * confidenceReduction),
        };
    }

    /**
     * Performs abductive inference: P(A) = (P(B) + P(A))/2 with reduced confidence
     * @param {object} tv1 - First truth value {frequency, confidence}
     * @param {object} tv2 - Second truth value {frequency, confidence}
     * @param {object} [options] - Additional options for the calculation
     * @returns {object} New truth value after abduction
     */
    static abduce(tv1, tv2, options = {}) {
        const {confidenceReduction = 0.3} = options;

        return {
            frequency: (tv1.frequency + tv2.frequency) / 2,
            confidence: Math.min(1.0, tv1.confidence * tv2.confidence * confidenceReduction),
        };
    }

    /**
     * Performs analogical inference based on three truth values
     * @param {object} tv1 - First truth value {frequency, confidence}
     * @param {object} tv2 - Second truth value {frequency, confidence}
     * @param {object} tv3 - Third truth value {frequency, confidence}
     * @param {object} [options] - Additional options for the calculation
     * @returns {object} New truth value after analogy
     */
    static analogize(tv1, tv2, tv3, options = {}) {
        const {confidenceReduction = 0.4} = options;

        return {
            frequency: (tv1.frequency + tv2.frequency + tv3.frequency) / 3,
            confidence: Math.min(1.0, tv1.confidence * tv2.confidence * tv3.confidence * confidenceReduction),
        };
    }

    /**
     * Performs Bayesian revision of a truth value with new evidence
     * @param {object} oldTruthValue - Current truth value {frequency, confidence}
     * @param {object} newEvidence - New evidence truth value {frequency, confidence}
     * @param {number} [weight=0.5] - Weight of new evidence vs existing belief
     * @returns {object} Revised truth value
     */
    static bayesianRevision(oldTruthValue, newEvidence, weight = 0.5) {
        if (!oldTruthValue || !newEvidence) {
            throw new Error('Both old and new evidence truth values must be provided');
        }

        // Clamp weight to [0, 1] range
        const clampedWeight = Math.max(0, Math.min(1, weight));

        // Weighted average of frequencies
        const revisedFrequency = (1 - clampedWeight) * oldTruthValue.frequency + clampedWeight * newEvidence.frequency;

        // Combined confidence (clamped to maximum 1.0)
        const revisedConfidence = Math.min(1.0, oldTruthValue.confidence + newEvidence.confidence * clampedWeight);

        return {
            frequency: Math.max(0.0, Math.min(1.0, revisedFrequency)),
            confidence: revisedConfidence,
        };
    }

    /**
     * Performs consensus revision when multiple pieces of evidence are available
     * @param {object} currentTruthValue - Current truth value {frequency, confidence}
     * @param {object[]} evidenceSources - Array of evidence truth values
     * @returns {object} Revised truth value based on consensus
     */
    static consensusRevision(currentTruthValue, evidenceSources) {
        if (!evidenceSources?.length) return currentTruthValue;

        // Initialize with current truth value weighted by its confidence
        let totalWeightedFrequency = currentTruthValue.frequency * currentTruthValue.confidence;
        let totalWeight = currentTruthValue.confidence;
        let maxConfidence = currentTruthValue.confidence;

        // Accumulate weighted values from all evidence sources
        for (const evidence of evidenceSources) {
            if (evidence && typeof evidence.frequency === 'number' && typeof evidence.confidence === 'number') {
                totalWeightedFrequency += evidence.frequency * evidence.confidence;
                totalWeight += evidence.confidence;
                maxConfidence = Math.max(maxConfidence, evidence.confidence);
            }
        }

        // Avoid division by zero
        if (totalWeight === 0) return currentTruthValue;

        return {
            frequency: totalWeightedFrequency / totalWeight,
            confidence: Math.min(1.0, maxConfidence),
        };
    }

    /**
     * Performs temporal decay of a truth value based on its age
     * @param {object} truthValue - Truth value to decay {frequency, confidence}
     * @param {number} currentTime - Current timestamp
     * @param {number} creationTime - Creation timestamp of the truth value
     * @param {number} [decayRate=0.0001] - Rate of decay
     * @returns {object} Truth value after temporal decay
     */
    static temporalDecayRevision(truthValue, currentTime, creationTime, decayRate = 0.0001) {
        if (typeof currentTime !== 'number' || typeof creationTime !== 'number') {
            throw new Error('Current and creation times must be valid numbers');
        }

        const age = currentTime - creationTime;
        const decayFactor = Math.exp(-decayRate * age);

        return {
            frequency: truthValue.frequency, // Frequency doesn't decay
            confidence: Math.max(0.0, truthValue.confidence * decayFactor), // Only confidence decays
        };
    }

    /**
     * Resolves conflicts between two truth values
     * @param {object} truthValue1 - First truth value {frequency, confidence}
     * @param {object} truthValue2 - Second truth value {frequency, confidence}
     * @param {object} [options] - Options for conflict resolution
     * @param {number} [options.threshold=0.7] - Threshold for considering values conflicting
     * @returns {object} Resolved truth value
     */
    static conflictResolutionRevision(truthValue1, truthValue2, options = {}) {
        const {threshold = 0.7} = options;

        // Check if the truth values are significantly different
        const frequencyDifference = Math.abs(truthValue1.frequency - truthValue2.frequency);
        if (frequencyDifference < threshold) {
            // Values are not significantly different, just average them
            const avgFreq = (truthValue1.frequency + truthValue2.frequency) / 2;
            const avgConf = (truthValue1.confidence + truthValue2.confidence) / 2;

            return {
                frequency: avgFreq,
                confidence: avgConf
            };
        }

        // Values conflict significantly, reduce confidence based on difference
        const totalConfidence = truthValue1.confidence + truthValue2.confidence;
        if (totalConfidence === 0) {
            return {
                frequency: 0.5,
                confidence: 0.0
            };
        }

        // Weight based on confidence
        const weight1 = truthValue1.confidence / totalConfidence;
        const weight2 = truthValue2.confidence / totalConfidence;

        const revisedFrequency = weight1 * truthValue1.frequency + weight2 * truthValue2.frequency;
        // Reduce confidence based on disagreement
        const confidenceReduction = frequencyDifference;
        const revisedConfidence = Math.max(0.1, (weight1 * truthValue1.confidence + weight2 * truthValue2.confidence) * (1 - confidenceReduction));

        return {
            frequency: revisedFrequency,
            confidence: revisedConfidence
        };
    }

    /**
     * Performs reinforcement learning-based truth value update
     * @param {object} truthValue - Truth value to update {frequency, confidence}
     * @param {number} reward - Reward signal (-1 to 1)
     * @param {number} [learningRate=0.1] - Learning rate for updates
     * @returns {object} Updated truth value
     */
    static reinforcementRevision(truthValue, reward, learningRate = 0.1) {
        if (typeof reward !== 'number' || reward < -1 || reward > 1) {
            throw new Error('Reward must be a number between -1 and 1');
        }

        const delta = reward * learningRate;
        const newFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + delta));
        const newConfidence = Math.min(1.0, truthValue.confidence + Math.abs(reward) * learningRate);

        return {
            frequency: newFrequency,
            confidence: newConfidence,
        };
    }

    /**
     * Performs entropy-based truth value revision
     * @param {object} truthValue - Truth value to revise {frequency, confidence}
     * @param {number} newInformation - New information value
     * @returns {object} Revised truth value
     */
    static entropyBasedRevision(truthValue, newInformation) {
        if (typeof newInformation !== 'number') {
            throw new Error('New information must be a number');
        }

        // Calculate entropy of the current truth value
        const freq = Math.max(0.0001, Math.min(0.9999, truthValue.frequency)); // Avoid log(0)
        const currentEntropy = -(freq * Math.log2(freq) + (1 - freq) * Math.log2(1 - freq));

        // Adjust frequency based on new information
        const frequencyAdjustment = newInformation * 0.05;
        const newFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + frequencyAdjustment));

        // Increase confidence based on how much the new information reduces uncertainty
        const entropyReduction = Math.min(0.1, Math.abs(newInformation) * 0.1 / (1 + currentEntropy));
        const newConfidence = Math.min(1.0, truthValue.confidence + entropyReduction);

        return {
            frequency: newFrequency,
            confidence: newConfidence,
        };
    }

    /**
     * Performs a sophisticated revision combining multiple effects
     * @param {object} currentTruthValue - Current truth value {frequency, confidence}
     * @param {object} [options] - Options for the revision
     * @param {boolean} [options.applyTemporalDecay] - Whether to apply temporal decay
     * @param {object} [options.newEvidence] - New evidence truth value
     * @param {number} [options.evidenceWeight] - Weight of new evidence
     * @param {object[]} [options.evidenceSources] - Multiple evidence sources
     * @param {object} [options.contradictoryEvidence] - Contradictory evidence
     * @param {number} [options.reward] - Reward signal for reinforcement
     * @param {number} [options.learningRate] - Learning rate
     * @param {number} [options.currentTime] - Current time for decay
     * @param {number} [options.creationTime] - Creation time for decay
     * @param {number} [options.decayRate] - Decay rate
     * @param {number} [options.newInformation] - New information for entropy update
     * @returns {object} Sophisticatedly revised truth value
     */
    static sophisticatedRevision(currentTruthValue, options = {}) {
        let revised = {...currentTruthValue};

        try {
            if (options.applyTemporalDecay && options.currentTime !== undefined && options.creationTime !== undefined) {
                revised = TruthValueManager.temporalDecayRevision(
                    revised,
                    options.currentTime,
                    options.creationTime,
                    options.decayRate || 0.0001
                );
            }

            if (options.newEvidence) {
                revised = TruthValueManager.bayesianRevision(
                    revised,
                    options.newEvidence,
                    options.evidenceWeight || 0.5
                );
            }

            if (options.evidenceSources?.length) {
                revised = TruthValueManager.consensusRevision(revised, options.evidenceSources);
            }

            if (options.contradictoryEvidence) {
                revised = TruthValueManager.conflictResolutionRevision(
                    revised,
                    options.contradictoryEvidence,
                    {threshold: options.conflictThreshold || 0.7}
                );
            }

            if (options.reward !== undefined) {
                revised = TruthValueManager.reinforcementRevision(
                    revised,
                    options.reward,
                    options.learningRate || 0.1
                );
            }

            if (options.newInformation !== undefined) {
                revised = TruthValueManager.entropyBasedRevision(revised, options.newInformation);
            }

            return revised;
        } catch (error) {
            logError('Error in sophisticated revision:', error);
            // Return original if sophisticated revision fails
            return currentTruthValue;
        }
    }

    // ========================================================================
    // Instance Methods - Methods that maintain state and record history
    // ========================================================================

    /**
     * Bayesian revision that also records the change
     * @param {Task} task - Task to revise
     * @param {object} newEvidence - New evidence truth value {frequency, confidence}
     * @param {number} [weight=0.5] - Weight of new evidence
     * @returns {object} Revised truth value
     */
    bayesianRevision(task, newEvidence, weight = 0.5) {
        return this._revisionWrapper(
            task,
            'bayesian',
            (old) => TruthValueManager.bayesianRevision(old, newEvidence, weight),
            {newEvidence, weight}
        );
    }

    /**
     * Consensus revision that also records the change
     * @param {Task} task - Task to revise
     * @param {object[]} evidenceSources - Array of evidence truth values
     * @returns {object} Revised truth value
     */
    consensusRevision(task, evidenceSources) {
        return this._revisionWrapper(
            task,
            'consensus',
            (old) => TruthValueManager.consensusRevision(old, evidenceSources),
            {evidenceSources}
        );
    }

    /**
     * Reinforcement update that also records the change
     * @param {Task} task - Task to update
     * @param {number} reward - Reward signal (-1 to 1)
     * @param {number} [learningRate=0.1] - Learning rate for updates
     * @returns {object} Updated truth value
     */
    reinforcementUpdate(task, reward, learningRate = 0.1) {
        return this._revisionWrapper(
            task,
            'reinforcement',
            (old) => TruthValueManager.reinforcementRevision(old, reward, learningRate),
            {reward, learningRate}
        );
    }

    /**
     * Temporal decay revision that also records the change
     * @param {Task} task - Task to revise
     * @param {number} currentTime - Current timestamp
     * @param {number} [decayRate=0.0001] - Rate of decay
     * @returns {object} Truth value after temporal decay
     */
    temporalDecayRevision(task, currentTime, decayRate = 0.0001) {
        return this._revisionWrapper(
            task,
            'temporal_decay',
            (old) => TruthValueManager.temporalDecayRevision(
                old,
                currentTime,
                task.state.stamp.creationTime,
                decayRate
            ),
            {currentTime, decayRate}
        );
    }

    /**
     * Resolves conflicts between two tasks
     * @param {Task} task1 - First task
     * @param {Task} task2 - Second task
     * @param {object} [options] - Options for conflict resolution
     * @returns {object} Resolved truth value
     */
    resolveConflict(task1, task2, options = {}) {
        const oldTruthValue1 = {...task1.state.truthValue};
        const oldTruthValue2 = {...task2.state.truthValue};

        const resolvedTruthValue = TruthValueManager.conflictResolutionRevision(
            oldTruthValue1,
            oldTruthValue2,
            options
        );

        task1.state.truthValue = resolvedTruthValue;
        task2.state.truthValue = resolvedTruthValue;

        // Record revisions in history
        this._recordRevision(task1.id, 'conflict_resolution', oldTruthValue1, resolvedTruthValue, {
            conflictingTaskId: task2.id
        });
        this._recordRevision(task2.id, 'conflict_resolution', oldTruthValue2, resolvedTruthValue, {
            conflictingTaskId: task1.id
        });

        // Add to conflict sets for tracking
        const conflictKey = `${Math.min(task1.id, task2.id)}_${Math.max(task1.id, task2.id)}`;
        this.conflictSets.set(conflictKey, {
            tasks: [task1.id, task2.id],
            resolvedTruthValue,
            timestamp: Date.now(),
        });

        return resolvedTruthValue;
    }

    /**
     * Sophisticated revision that also records the change
     * @param {Task} task - Task to revise
     * @param {object} [options] - Options for the revision
     * @returns {object} Sophisticatedly revised truth value
     */
    sophisticatedRevision(task, options = {}) {
        return this._revisionWrapper(
            task,
            'sophisticated',
            (old) => TruthValueManager.sophisticatedRevision(old, {
                ...options,
                currentTime: options.currentTime || Date.now(),
                creationTime: options.creationTime || task.state.stamp.creationTime,
            }),
            options
        );
    }

    /**
     * Adds an evidence source for a task
     * @param {string} taskId - ID of the task
     * @param {string} sourceId - ID of the evidence source
     * @param {object} truthValue - Truth value of the evidence {frequency, confidence}
     */
    addEvidenceSource(taskId, sourceId, truthValue) {
        if (!this.evidenceSources.has(taskId)) {
            this.evidenceSources.set(taskId, new Map());
        }
        this.evidenceSources.get(taskId).set(sourceId, truthValue);
    }

    /**
     * Gets all evidence sources for a task
     * @param {string} taskId - ID of the task
     * @returns {Map<string, object>} Map of evidence sources
     */
    getEvidenceSources(taskId) {
        return this.evidenceSources.get(taskId) || new Map();
    }

    /**
     * Records a revision in the history
     * @private
     * @param {string} taskId - ID of the task
     * @param {string} revisionType - Type of revision
     * @param {object} oldTruthValue - Previous truth value
     * @param {object} newTruthValue - New truth value
     * @param {object} metadata - Additional metadata about the revision
     */
    _recordRevision(taskId, revisionType, oldTruthValue, newTruthValue, metadata) {
        if (!this.revisionHistory.has(taskId)) {
            this.revisionHistory.set(taskId, []);
        }

        this.revisionHistory.get(taskId).push({
            type: revisionType,
            oldTruthValue: {...oldTruthValue}, // Create copy to prevent reference issues
            newTruthValue: {...newTruthValue}, // Create copy to prevent reference issues
            metadata,
            timestamp: Date.now(),
        });
    }

    /**
     * Gets the revision history for a task
     * @param {string} taskId - ID of the task
     * @returns {object[]} Array of revision records
     */
    getRevisionHistory(taskId) {
        return this.revisionHistory.get(taskId) || [];
    }

    /**
     * Clears the revision history
     */
    clearRevisionHistory() {
        this.revisionHistory.clear();
    }

    /**
     * Maintains truth values by applying temporal decay and consensus revision
     * @param {Task[]} tasks - Array of tasks to maintain
     * @param {object} [options] - Options for maintenance
     * @param {boolean} [options.applyTemporalDecay=true] - Whether to apply temporal decay
     * @param {number} [options.decayRate] - Decay rate to use
     * @returns {Promise<object[]>} Array of maintenance results
     */
    async maintainTruthValues(tasks, options = {}) {
        const currentTime = Date.now();
        const applyTemporalDecay = options.applyTemporalDecay !== false;
        const decayRate = options.decayRate || this.defaultConfig.decayRate;

        return Promise.all(tasks.map(task =>
            errorHandler.execute(async () => {
                try {
                    if (applyTemporalDecay) {
                        this.temporalDecayRevision(task, currentTime, decayRate);
                    }

                    const evidenceSources = this.getEvidenceSources(task.id);
                    if (evidenceSources.size > 1) {
                        this.consensusRevision(task, [...evidenceSources.values()]);
                    }

                    return {
                        taskId: task.id,
                        success: true,
                        message: 'Truth value maintained successfully'
                    };
                } catch (error) {
                    return {
                        taskId: task.id,
                        success: false,
                        error: error.message
                    };
                }
            }, `maintainTruthValues: ${task.id}`, {
                taskId: task.id,
                success: false,
                error: 'Unknown error during maintenance'
            })
        ));
    }

    /**
     * Resolves conflicts between tasks based on semantic similarity and frequency differences
     * @param {Task[]} tasks - Array of tasks to check for conflicts
     * @param {object} [options] - Options for conflict resolution
     * @param {number} [options.similarityThreshold=0.8] - Threshold for semantic similarity
     * @param {number} [options.frequencyDifferenceThreshold=0.7] - Threshold for frequency difference
     * @returns {Promise<object[]>} Array of conflict resolution results
     */
    async resolveConflicts(tasks, options = {}) {
        const {
            similarityThreshold = 0.8,
            frequencyDifferenceThreshold = 0.7
        } = options;

        const beliefTasks = getBeliefTasks(tasks);
        const results = [];

        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];

                const result = await errorHandler.execute(async () => {
                    const similarity = this._calculateSemanticSimilarity(task1, task2);

                    if (similarity >= similarityThreshold) {
                        const frequencyDiff = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency);

                        if (frequencyDiff >= frequencyDifferenceThreshold) {
                            const resolvedTruthValue = this.resolveConflict(task1, task2, {
                                threshold: frequencyDifferenceThreshold
                            });

                            return {
                                taskIds: [task1.id, task2.id],
                                resolvedTruthValue,
                                similarity,
                                frequencyDifference: frequencyDiff,
                                success: true
                            };
                        }
                    }

                    return null; // No conflict to resolve
                }, `resolveConflicts: ${task1.id}-${task2.id}`);

                if (result) {
                    results.push(result);
                }
            }
        }

        return results;
    }

    /**
     * Calculates semantic similarity between two tasks
     * @private
     * @param {Task} task1 - First task
     * @param {Task} task2 - Second task
     * @returns {number} Similarity score between 0 and 1
     */
    _calculateSemanticSimilarity(task1, task2) {
        if (task1.termKey === task2.termKey) return 1.0;

        // Extract terms from both tasks and normalize them
        const terms1 = new Set(task1.termKey.toLowerCase().split(/[() ,.]+/).filter(Boolean));
        const terms2 = new Set(task2.termKey.toLowerCase().split(/[() ,.]+/).filter(Boolean));

        // Calculate intersection and union
        const intersection = new Set([...terms1].filter(x => terms2.has(x)));
        const union = new Set([...terms1, ...terms2]);

        // Return Jaccard similarity coefficient
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Gets summary statistics about the TruthValueManager
     * @returns {object} Summary statistics
     */
    getStatistics() {
        // Calculate total revisions across all tasks
        let totalRevisions = 0;
        for (const revisions of this.revisionHistory.values()) {
            totalRevisions += revisions.length;
        }

        return {
            revisionHistorySize: this.revisionHistory.size,
            totalRevisions,
            conflictSetsCount: this.conflictSets.size,
            evidenceSourcesCount: this.evidenceSources.size,
            averageRevisionsPerTask: this.revisionHistory.size > 0 ? totalRevisions / this.revisionHistory.size : 0
        };
    }
}

export default TruthValueManager;