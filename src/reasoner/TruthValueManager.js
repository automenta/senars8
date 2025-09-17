import config from '../config/index.js';
import {
    createModuleErrorHandler
} from '../utils/errorHandler.js';
import {
    getBeliefTasks
} from '../utils/task-utils.js';

const errorHandler = createModuleErrorHandler('TruthValueManager');

class TruthValueManager {
    constructor() {
        this.revisionHistory = new Map();
        this.conflictSets = new Map();
        this.evidenceSources = new Map();
    }

    static deduce(tv1, tv2) {
        return {
            frequency: tv1.frequency * tv2.frequency,
            confidence: tv1.confidence * tv2.confidence * config.DEFAULT_TRUTH_VALUE.confidence,
        };
    }

    static induce(tv1, tv2) {
        return {
            frequency: (tv1.frequency + tv2.frequency) / 2,
            confidence: tv1.confidence * tv2.confidence * 0.5,
        };
    }

    static abduce(tv1, tv2) {
        return {
            frequency: (tv1.frequency + tv2.frequency) / 2,
            confidence: tv1.confidence * tv2.confidence * 0.3,
        };
    }

    static analogize(tv1, tv2, tv3) {
        return {
            frequency: (tv1.frequency + tv2.frequency + tv3.frequency) / 3,
            confidence: tv1.confidence * tv2.confidence * tv3.confidence * 0.4,
        };
    }

    static bayesianRevision(oldTruthValue, newEvidence, weight = 0.5) {
        return {
            frequency: (1 - weight) * oldTruthValue.frequency + weight * newEvidence.frequency,
            confidence: Math.min(1.0, oldTruthValue.confidence + newEvidence.confidence * weight),
        };
    }

    static consensusRevision(currentTruthValue, evidenceSources) {
        if (!evidenceSources?.length) return currentTruthValue;

        const {
            totalWeightedFrequency,
            totalWeight,
            maxConfidence
        } = evidenceSources.reduce(
            ({
                totalWeightedFrequency,
                totalWeight,
                maxConfidence
            }, evidence) => ({
                totalWeightedFrequency: totalWeightedFrequency + evidence.frequency * evidence.confidence,
                totalWeight: totalWeight + evidence.confidence,
                maxConfidence: Math.max(maxConfidence, evidence.confidence),
            }), {
                totalWeightedFrequency: currentTruthValue.frequency * currentTruthValue.confidence,
                totalWeight: currentTruthValue.confidence,
                maxConfidence: currentTruthValue.confidence,
            }
        );

        return {
            frequency: totalWeightedFrequency / totalWeight,
            confidence: Math.min(1.0, maxConfidence),
        };
    }

    static temporalDecayRevision(truthValue, currentTime, creationTime, decayRate = 0.0001) {
        const age = currentTime - creationTime;
        const decayFactor = Math.exp(-decayRate * age);
        return {
            frequency: truthValue.frequency,
            confidence: truthValue.confidence * decayFactor
        };
    }

    static conflictResolutionRevision(truthValue1, truthValue2) {
        const totalConfidence = truthValue1.confidence + truthValue2.confidence;
        if (totalConfidence === 0) return {
            frequency: 0.5,
            confidence: 0.0
        };

        const weight1 = truthValue1.confidence / totalConfidence;
        const weight2 = truthValue2.confidence / totalConfidence;
        const revisedFrequency = weight1 * truthValue1.frequency + weight2 * truthValue2.frequency;
        const confidenceReduction = Math.abs(truthValue1.frequency - truthValue2.frequency);
        const revisedConfidence = Math.max(0.1, (weight1 * truthValue1.confidence + weight2 * truthValue2.confidence) * (1 - confidenceReduction));

        return {
            frequency: revisedFrequency,
            confidence: revisedConfidence
        };
    }

    static reinforcementRevision(truthValue, reward, learningRate = 0.1) {
        const delta = reward * learningRate;
        return {
            frequency: Math.max(0.0, Math.min(1.0, truthValue.frequency + delta)),
            confidence: Math.min(1.0, truthValue.confidence + Math.abs(reward) * learningRate),
        };
    }

    static entropyBasedRevision(truthValue, newInformation) {
        const currentEntropy = -(truthValue.frequency * Math.log2(truthValue.frequency || 0.0001) +
            (1 - truthValue.frequency) * Math.log2((1 - truthValue.frequency) || 0.0001));
        const entropyReduction = Math.abs(newInformation) * 0.1 / (1 + currentEntropy);
        return {
            frequency: Math.max(0.0, Math.min(1.0, truthValue.frequency + (newInformation * 0.05))),
            confidence: Math.min(1.0, truthValue.confidence + entropyReduction),
        };
    }

    static sophisticatedRevision(currentTruthValue, options = {}) {
        let revised = { ...currentTruthValue
        };
        if (options.applyTemporalDecay) {
            revised = this.temporalDecayRevision(revised, options.currentTime, options.creationTime, options.decayRate);
        }
        if (options.newEvidence) {
            revised = this.bayesianRevision(revised, options.newEvidence, options.evidenceWeight);
        }
        if (options.evidenceSources?.length) {
            revised = this.consensusRevision(revised, options.evidenceSources);
        }
        if (options.contradictoryEvidence) {
            revised = this.conflictResolutionRevision(revised, options.contradictoryEvidence);
        }
        if (options.reward !== undefined) {
            revised = this.reinforcementRevision(revised, options.reward, options.learningRate);
        }
        if (options.newInformation !== undefined) {
            revised = this.entropyBasedRevision(revised, options.newInformation);
        }
        return revised;
    }

    _revisionWrapper(task, revisionType, revisionFn, metadata) {
        const oldTruthValue = { ...task.state.truthValue
        };
        const revisedTruthValue = revisionFn(oldTruthValue);
        task.state.truthValue = revisedTruthValue;
        this._recordRevision(task.id, revisionType, oldTruthValue, revisedTruthValue, metadata);
        return revisedTruthValue;
    }

    bayesianRevision(task, newEvidence, weight = 0.5) {
        return this._revisionWrapper(task, 'bayesian',
            (old) => TruthValueManager.bayesianRevision(old, newEvidence, weight), {
                newEvidence,
                weight
            });
    }

    consensusRevision(task, evidenceSources) {
        return this._revisionWrapper(task, 'consensus',
            (old) => TruthValueManager.consensusRevision(old, evidenceSources), {
                evidenceSources
            });
    }

    reinforcementUpdate(task, reward, learningRate = 0.1) {
        return this._revisionWrapper(task, 'reinforcement',
            (old) => TruthValueManager.reinforcementRevision(old, reward, learningRate), {
                reward,
                learningRate
            });
    }

    temporalDecayRevision(task, currentTime, decayRate = 0.0001) {
        return this._revisionWrapper(task, 'temporal_decay',
            (old) => TruthValueManager.temporalDecayRevision(old, currentTime, task.state.stamp.creationTime, decayRate), {
                currentTime,
                decayRate
            });
    }

    resolveConflict(task1, task2) {
        const oldTruthValue1 = { ...task1.state.truthValue
        };
        const oldTruthValue2 = { ...task2.state.truthValue
        };
        const resolvedTruthValue = TruthValueManager.conflictResolutionRevision(oldTruthValue1, oldTruthValue2);
        task1.state.truthValue = resolvedTruthValue;
        task2.state.truthValue = resolvedTruthValue;
        this._recordRevision(task1.id, 'conflict_resolution', oldTruthValue1, resolvedTruthValue, {
            conflictingTaskId: task2.id
        });
        this._recordRevision(task2.id, 'conflict_resolution', oldTruthValue2, resolvedTruthValue, {
            conflictingTaskId: task1.id
        });
        this.conflictSets.set(`${task1.id}_${task2.id}`, {
            tasks: [task1.id, task2.id],
            resolvedTruthValue,
            timestamp: Date.now(),
        });
        return resolvedTruthValue;
    }

    sophisticatedRevision(task, options = {}) {
        return this._revisionWrapper(task, 'sophisticated',
            (old) => TruthValueManager.sophisticatedRevision(old, {
                ...options,
                currentTime: options.currentTime || Date.now(),
                creationTime: options.creationTime || task.state.stamp.creationTime,
            }),
            options
        );
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

    _recordRevision(taskId, revisionType, oldTruthValue, newTruthValue, metadata) {
        if (!this.revisionHistory.has(taskId)) {
            this.revisionHistory.set(taskId, []);
        }
        this.revisionHistory.get(taskId).push({
            type: revisionType,
            oldTruthValue,
            newTruthValue,
            metadata,
            timestamp: Date.now(),
        });
    }

    getRevisionHistory(taskId) {
        return this.revisionHistory.get(taskId) || [];
    }

    clearRevisionHistory() {
        this.revisionHistory.clear();
    }

    async maintainTruthValues(tasks, options = {}) {
        const currentTime = Date.now();
        return Promise.all(tasks.map(task =>
            errorHandler.safeAsync(async () => {
                if (options.applyTemporalDecay !== false) {
                    this.temporalDecayRevision(task, currentTime, options.decayRate);
                }
                const evidenceSources = this.getEvidenceSources(task.id);
                if (evidenceSources.size > 1) {
                    this.consensusRevision(task, [...evidenceSources.values()]);
                }
                return {
                    taskId: task.id,
                    success: true
                };
            }, `maintainTruthValues: ${task.id}`, {
                taskId: task.id,
                success: false,
                error: 'Unknown error'
            })
        ));
    }

    async resolveConflicts(tasks) {
        const beliefTasks = getBeliefTasks(tasks);
        const results = [];
        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];
                const result = await errorHandler.safeAsync(async () => {
                    const similarity = this._calculateSemanticSimilarity(task1, task2);
                    if (similarity > 0.8 && Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.7) {
                        const resolvedTruthValue = this.resolveConflict(task1, task2);
                        return {
                            taskIds: [task1.id, task2.id],
                            resolvedTruthValue,
                            success: true
                        };
                    }
                    return null;
                }, `resolveConflicts: ${task1.id}-${task2.id}`);
                if (result) results.push(result);
            }
        }
        return results;
    }

    _calculateSemanticSimilarity(task1, task2) {
        if (task1.termKey === task2.termKey) return 1.0;
        const terms1 = new Set(task1.termKey.split(/[() ,]+/).filter(Boolean));
        const terms2 = new Set(task2.termKey.split(/[() ,]+/).filter(Boolean));
        const intersection = new Set([...terms1].filter(x => terms2.has(x)));
        const union = new Set([...terms1, ...terms2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
}

export default TruthValueManager;
