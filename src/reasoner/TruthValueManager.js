const {cosineSimilarity} = require('../utils/math');

/**
 * Truth Value Manager
 * Manages advanced truth value revision and updating mechanisms.
 */
class TruthValueManager {
    constructor() {
        this.revisionHistory = new Map(); // Track revision history for each task
        this.conflictSets = new Map(); // Track conflicting beliefs
        this.evidenceSources = new Map(); // Track evidence sources for each belief
    }

    static deduce(tv1, tv2) {
        const frequency = tv1.frequency * tv2.frequency;
        const confidence = tv1.confidence * tv2.confidence * 0.9;
        return {frequency, confidence};
    }

    static induce(tv1, tv2) {
        const frequency = (tv1.frequency + tv2.frequency) / 2;
        const confidence = tv1.confidence * tv2.confidence * 0.5;
        return {frequency, confidence};
    }

    static abduce(tv1, tv2) {
        const frequency = (tv1.frequency + tv2.frequency) / 2;
        const confidence = tv1.confidence * tv2.confidence * 0.3;
        return {frequency, confidence};
    }

    static analogize(tv1, tv2, tv3) {
        const frequency = (tv1.frequency + tv2.frequency + tv3.frequency) / 3;
        const confidence = tv1.confidence * tv2.confidence * tv3.confidence * 0.4;
        return {frequency, confidence};
    }

    static bayesianRevision(oldTruthValue, newEvidence, weight = 0.5) {
        const revisedFrequency = (1 - weight) * oldTruthValue.frequency + weight * newEvidence.frequency;
        const revisedConfidence = Math.min(1.0, oldTruthValue.confidence + newEvidence.confidence * weight);
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

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

    static temporalDecayRevision(truthValue, currentTime, creationTime, decayRate = 0.0001) {
        const age = currentTime - creationTime;
        const decayFactor = Math.exp(-decayRate * age);
        return {frequency: truthValue.frequency, confidence: truthValue.confidence * decayFactor};
    }

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

    static reinforcementRevision(truthValue, reward, learningRate = 0.1) {
        const delta = reward * learningRate;
        const revisedFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + delta));
        const confidenceAdjustment = Math.abs(reward) * learningRate;
        const revisedConfidence = Math.min(1.0, truthValue.confidence + confidenceAdjustment);
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    static entropyBasedRevision(truthValue, newInformation) {
        const currentEntropy = -(truthValue.frequency * Math.log2(truthValue.frequency || 0.0001) +
            (1 - truthValue.frequency) * Math.log2((1 - truthValue.frequency) || 0.0001));

        const informationGain = Math.abs(newInformation) * 0.1;
        const entropyReduction = informationGain / (1 + currentEntropy);

        const revisedConfidence = Math.min(1.0, truthValue.confidence + entropyReduction);
        const revisedFrequency = Math.max(0.0, Math.min(1.0, truthValue.frequency + (newInformation * 0.05)));
        return {frequency: revisedFrequency, confidence: revisedConfidence};
    }

    static sophisticatedRevision(currentTruthValue, options = {}) {
        let revisedTruthValue = {...currentTruthValue};

        if (options.applyTemporalDecay && options.currentTime && options.creationTime) {
            revisedTruthValue = TruthValueManager.temporalDecayRevision(
                revisedTruthValue,
                options.currentTime,
                options.creationTime,
                options.decayRate
            );
        }

        if (options.newEvidence) {
            revisedTruthValue = TruthValueManager.bayesianRevision(
                revisedTruthValue,
                options.newEvidence,
                options.evidenceWeight
            );
        }

        if (options.evidenceSources && options.evidenceSources.length > 0) {
            revisedTruthValue = TruthValueManager.consensusRevision(revisedTruthValue, options.evidenceSources);
        }

        if (options.contradictoryEvidence) {
            revisedTruthValue = TruthValueManager.conflictResolutionRevision(revisedTruthValue, options.contradictoryEvidence);
        }

        if (typeof options.reward !== 'undefined') {
            revisedTruthValue = TruthValueManager.reinforcementRevision(revisedTruthValue, options.reward, options.learningRate);
        }

        if (typeof options.newInformation !== 'undefined') {
            revisedTruthValue = TruthValueManager.entropyBasedRevision(revisedTruthValue, options.newInformation);
        }

        return revisedTruthValue;
    }

    /**
     * Revises a task's truth value using Bayesian updating.
     * @param {Task} task - The task to revise.
     * @param {object} newEvidence - The new evidence truth value.
     * @param {number} weight - Weight for the new evidence (0-1).
     */
    bayesianRevision(task, newEvidence, weight = 0.5) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.bayesianRevision(oldTruthValue, newEvidence, weight);

        // Update the task's truth value
        task.state.truthValue = revisedTruthValue;

        // Record the revision
        this._recordRevision(task.id, 'bayesian', oldTruthValue, revisedTruthValue, {newEvidence, weight});

        return revisedTruthValue;
    }

    /**
     * Revises a task's truth value using consensus-based updating.
     * @param {Task} task - The task to revise.
     * @param {Array} evidenceSources - Array of evidence truth values from different sources.
     */
    consensusRevision(task, evidenceSources) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.consensusRevision(oldTruthValue, evidenceSources);

        // Update the task's truth value
        task.state.truthValue = revisedTruthValue;

        // Record the revision
        this._recordRevision(task.id, 'consensus', oldTruthValue, revisedTruthValue, {evidenceSources});

        return revisedTruthValue;
    }

    /**
     * Revises a task's truth value using temporal decay.
     * @param {Task} task - The task to revise.
     * @param {number} currentTime - Current timestamp.
     * @param {number} decayRate - Rate of decay (higher means faster decay).
     */
    temporalDecayRevision(task, currentTime, decayRate = 0.0001) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.temporalDecayRevision(
            oldTruthValue,
            currentTime,
            task.state.stamp.creationTime,
            decayRate
        );

        // Update the task's truth value
        task.state.truthValue = revisedTruthValue;

        // Record the revision
        this._recordRevision(task.id, 'temporal_decay', oldTruthValue, revisedTruthValue, {
            currentTime,
            decayRate
        });

        return revisedTruthValue;
    }

    /**
     * Resolves conflicting tasks using conflict resolution revision.
     * @param {Task} task1 - First task.
     * @param {Task} task2 - Second (conflicting) task.
     */
    resolveConflict(task1, task2) {
        const oldTruthValue1 = {...task1.state.truthValue};
        const oldTruthValue2 = {...task2.state.truthValue};

        const resolvedTruthValue = TruthValueManager.conflictResolutionRevision(oldTruthValue1, oldTruthValue2);

        // Update both tasks' truth values
        task1.state.truthValue = resolvedTruthValue;
        task2.state.truthValue = resolvedTruthValue;

        // Record the revision
        this._recordRevision(task1.id, 'conflict_resolution', oldTruthValue1, resolvedTruthValue, {
            conflictingTaskId: task2.id
        });
        this._recordRevision(task2.id, 'conflict_resolution', oldTruthValue2, resolvedTruthValue, {
            conflictingTaskId: task1.id
        });

        // Track the conflict set
        const conflictId = `${task1.id}_${task2.id}`;
        this.conflictSets.set(conflictId, {
            tasks: [task1.id, task2.id],
            resolvedTruthValue: resolvedTruthValue,
            timestamp: Date.now()
        });

        return resolvedTruthValue;
    }

    /**
     * Updates a task's truth value using reinforcement learning.
     * @param {Task} task - The task to update.
     * @param {number} reward - Reward signal (-1 to 1).
     * @param {number} learningRate - Learning rate (0-1).
     */
    reinforcementUpdate(task, reward, learningRate = 0.1) {
        const oldTruthValue = {...task.state.truthValue};
        const updatedTruthValue = TruthValueManager.reinforcementRevision(oldTruthValue, reward, learningRate);

        // Update the task's truth value
        task.state.truthValue = updatedTruthValue;

        // Record the update
        this._recordRevision(task.id, 'reinforcement', oldTruthValue, updatedTruthValue, {
            reward,
            learningRate
        });

        return updatedTruthValue;
    }

    /**
     * Updates a task's truth value using entropy-based revision.
     * @param {Task} task - The task to update.
     * @param {number} newInformation - New information that affects uncertainty.
     */
    entropyBasedUpdate(task, newInformation) {
        const oldTruthValue = {...task.state.truthValue};
        const updatedTruthValue = TruthValueManager.entropyBasedRevision(oldTruthValue, newInformation);

        // Update the task's truth value
        task.state.truthValue = updatedTruthValue;

        // Record the update
        this._recordRevision(task.id, 'entropy_based', oldTruthValue, updatedTruthValue, {
            newInformation
        });

        return updatedTruthValue;
    }

    /**
     * Performs sophisticated truth value revision based on multiple factors.
     * @param {Task} task - The task to revise.
     * @param {object} options - Revision options.
     */
    sophisticatedRevision(task, options = {}) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = TruthValueManager.sophisticatedRevision(oldTruthValue, {
            ...options,
            currentTime: options.currentTime || Date.now(),
            creationTime: options.creationTime || task.state.stamp.creationTime
        });

        // Update the task's truth value
        task.state.truthValue = revisedTruthValue;

        // Record the revision
        this._recordRevision(task.id, 'sophisticated', oldTruthValue, revisedTruthValue, options);

        return revisedTruthValue;
    }

    /**
     * Records a truth value revision in the history.
     * @param {string} taskId - The task ID.
     * @param {string} revisionType - Type of revision.
     * @param {object} oldTruthValue - Old truth value.
     * @param {object} newTruthValue - New truth value.
     * @param {object} metadata - Additional metadata.
     * @private
     */
    _recordRevision(taskId, revisionType, oldTruthValue, newTruthValue, metadata) {
        if (!this.revisionHistory.has(taskId)) {
            this.revisionHistory.set(taskId, []);
        }

        this.revisionHistory.get(taskId).push({
            type: revisionType,
            oldTruthValue: oldTruthValue,
            newTruthValue: newTruthValue,
            metadata: metadata,
            timestamp: Date.now()
        });
    }

    /**
     * Gets the revision history for a task.
     * @param {string} taskId - The task ID.
     * @returns {Array} Revision history.
     */
    getRevisionHistory(taskId) {
        return this.revisionHistory.get(taskId) || [];
    }

    /**
     * Clears the revision history.
     */
    clearRevisionHistory() {
        this.revisionHistory.clear();
    }

    /**
     * Adds evidence source for a task.
     * @param {string} taskId - The task ID.
     * @param {string} sourceId - The source ID.
     * @param {object} truthValue - The truth value from the source.
     */
    addEvidenceSource(taskId, sourceId, truthValue) {
        if (!this.evidenceSources.has(taskId)) {
            this.evidenceSources.set(taskId, new Map());
        }

        this.evidenceSources.get(taskId).set(sourceId, truthValue);
    }

    /**
     * Gets evidence sources for a task.
     * @param {string} taskId - The task ID.
     * @returns {Map} Evidence sources.
     */
    getEvidenceSources(taskId) {
        return this.evidenceSources.get(taskId) || new Map();
    }

    /**
     * Performs automatic truth value maintenance on a set of tasks.
     * @param {Array} tasks - Array of tasks to maintain.
     * @param {object} options - Maintenance options.
     */
    async maintainTruthValues(tasks, options = {}) {
        const currentTime = Date.now();
        const results = [];

        for (const task of tasks) {
            try {
                // Apply temporal decay
                if (options.applyTemporalDecay !== false) {
                    this.temporalDecayRevision(task, currentTime, options.decayRate);
                }

                // Apply consensus revision if multiple sources are available
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
     * Identifies and resolves conflicts among a set of tasks.
     * @param {Array} tasks - Array of tasks to check for conflicts.
     * @returns {Array} Array of conflict resolution results.
     */
    async resolveConflicts(tasks) {
        const results = [];
        const beliefTasks = tasks.filter(task => task.punctuation === '.');

        // Check for conflicts between belief tasks
        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];

                // Simple conflict detection based on semantic similarity and contradictory frequencies
                try {
                    const similarity = this._calculateSemanticSimilarity(task1, task2);

                    if (similarity > 0.8 &&
                        Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.7) {
                        // High similarity but contradictory frequencies - likely conflict
                        const resolvedTruthValue = this.resolveConflict(task1, task2);

                        results.push({
                            taskIds: [task1.id, task2.id],
                            termKeys: [task1.termKey, task2.termKey],
                            conflictType: 'frequency_contradiction',
                            resolvedTruthValue: resolvedTruthValue,
                            success: true
                        });
                    }
                } catch (error) {
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

    /**
     * Calculates semantic similarity between two tasks.
     * @param {Task} task1 - First task.
     * @param {Task} task2 - Second task.
     * @returns {number} Similarity score (0-1).
     * @private
     */
    _calculateSemanticSimilarity(task1, task2) {
        // This is a simplified implementation
        // In a real system, this would use embeddings or other semantic measures
        if (task1.termKey === task2.termKey) {
            return 1.0;
        }

        // Simple string similarity
        const commonTerms = task1.termKey.split(' ').filter(term => task2.termKey.includes(term));
        const maxTerms = Math.max(task1.termKey.split(' ').length, task2.termKey.split(' ').length);

        return commonTerms.length / maxTerms;
    }
}

module.exports = TruthValueManager;