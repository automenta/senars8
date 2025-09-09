const {cosineSimilarity} = require('../utils/math');
const config = require('../config');
const {handleErrorWithDefault} = require('../utils/error-handler');

/**
 * Truth Value Manager
 * Manages advanced truth value revision and updating mechanisms.
 */
class TruthValueManager {
    bayesianRevision = this._createRevisionMethod('bayesian', this.constructor.bayesianRevision, (newEvidence, weight) => ({
        newEvidence,
        weight
    }));
    consensusRevision = this._createRevisionMethod('consensus', this.constructor.consensusRevision, (evidenceSources) => ({evidenceSources}));
    reinforcementUpdate = this._createRevisionMethod('reinforcement', this.constructor.reinforcementRevision, (reward, learningRate) => ({
        reward,
        learningRate
    }));
    entropyBasedUpdate = this._createRevisionMethod('entropy_based', this.constructor.entropyBasedRevision, (newInformation) => ({newInformation}));

    constructor() {
        this.revisionHistory = new Map();
        this.conflictSets = new Map();
        this.evidenceSources = new Map();
    }

    static deduce(tv1, tv2) {
        const frequency = tv1.frequency * tv2.frequency;
        const confidence = tv1.confidence * tv2.confidence * config.DEFAULT_TRUTH_VALUE.confidence;
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
            revisedTruthValue = this.temporalDecayRevision(
                revisedTruthValue,
                options.currentTime,
                options.creationTime,
                options.decayRate
            );
        }

        if (options.newEvidence) {
            revisedTruthValue = this.bayesianRevision(
                revisedTruthValue,
                options.newEvidence,
                options.evidenceWeight
            );
        }

        if (options.evidenceSources && options.evidenceSources.length > 0) {
            revisedTruthValue = this.consensusRevision(revisedTruthValue, options.evidenceSources);
        }

        if (options.contradictoryEvidence) {
            revisedTruthValue = this.conflictResolutionRevision(revisedTruthValue, options.contradictoryEvidence);
        }

        if (typeof options.reward !== 'undefined') {
            revisedTruthValue = this.reinforcementRevision(revisedTruthValue, options.reward, options.learningRate);
        }

        if (typeof options.newInformation !== 'undefined') {
            revisedTruthValue = this.entropyBasedRevision(revisedTruthValue, options.newInformation);
        }

        return revisedTruthValue;
    }

    // Instance methods that delegate to static methods and record revisions
    _createRevisionMethod(methodName, staticMethod, getAdditionalParams = () => ({})) {
        return (task, ...args) => {
            const oldTruthValue = {...task.state.truthValue};
            const revisedTruthValue = staticMethod.call(this.constructor, oldTruthValue, ...args);
            task.state.truthValue = revisedTruthValue;

            const metadata = getAdditionalParams(...args);
            this._recordRevision(task.id, methodName, oldTruthValue, revisedTruthValue, metadata);

            return revisedTruthValue;
        };
    }

    temporalDecayRevision(task, currentTime, decayRate = 0.0001) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = this.constructor.temporalDecayRevision(
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

    resolveConflict(task1, task2) {
        const oldTruthValue1 = {...task1.state.truthValue};
        const oldTruthValue2 = {...task2.state.truthValue};

        const resolvedTruthValue = this.constructor.conflictResolutionRevision(oldTruthValue1, oldTruthValue2);

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

    sophisticatedRevision(task, options = {}) {
        const oldTruthValue = {...task.state.truthValue};
        const revisedTruthValue = this.constructor.sophisticatedRevision(oldTruthValue, {
            ...options,
            currentTime: options.currentTime || Date.now(),
            creationTime: options.creationTime || task.state.stamp.creationTime
        });
        task.state.truthValue = revisedTruthValue;

        this._recordRevision(task.id, 'sophisticated', oldTruthValue, revisedTruthValue, options);

        return revisedTruthValue;
    }

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

    getRevisionHistory(taskId) {
        return this.revisionHistory.get(taskId) || [];
    }

    clearRevisionHistory() {
        this.revisionHistory.clear();
    }

    addEvidenceSource(taskId, sourceId, truthValue) {
        if (!this.evidenceSources.has(taskId)) {
            this.evidenceSources.set(taskId, new Map());
        }

        this.evidenceSources.get(taskId).set(sourceId, truthValue);
    }

    getEvidenceSources(taskId) {
        return this.evidenceSources.get(taskId) || new Map();
    }

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

    _calculateSemanticSimilarity(task1, task2) {
        if (task1.termKey === task2.termKey) {
            return 1.0;
        }

        const commonTerms = task1.termKey.split(' ').filter(term => task2.termKey.includes(term));
        const maxTerms = Math.max(task1.termKey.split(' ').length, task2.termKey.split(' ').length);

        return commonTerms.length / maxTerms;
    }
}

module.exports = TruthValueManager;