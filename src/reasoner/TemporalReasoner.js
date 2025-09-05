const Task = require('../core/Task');
const {parseTerm} = require('../parser/NewParser');
const {
    determineTemporalRelationship,
    createTemporalRelationshipTask,
    inferTemporalImplications: inferImplications,
    createTemporalSequenceTask,
    detectTemporalPatterns: detectPatterns,
    detectTemporalCycles,
    createTemporalAbstraction,
    detectTemporalAnomalies,
    advancedPredictFutureTasks,
    createTemporalSummary,
    calculateTemporalCoherence,
    detectTemporalClusters,
    createTemporalClusterAbstractions
} = require('../utils/temporal-reasoning');

class TemporalReasoner {
    infer(focusSet) {
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
        if (temporalFocusSet.length < 2) {
            return [];
        }

        const relationshipTasks = this._inferTemporalRelationships(temporalFocusSet);
        const implicationTasks = this._inferTemporalImplications(temporalFocusSet);
        const patternTasks = this._detectTemporalPatterns(temporalFocusSet);
        const cycleTasks = this._detectTemporalCycles(temporalFocusSet);
        const abstractionTasks = this._createTemporalAbstractions(temporalFocusSet);
        const anomalyTasks = this._detectTemporalAnomalies(temporalFocusSet);
        const predictionTasks = this._predictFutureTasks(temporalFocusSet);
        const clusterTasks = this._detectTemporalClusters(temporalFocusSet);
        const coherenceTasks = this._calculateTemporalCoherence(temporalFocusSet);

        return [...relationshipTasks, ...implicationTasks, ...patternTasks, ...cycleTasks, ...abstractionTasks, ...anomalyTasks, ...predictionTasks, ...clusterTasks, ...coherenceTasks];
    }

    _inferTemporalRelationships(temporalFocusSet) {
        const temporalTasks = [];
        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];
                const relationship = determineTemporalRelationship(task1, task2);
                if (relationship) {
                    const relationshipTask = createTemporalRelationshipTask(task1, task2, relationship);
                    if (relationshipTask) { // Check if task was created successfully
                        temporalTasks.push(relationshipTask);
                    }
                }
            }
        }
        return temporalTasks;
    }

    _inferTemporalImplications(temporalFocusSet) {
        const implicationTasks = [];
        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];
                const implications = inferImplications(task1, task2);
                implicationTasks.push(...implications);
            }
        }
        return implicationTasks;
    }

    _detectTemporalPatterns(temporalFocusSet) {
        const patternTasks = [];
        const patterns = detectPatterns(temporalFocusSet);

        for (const pattern of patterns) {
            if (pattern.type === 'periodic') {
                const termKey = `(periodic_pattern, ${pattern.tasks[0].termKey})`;
                const parsedTerm = parseTerm(termKey);
                if (parsedTerm) {
                    const periodicTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.9,
                            confidence: pattern.confidence
                        }
                    );
                    patternTasks.push(periodicTask);
                }
            } else if (pattern.type === 'sequential') {
                const sequenceTask = createTemporalSequenceTask(pattern.sequence);
                if (sequenceTask) {
                    patternTasks.push(sequenceTask);
                }
            }
        }
        return patternTasks;
    }

    _detectTemporalCycles(temporalFocusSet) {
        const cycleTasks = [];
        const cycles = detectTemporalCycles(temporalFocusSet);

        for (const cycle of cycles) {
            const cycleTask = new Task(
                parseTerm(`(cyclic_pattern, ${cycle.termKey})`),
                '.', {
                    frequency: 0.95,
                    confidence: cycle.confidence
                }
            );
            cycleTasks.push(cycleTask);
        }
        return cycleTasks;
    }

    _createTemporalAbstractions(temporalFocusSet) {
        const abstractionTasks = [];
        
        // Create abstraction for the entire set
        const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
        if (overallAbstraction) {
            abstractionTasks.push(overallAbstraction);
        }

        return abstractionTasks;
    }

    _detectTemporalAnomalies(temporalFocusSet) {
        const anomalyTasks = [];
        const anomalies = detectTemporalAnomalies(temporalFocusSet);

        for (const anomaly of anomalies) {
            const anomalyTask = new Task(
                parseTerm(`(temporal_anomaly, ${anomaly.termKey})`),
                '.', {
                    frequency: anomaly.severity,
                    confidence: 0.8
                }
            );
            anomalyTasks.push(anomalyTask);
        }
        return anomalyTasks;
    }

    _predictFutureTasks(temporalFocusSet) {
        // Predict for the next 24 hours
        const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, 24 * 60 * 60 * 1000);
        return predictionTasks;
    }

    _detectTemporalClusters(temporalFocusSet) {
        const clusterTasks = [];
        const clusters = detectTemporalClusters(temporalFocusSet);
        const abstractions = createTemporalClusterAbstractions(clusters);
        clusterTasks.push(...abstractions);
        return clusterTasks;
    }

    _calculateTemporalCoherence(temporalFocusSet) {
        const coherenceScore = calculateTemporalCoherence(temporalFocusSet);
        const coherenceTask = new Task(
            parseTerm('(temporal_coherence)'),
            '.',
            {
                frequency: coherenceScore,
                confidence: 0.9
            }
        );
        return [coherenceTask];
    }
}

module.exports = TemporalReasoner;
