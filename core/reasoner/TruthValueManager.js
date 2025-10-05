import config from '../config/index.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {getBeliefTasks} from '../utils/task-utils.js';
import {error as logError} from '../utils/logger.js';

const errorHandler = createUnifiedErrorHandler('TruthValueManager');

const clamp = (val, min = 0, max = 1) => Math.max(min, Math.min(max, val));
const clampFreq = val => clamp(val, 0.0, 1.0);
const clampConf = val => clamp(val, 0.0, 1.0);
const weightedAvg = (v1, w1, v2, w2) => (v1 * w1 + v2 * w2) / (w1 + w2);
const entropy = freq => {
  const f = clamp(freq, 0.0001, 0.9999);
  return -(f * Math.log2(f) + (1 - f) * Math.log2(1 - f));
};
const validateTruthValue = tv => tv && typeof tv.frequency === 'number' && typeof tv.confidence === 'number';

class TruthValueManager {
    constructor() {
        this.revisionHistory = new Map();
        this.conflictSets = new Map();
        this.evidenceSources = new Map();
        this.defaultConfig = {
            ...config.DEFAULT_TRUTH_VALUE,
            decayRate: 0.0001,
            learningRate: 0.1,
            evidenceWeight: 0.5,
            conflictResolutionThreshold: 0.7
        };
    }

     static deduce(tv1, tv2, options = {}) {
         const {baseConfidence = config.DEFAULT_TRUTH_VALUE.confidence} = options;
         return {
             frequency: tv1.frequency * tv2.frequency,
             confidence: clampConf(tv1.confidence * tv2.confidence * baseConfidence),
         };
     }

     static induce(tv1, tv2, options = {}) {
         const {confidenceReduction = 0.5} = options;
         return {
             frequency: (tv1.frequency + tv2.frequency) / 2,
             confidence: clampConf(tv1.confidence * tv2.confidence * confidenceReduction),
         };
     }

     static abduce(tv1, tv2, options = {}) {
         const {confidenceReduction = 0.3} = options;
         return {
             frequency: (tv1.frequency + tv2.frequency) / 2,
             confidence: clampConf(tv1.confidence * tv2.confidence * confidenceReduction),
         };
     }

     static analogize(tv1, tv2, tv3, options = {}) {
         const {confidenceReduction = 0.4} = options;
         return {
             frequency: (tv1.frequency + tv2.frequency + tv3.frequency) / 3,
             confidence: clampConf(tv1.confidence * tv2.confidence * tv3.confidence * confidenceReduction),
         };
     }

     static bayesianRevision(oldTruthValue, newEvidence, weight = 0.5) {
         if (!validateTruthValue(oldTruthValue) || !validateTruthValue(newEvidence)) {
             throw new Error('Both old and new evidence truth values must be provided');
         }

         const w = clamp(weight);
         const revisedFrequency = weightedAvg(oldTruthValue.frequency, 1 - w, newEvidence.frequency, w);
         const revisedConfidence = clampConf(oldTruthValue.confidence + newEvidence.confidence * w);

         return {
             frequency: clampFreq(revisedFrequency),
             confidence: revisedConfidence,
         };
     }

     static consensusRevision(currentTruthValue, evidenceSources) {
         if (!evidenceSources?.length) return currentTruthValue;

         let totalWeightedFrequency = currentTruthValue.frequency * currentTruthValue.confidence;
         let totalWeight = currentTruthValue.confidence;
         let maxConfidence = currentTruthValue.confidence;

         for (const evidence of evidenceSources) {
             if (validateTruthValue(evidence)) {
                 totalWeightedFrequency += evidence.frequency * evidence.confidence;
                 totalWeight += evidence.confidence;
                 maxConfidence = Math.max(maxConfidence, evidence.confidence);
             }
         }

         return totalWeight === 0 ? currentTruthValue : {
             frequency: totalWeightedFrequency / totalWeight,
             confidence: clampConf(maxConfidence),
         };
     }

     static temporalDecayRevision(truthValue, currentTime, creationTime, decayRate = 0.0001) {
         if (typeof currentTime !== 'number' || typeof creationTime !== 'number') {
             throw new Error('Current and creation times must be valid numbers');
         }

         const age = currentTime - creationTime;
         const decayFactor = Math.exp(-decayRate * age);

         return {
             frequency: truthValue.frequency,
             confidence: Math.max(0.0, truthValue.confidence * decayFactor),
         };
     }

     static conflictResolutionRevision(truthValue1, truthValue2, options = {}) {
         const {threshold = 0.7} = options;
         const frequencyDifference = Math.abs(truthValue1.frequency - truthValue2.frequency);

         return frequencyDifference < threshold
             ? {
                 frequency: (truthValue1.frequency + truthValue2.frequency) / 2,
                 confidence: (truthValue1.confidence + truthValue2.confidence) / 2
             }
             : (() => {
                 const totalConfidence = truthValue1.confidence + truthValue2.confidence;
                 if (totalConfidence === 0) return {frequency: 0.5, confidence: 0.0};

                 const weight1 = truthValue1.confidence / totalConfidence;
                 const weight2 = truthValue2.confidence / totalConfidence;
                 const revisedFrequency = weightedAvg(truthValue1.frequency, weight1, truthValue2.frequency, weight2);
                 const confidenceReduction = frequencyDifference;
                 const revisedConfidence = Math.max(0.1, weightedAvg(truthValue1.confidence, weight1, truthValue2.confidence, weight2) * (1 - confidenceReduction));

                 return {frequency: revisedFrequency, confidence: revisedConfidence};
             })();
     }

     static reinforcementRevision(truthValue, reward, learningRate = 0.1) {
         if (typeof reward !== 'number' || reward < -1 || reward > 1) {
             throw new Error('Reward must be a number between -1 and 1');
         }

         const delta = reward * learningRate;
         return {
             frequency: clampFreq(truthValue.frequency + delta),
             confidence: clampConf(truthValue.confidence + Math.abs(reward) * learningRate),
         };
     }

     static entropyBasedRevision(truthValue, newInformation) {
         if (typeof newInformation !== 'number') {
             throw new Error('New information must be a number');
         }

         const currentEntropy = entropy(truthValue.frequency);
         const frequencyAdjustment = newInformation * 0.05;
         const newFrequency = clampFreq(truthValue.frequency + frequencyAdjustment);
         const entropyReduction = Math.min(0.1, Math.abs(newInformation) * 0.1 / (1 + currentEntropy));
         const newConfidence = clampConf(truthValue.confidence + entropyReduction);

         return {frequency: newFrequency, confidence: newConfidence};
     }

     static sophisticatedRevision(currentTruthValue, options = {}) {
         let revised = {...currentTruthValue};

         try {
             const revisions = [
                 [options.applyTemporalDecay && options.currentTime !== undefined && options.creationTime !== undefined,
                  () => TruthValueManager.temporalDecayRevision(revised, options.currentTime, options.creationTime, options.decayRate || 0.0001)],

                 [options.newEvidence,
                  () => TruthValueManager.bayesianRevision(revised, options.newEvidence, options.evidenceWeight || 0.5)],

                 [options.evidenceSources?.length,
                  () => TruthValueManager.consensusRevision(revised, options.evidenceSources)],

                 [options.contradictoryEvidence,
                  () => TruthValueManager.conflictResolutionRevision(revised, options.contradictoryEvidence, {threshold: options.conflictThreshold || 0.7})],

                 [options.reward !== undefined,
                  () => TruthValueManager.reinforcementRevision(revised, options.reward, options.learningRate || 0.1)],

                 [options.newInformation !== undefined,
                  () => TruthValueManager.entropyBasedRevision(revised, options.newInformation)]
             ];

             for (const [condition, revisionFn] of revisions) {
                 if (condition) revised = revisionFn();
             }

             return revised;
         } catch (error) {
             logError('Error in sophisticated revision:', error);
             return currentTruthValue;
         }
     }

     bayesianRevision(task, newEvidence, weight = 0.5) {
         return this._revisionWrapper(task, 'bayesian',
             (old) => TruthValueManager.bayesianRevision(old, newEvidence, weight),
             {newEvidence, weight});
     }

     consensusRevision(task, evidenceSources) {
         return this._revisionWrapper(task, 'consensus',
             (old) => TruthValueManager.consensusRevision(old, evidenceSources),
             {evidenceSources});
     }

     reinforcementUpdate(task, reward, learningRate = 0.1) {
         return this._revisionWrapper(task, 'reinforcement',
             (old) => TruthValueManager.reinforcementRevision(old, reward, learningRate),
             {reward, learningRate});
     }

     temporalDecayRevision(task, currentTime, decayRate = 0.0001) {
         return this._revisionWrapper(task, 'temporal_decay',
             (old) => TruthValueManager.temporalDecayRevision(old, currentTime, task.state.stamp.creationTime, decayRate),
             {currentTime, decayRate});
     }

     resolveConflict(task1, task2, options = {}) {
         const oldTruthValue1 = {...task1.state.truthValue};
         const oldTruthValue2 = {...task2.state.truthValue};

         const resolvedTruthValue = TruthValueManager.conflictResolutionRevision(oldTruthValue1, oldTruthValue2, options);

         task1.state.truthValue = resolvedTruthValue;
         task2.state.truthValue = resolvedTruthValue;

         this._recordRevision(task1.id, 'conflict_resolution', oldTruthValue1, resolvedTruthValue, {conflictingTaskId: task2.id});
         this._recordRevision(task2.id, 'conflict_resolution', oldTruthValue2, resolvedTruthValue, {conflictingTaskId: task1.id});

         const conflictKey = `${Math.min(task1.id, task2.id)}_${Math.max(task1.id, task2.id)}`;
         this.conflictSets.set(conflictKey, {tasks: [task1.id, task2.id], resolvedTruthValue, timestamp: Date.now()});

         return resolvedTruthValue;
     }

     sophisticatedRevision(task, options = {}) {
         return this._revisionWrapper(task, 'sophisticated',
             (old) => TruthValueManager.sophisticatedRevision(old, {
                 ...options,
                 currentTime: options.currentTime || Date.now(),
                 creationTime: options.creationTime || task.state.stamp.creationTime,
             }),
             options);
     }

     addEvidenceSource(taskId, sourceId, truthValue) {
         if (!this.evidenceSources.has(taskId)) this.evidenceSources.set(taskId, new Map());
         this.evidenceSources.get(taskId).set(sourceId, truthValue);
     }

     getEvidenceSources(taskId) {
         return this.evidenceSources.get(taskId) || new Map();
     }

     _revisionWrapper(task, revisionType, revisionFn, metadata) {
         const oldTruthValue = {...task.state.truthValue};
         const newTruthValue = revisionFn(oldTruthValue);
         task.state.truthValue = newTruthValue;
         this._recordRevision(task.id, revisionType, oldTruthValue, newTruthValue, metadata);
         return newTruthValue;
     }

     _recordRevision(taskId, revisionType, oldTruthValue, newTruthValue, metadata) {
         if (!this.revisionHistory.has(taskId)) this.revisionHistory.set(taskId, []);

         this.revisionHistory.get(taskId).push({
             type: revisionType,
             oldTruthValue: {...oldTruthValue},
             newTruthValue: {...newTruthValue},
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
        const applyTemporalDecay = options.applyTemporalDecay !== false;
        const decayRate = options.decayRate || this.defaultConfig.decayRate;

        return Promise.all(tasks.map(task =>
            errorHandler.execute(async () => {
                try {
                    if (applyTemporalDecay) this.temporalDecayRevision(task, currentTime, decayRate);
                    const evidenceSources = this.getEvidenceSources(task.id);
                    if (evidenceSources.size > 1) this.consensusRevision(task, [...evidenceSources.values()]);
                    return {taskId: task.id, success: true, message: 'Truth value maintained successfully'};
                } catch (error) {
                    return {taskId: task.id, success: false, error: error.message};
                }
            }, `maintainTruthValues: ${task.id}`, {taskId: task.id, success: false, error: 'Unknown error during maintenance'})
        ));
    }

    async resolveConflicts(tasks, options = {}) {
        const {similarityThreshold = 0.8, frequencyDifferenceThreshold = 0.7} = options;
        const beliefTasks = getBeliefTasks(tasks);

        const conflictPairs = [];
        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                conflictPairs.push([beliefTasks[i], beliefTasks[j]]);
            }
        }

        const results = await Promise.all(conflictPairs.map(([task1, task2]) =>
            errorHandler.execute(async () => {
                const similarity = this._calculateSemanticSimilarity(task1, task2);
                if (similarity < similarityThreshold) return null;

                const frequencyDiff = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency);
                if (frequencyDiff < frequencyDifferenceThreshold) return null;

                const resolvedTruthValue = this.resolveConflict(task1, task2, {threshold: frequencyDifferenceThreshold});
                return {
                    taskIds: [task1.id, task2.id],
                    resolvedTruthValue,
                    similarity,
                    frequencyDifference: frequencyDiff,
                    success: true
                };
            }, `resolveConflicts: ${task1.id}-${task2.id}`)
        ));

        return results.filter(Boolean);
    }

    _calculateSemanticSimilarity(task1, task2) {
        if (task1.termKey === task2.termKey) return 1.0;

        const terms1 = new Set(task1.termKey.toLowerCase().split(/[() ,.]+/).filter(Boolean));
        const terms2 = new Set(task2.termKey.toLowerCase().split(/[() ,.]+/).filter(Boolean));
        const intersection = new Set([...terms1].filter(x => terms2.has(x)));
        const union = new Set([...terms1, ...terms2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    getStatistics() {
        const totalRevisions = Array.from(this.revisionHistory.values()).reduce((sum, revisions) => sum + revisions.length, 0);
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