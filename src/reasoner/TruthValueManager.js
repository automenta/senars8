import config from '../config.js';
import {handleErrorWithDefault} from '../utils/error-handler.js';
import Task from '../core/Task.js';

/**
 * Truth Value Manager
 * Manages advanced truth value revision and updating mechanisms.
 */
class TruthValueManager {
    constructor() {
        this.revisionHistory = new Map();
        this.conflictSets = new Map();
        this.evidenceSources = new Map();
    }

    // --- Core Inference Operations ---

    /**
     * Deduction operation for truth values
     * @param {object} tv1 - First truth value
     * @param {object} tv2 - Second truth value
     * @returns {object} Resulting truth value
     */
    static deduce(tv1, tv2) {
        const frequency = tv1.frequency * tv2.frequency;
        const confidence = tv1.confidence * tv2.confidence * config.DEFAULT_TRUTH_VALUE.confidence;
        return {frequency, confidence};
    }

    /**
     * Induction operation for truth values
     * @param {object} tv1 - First truth value
     * @param {object} tv2 - Second truth value
     * @returns {object} Resulting truth value
     */
    static induce(tv1, tv2) {
        const frequency = (tv1.frequency + tv2.frequency) / 2;
        const confidence = tv1.confidence * tv2.confidence * 0.5;
        return {frequency, confidence};
    }

    /**
     * Abduction operation for truth values
     * @param {object} tv1 - First truth value
     * @param {object} tv2 - Second truth value
     * @returns {object} Resulting truth value
     */
    static abduce(tv1, tv2) {
        const frequency = (tv1.frequency + tv2.frequency) / 2;
        const confidence = tv1.confidence * tv2.confidence * 0.3;
        return {frequency, confidence};
    }

    /**
     * Analogy operation for truth values
     * @param {object} tv1 - First truth value
     * @param {object} tv2 - Second truth value
     * @param {object} tv3 - Third truth value
     * @returns {object} Resulting truth value
     */
    static analogize(tv1, tv2, tv3) {
        const frequency = (tv1.frequency + tv2.frequency + tv3.frequency) / 3;
        const confidence = tv1.confidence * tv2.confidence * tv3.confidence * 0.4;
        return {frequency, confidence};
    }

    // --- Revision Methods ---

    /**
     * Bayesian revision of truth values
     * @param {object} oldTruthValue - Current truth value
     * @param {object} newEvidence - New evidence truth value
     * @param {number} weight - Weight for new evidence (0-1)
     * @returns {object} Revised truth value
     */
    static bayesianRevision(oldTruthValue, newEvidence, weight = 0.5) {
        const revisedFrequency = (1 - weight) * oldTruthValue.frequency + weight * newEvidence.frequency;
        const revisedConfidence = Math.min(1.0, oldTruthValue.confidence + newEvidence.confidence * weight);
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    /**
     * Consensus revision based on multiple evidence sources
     * @param {object} currentTruthValue - Current truth value
     * @param {Array} evidenceSources - Array of evidence truth values
     * @returns {object} Revised truth value
     */
    static consensusRevision(currentTruthValue, evidenceSources) {
        if (!evidenceSources || evidenceSources.length === 0) {
            return currentTruthValue;
        }

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
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    /**
     * Temporal decay of truth values over time
     * @param {object} truthValue - Truth value to decay
     * @param {number} currentTime - Current timestamp
     * @param {number} creationTime - Creation timestamp
     * @param {number} decayRate - Decay rate parameter
     * @returns {object} Decayed truth value
     */
    static temporalDecayRevision(truthValue, currentTime, creationTime, decayRate = 0.0001) {
        const age = currentTime - creationTime;
        const decayFactor = Math.exp(-decayRate * age);
        return {frequency: truthValue.frequency, confidence: truthValue.confidence * decayFactor};
    }

    /**
     * Conflict resolution between contradictory truth values
     * @param {object} truthValue1 - First truth value
     * @param {object} truthValue2 - Second truth value
     * @returns {object} Resolved truth value
     */
    static conflictResolutionRevision(truthValue1, truthValue2) {
        const totalConfidence = truthValue1.confidence + truthValue2.confidence;
        if (totalConfidence === 0) {
            return {frequency: 0.5, confidence: 0.0};
        }

        const weight1 = truthValue1.confidence / totalConfidence;
        const weight2 = truthValue2.confidence / totalConfidence;

        const revisedFrequency = weight1 * truthValue1.frequency + weight2 * truthValue2.frequency;
        const confidenceReduction = Math.abs(truthValue1.frequency - truthValue2.frequency);
        const revisedConfidence = Math.max(0.1, (weight1 * truthValue1.confidence + weight2 * truthValue2.confidence) * (1 - confidenceReduction));
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    /**
     * Reinforcement learning update for truth values
     * @param {object} truthValue - Current truth value
     * @param {number} reward - Reward value
     * @param {number} learningRate - Learning rate parameter
     * @returns {object} Updated truth value
     */
    static reinforcementRevision(truthValue, reward, learningRate = 0.1) {
        const delta = reward * learningRate;
        const revisedFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + delta));
        const confidenceAdjustment = Math.abs(reward) * learningRate;
        const revisedConfidence = Math.min(1.0, truthValue.confidence + confidenceAdjustment);
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    /**
     * Entropy-based revision of truth values
     * @param {object} truthValue - Current truth value
     * @param {number} newInformation - New information value
     * @returns {object} Revised truth value
     */
    static entropyBasedRevision(truthValue, newInformation) {
        const currentEntropy = -(truthValue.frequency * Math.log2(truthValue.frequency || 0.0001) +
            (1 - truthValue.frequency) * Math.log2((1 - truthValue.frequency) || 0.0001));

        const informationGain = Math.abs(newInformation) * 0.1;
        const entropyReduction = informationGain / (1 + currentEntropy);

        const revisedConfidence = Math.min(1.0, truthValue.confidence + entropyReduction);
        const revisedFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + (newInformation * 0.05)));
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    /**
     * Sophisticated revision combining multiple revision strategies
     * @param {object} currentTruthValue - Current truth value
     * @param {object} options - Revision options
     * @returns {object} Revised truth value
     */
    static sophisticatedRevision(currentTruthValue, options = {}) {
        let revisedTruthValue = {...currentTruthValue};

        // Apply temporal decay if requested
        if (options.applyTemporalDecay && options.currentTime && options.creationTime) {
            revisedTruthValue = this.temporalDecayRevision(
                revisedTruthValue,
                options.currentTime,
                options.creationTime,
                options.decayRate
            );
        }

        // Apply Bayesian revision if new evidence provided
        if (options.newEvidence) {
            revisedTruthValue = this.bayesianRevision(
                revisedTruthValue,
                options.newEvidence,
                options.evidenceWeight
            );
        }

        // Apply consensus revision if multiple evidence sources provided
        if (options.evidenceSources && options.evidenceSources.length > 0) {
            revisedTruthValue = this.consensusRevision(revisedTruthValue, options.evidenceSources);
        }

        // Apply conflict resolution if contradictory evidence provided
        if (options.contradictoryEvidence) {
            revisedTruthValue = this.conflictResolutionRevision(revisedTruthValue, options.contradictoryEvidence);
        }

        // Apply reinforcement update if reward provided
        if (typeof options.reward !== 'undefined') {
            revisedTruthValue = this.reinforcementRevision(revisedTruthValue, options.reward, options.learningRate);
        }

        // Apply entropy-based revision if new information provided
        if (typeof options.newInformation !== 'undefined') {
            revisedTruthValue = this.entropyBasedRevision(revisedTruthValue, options.newInformation);
        }

        return revisedTruthValue;
    }

    // --- Instance Methods for Task Operations ---

    /**
     * Applies Bayesian revision to a task and records the revision
     * @param {Task} task - Task to revise
     * @param {object} newEvidence - New evidence truth value
     * @param {number} weight - Weight for new evidence
     * @returns {object} Revised truth value
     */
    bayesianRevision(task, newEvidence, weight = 0.5) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.bayesianRevision(oldTruthValue, newEvidence, weight);
        task.state.truthValue = revisedTruthValue;

        this._recordRevision(task.id, 'bayesian', oldTruthValue, revisedTruthValue, {
            newEvidence,
            weight
        });

        return revisedTruthValue;
    }

    /**
     * Applies consensus revision to a task and records the revision
     * @param {Task} task - Task to revise
     * @param {Array} evidenceSources - Array of evidence truth values
     * @returns {object} Revised truth value
     */
    consensusRevision(task, evidenceSources) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.consensusRevision(oldTruthValue, evidenceSources);
        task.state.truthValue = revisedTruthValue;

        this._recordRevision(task.id, 'consensus', oldTruthValue, revisedTruthValue, {
            evidenceSources
        });

        return revisedTruthValue;
    }

    /**
     * Applies reinforcement update to a task and records the revision
     * @param {Task} task - Task to revise
     * @param {number} reward - Reward value
     * @param {number} learningRate - Learning rate parameter
     * @returns {object} Revised truth value
     */
    reinforcementUpdate(task, reward, learningRate = 0.1) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.reinforcementRevision(oldTruthValue, reward, learningRate);
        task.state.truthValue = revisedTruthValue;

        this._recordRevision(task.id, 'reinforcement', oldTruthValue, revisedTruthValue, {
            reward,
            learningRate
        });

        return revisedTruthValue;
    }

    /**
     * Applies temporal decay to a task and records the revision
     * @param {Task} task - Task to decay
     * @param {number} currentTime - Current timestamp
     * @param {number} decayRate - Decay rate parameter
     * @returns {object} Decayed truth value
     */
    temporalDecayRevision(task, currentTime, decayRate = 0.0001) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.temporalDecayRevision(
            oldTruthValue,
            currentTime,
            task.state.stamp.creationTime,
            decayRate
        );
        task.state.truthValue = revisedTruthValue;

        this._recordRevision(task.id, 'temporal_decay', oldTruthValue, revisedTruthValue, {
            currentTime,
            decayRate
        });

        return revisedTruthValue;
    }

    /**
     * Resolves conflict between two tasks and records the revision
     * @param {Task} task1 - First task
     * @param {Task} task2 - Second task
     * @returns {object} Resolved truth value
     */
    resolveConflict(task1, task2) {
        const oldTruthValue1 = {...task1.state.truthValue};
        const oldTruthValue2 = {...task2.state.truthValue};

        const resolvedTruthValue = TruthValueManager.conflictResolutionRevision(oldTruthValue1, oldTruthValue2);

        task1.state.truthValue = resolvedTruthValue;
        task2.state.truthValue = resolvedTruthValue;

        this._recordRevision(task1.id, 'conflict_resolution', oldTruthValue1, resolvedTruthValue, {
            conflictingTaskId: task2.id
        });
        this._recordRevision(task2.id, 'conflict_resolution', oldTruthValue2, resolvedTruthValue, {
            conflictingTaskId: task1.id
        });

        const conflictId = `${task1.id}_${task2.id}`;
        this.conflictSets.set(conflictId, {
            tasks: [task1.id, task2.id],
            resolvedTruthValue,
            timestamp: Date.now()
        });

        return resolvedTruthValue;
    }

    /**
     * Applies sophisticated revision to a task and records the revision
     * @param {Task} task - Task to revise
     * @param {object} options - Revision options
     * @returns {object} Revised truth value
     */
    sophisticatedRevision(task, options = {}) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.sophisticatedRevision(oldTruthValue, {
            ...options,
            currentTime: options.currentTime || Date.now(),
            creationTime: options.creationTime || task.state.stamp.creationTime
        });
        task.state.truthValue = revisedTruthValue;

        this._recordRevision(task.id, 'sophisticated', oldTruthValue, revisedTruthValue, options);

        return revisedTruthValue;
    }

    // --- Evidence Management ---

    /**
     * Adds an evidence source for a task
     * @param {string} taskId - Task ID
     * @param {string} sourceId - Source ID
     * @param {object} truthValue - Truth value of the evidence
     */
    addEvidenceSource(taskId, sourceId, truthValue) {
        if (!this.evidenceSources.has(taskId)) {
            this.evidenceSources.set(taskId, new Map());
        }

        this.evidenceSources.get(taskId).set(sourceId, truthValue);
    }

    /**
     * Gets evidence sources for a task
     * @param {string} taskId - Task ID
     * @returns {Map} Map of evidence sources
     */
    getEvidenceSources(taskId) {
        return this.evidenceSources.get(taskId) || new Map();
    }

    // --- Revision History ---

    /**
     * Records a truth value revision
     * @param {string} taskId - Task ID
     * @param {string} revisionType - Type of revision
     * @param {object} oldTruthValue - Old truth value
     * @param {object} newTruthValue - New truth value
     * @param {object} metadata - Additional metadata
     * @private
     */
    _recordRevision(taskId, revisionType, oldTruthValue, newTruthValue, metadata) {
        if (!this.revisionHistory.has(taskId)) {
            this.revisionHistory.set(taskId, []);
        }

        this.revisionHistory.get(taskId).push({
            type: revisionType,
            oldTruthValue,
            newTruthValue,
            metadata,
            timestamp: Date.now()
        });
    }

    /**
     * Gets revision history for a task
     * @param {string} taskId - Task ID
     * @returns {Array} Array of revision records
     */
    getRevisionHistory(taskId) {
        return this.revisionHistory.get(taskId) || [];
    }

    /**
     * Clears all revision history
     */
    clearRevisionHistory() {
        this.revisionHistory.clear();
    }

    // --- Batch Operations ---

    /**
     * Maintains truth values for multiple tasks
     * @param {Array} tasks - Array of tasks
     * @param {object} options - Maintenance options
     * @returns {Array} Results array
     */
    async maintainTruthValues(tasks, options = {}) {
        const currentTime = Date.now();
        const results = [];

        for (const task of tasks) {
            try {
                if (options.applyTemporalDecay !== false) {
                    this.temporalDecayRevision(task, currentTime, options.decayRate);
                }

                const evidenceSources = this.getEvidenceSources(task.id);
                if (evidenceSources.size > 1) {
                    const sources = Array.from(evidenceSources.values());
                    this.consensusRevision(task, sources);
                }

                results.push({
                    taskId: task.id,
                    termKey: task.termKey,
                    success: true
                });
            } catch (error) {
                handleErrorWithDefault(error, `Error maintaining truth value for task ${task.id}`, null);
                results.push({
                    taskId: task.id,
                    termKey: task.termKey,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Resolves conflicts between tasks
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Results array
     */
    async resolveConflicts(tasks) {
        const results = [];
        const beliefTasks = Task.getBeliefTasks(tasks);

        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];

                try {
                    const similarity = this._calculateSemanticSimilarity(task1, task2);

                    if (similarity > 0.8 &&
                        Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.7) {
                        const resolvedTruthValue = this.resolveConflict(task1, task2);

                        results.push({
                            taskIds: [task1.id, task2.id],
                            termKeys: [task1.termKey, task2.termKey],
                            conflictType: 'frequency_contradiction',
                            resolvedTruthValue,
                            success: true
                        });
                    }
                } catch (error) {
                    handleErrorWithDefault(error, `Error resolving conflicts between tasks ${task1.id} and ${task2.id}`, null);
                    results.push({
                        taskIds: [task1.id, task2.id],
                        termKeys: [task1.termKey, task2.termKey],
                        success: false,
                        error: error.message
                    });
                }
            }
        }

        return results;
    }

    // --- Utility Methods ---

    /**
     * Calculates semantic similarity between two tasks
     * @param {Task} task1 - First task
     * @param {Task} task2 - Second task
     * @returns {number} Similarity score (0-1)
     * @private
     */
    _calculateSemanticSimilarity(task1, task2) {
        if (task1.termKey === task2.termKey) {
            return 1.0;
        }

        // More sophisticated similarity calculation
        const terms1 = task1.termKey.split(/[() ,]+/).filter(term => term.length > 0);
        const terms2 = task2.termKey.split(/[() ,]+/).filter(term => term.length > 0);
        
        const commonTerms = terms1.filter(term => terms2.includes(term));
        const maxTerms = Math.max(terms1.length, terms2.length);

        return maxTerms > 0 ? commonTerms.length / maxTerms : 0;
    }
}

export default TruthValueManager;