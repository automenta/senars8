const Task = require('../core/Task');
const {parseTerm} = require('../parser/narseseParser');
const config = require('../config');
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
const {debug, warn} = require('../utils/logger');
const {handleErrorWithDefault} = require('../utils/error-handler');

class TemporalReasoner {
    infer(focusSet) {
        try {
            debug(`Temporal reasoning on ${focusSet.length} tasks`);
            const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
            if (temporalFocusSet.length < 2) {
                debug('Insufficient temporal tasks for reasoning');
                return [];
            }

            debug(`Processing ${temporalFocusSet.length} temporal tasks`);
            const relationshipTasks = this._inferTemporalRelationships(temporalFocusSet);
            const implicationTasks = this._inferTemporalImplications(temporalFocusSet);
            const patternTasks = this._detectTemporalPatterns(temporalFocusSet);
            const cycleTasks = this._detectTemporalCycles(temporalFocusSet);
            const abstractionTasks = this._createTemporalAbstractions(temporalFocusSet);
            const anomalyTasks = this._detectTemporalAnomalies(temporalFocusSet);
            const predictionTasks = this._predictFutureTasks(temporalFocusSet);
            const clusterTasks = this._detectTemporalClusters(temporalFocusSet);
            const coherenceTasks = this._calculateTemporalCoherence(temporalFocusSet);

            const allTasks = [...relationshipTasks, ...implicationTasks, ...patternTasks, ...cycleTasks, ...abstractionTasks, ...anomalyTasks, ...predictionTasks, ...clusterTasks, ...coherenceTasks];
            debug(`Temporal reasoning produced ${allTasks.length} derived tasks`);
            return allTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal reasoning error', []);
        }
    }

    _inferTemporalRelationships(temporalFocusSet) {
        try {
            debug(`Inferring temporal relationships for ${temporalFocusSet.length} tasks`);
            const temporalTasks = [];
            let relationshipCount = 0;
            
            // Limit the number of comparisons to prevent performance issues
            const maxComparisons = 1000;
            let comparisonCount = 0;
            
            for (let i = 0; i < temporalFocusSet.length && comparisonCount < maxComparisons; i++) {
                for (let j = i + 1; j < temporalFocusSet.length && comparisonCount < maxComparisons; j++) {
                    comparisonCount++;
                    const task1 = temporalFocusSet[i];
                    const task2 = temporalFocusSet[j];
                    const relationship = determineTemporalRelationship(task1, task2);
                    if (relationship) {
                        const relationshipTask = createTemporalRelationshipTask(task1, task2, relationship);
                        if (relationshipTask) { // Check if task was created successfully
                            temporalTasks.push(relationshipTask);
                            relationshipCount++;
                        }
                    }
                }
            }
            
            debug(`Found ${relationshipCount} temporal relationships (${comparisonCount} comparisons)`);
            return temporalTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal relationship inference error', []);
        }
    }

    _inferTemporalImplications(temporalFocusSet) {
        try {
            debug(`Inferring temporal implications for ${temporalFocusSet.length} tasks`);
            const implicationTasks = [];
            let implicationCount = 0;
            
            // Limit the number of comparisons to prevent performance issues
            const maxComparisons = 1000;
            let comparisonCount = 0;
            
            for (let i = 0; i < temporalFocusSet.length && comparisonCount < maxComparisons; i++) {
                for (let j = i + 1; j < temporalFocusSet.length && comparisonCount < maxComparisons; j++) {
                    comparisonCount++;
                    const task1 = temporalFocusSet[i];
                    const task2 = temporalFocusSet[j];
                    const implications = inferImplications(task1, task2);
                    implicationTasks.push(...implications);
                    implicationCount += implications.length;
                }
            }
            
            debug(`Found ${implicationCount} temporal implications (${comparisonCount} comparisons)`);
            return implicationTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal implication inference error', []);
        }
    }

    _detectTemporalPatterns(temporalFocusSet) {
        try {
            debug(`Detecting temporal patterns for ${temporalFocusSet.length} tasks`);
            const patternTasks = [];
            const patterns = detectPatterns(temporalFocusSet);

            for (const pattern of patterns) {
                try {
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
                } catch (err) {
                    handleErrorWithDefault(err, `Error processing pattern of type ${pattern.type}`, null);
                    // Continue with other patterns
                }
            }
            
            debug(`Detected ${patternTasks.length} temporal pattern tasks`);
            return patternTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal pattern detection error', []);
        }
    }

    _detectTemporalCycles(temporalFocusSet) {
        try {
            debug(`Detecting temporal cycles for ${temporalFocusSet.length} tasks`);
            const cycleTasks = [];
            const cycles = detectTemporalCycles(temporalFocusSet);

            for (const cycle of cycles) {
                try {
                    const cycleTask = new Task(
                        parseTerm(`(cyclic_pattern, ${cycle.termKey})`),
                        '.',
                        {
                            frequency: 0.95,
                            confidence: cycle.confidence
                        }
                    );
                    cycleTasks.push(cycleTask);
                } catch (err) {
                    handleErrorWithDefault(err, `Error processing cycle for term ${cycle.termKey}`, null);
                    // Continue with other cycles
                }
            }
            
            debug(`Detected ${cycleTasks.length} temporal cycles`);
            return cycleTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal cycle detection error', []);
        }
    }

    _createTemporalAbstractions(temporalFocusSet) {
        try {
            debug(`Creating temporal abstractions for ${temporalFocusSet.length} tasks`);
            const abstractionTasks = [];

            // Create abstraction for the entire set
            const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
            if (overallAbstraction) {
                abstractionTasks.push(overallAbstraction);
            }

            debug(`Created ${abstractionTasks.length} temporal abstractions`);
            return abstractionTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal abstraction creation error', []);
        }
    }

    _detectTemporalAnomalies(temporalFocusSet) {
        try {
            debug(`Detecting temporal anomalies for ${temporalFocusSet.length} tasks`);
            const anomalyTasks = [];
            const anomalies = detectTemporalAnomalies(temporalFocusSet);

            for (const anomaly of anomalies) {
                try {
                    const anomalyTask = new Task(
                        parseTerm(`(temporal_anomaly, ${anomaly.termKey})`),
                        '.',
                        {
                            frequency: anomaly.severity,
                            confidence: 0.8
                        }
                    );
                    anomalyTasks.push(anomalyTask);
                } catch (err) {
                    handleErrorWithDefault(err, `Error processing anomaly for term ${anomaly.termKey}`, null);
                    // Continue with other anomalies
                }
            }
            
            debug(`Detected ${anomalyTasks.length} temporal anomalies`);
            return anomalyTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal anomaly detection error', []);
        }
    }

    _predictFutureTasks(temporalFocusSet) {
        try {
            debug(`Predicting future tasks for ${temporalFocusSet.length} tasks`);
            // Predict for the next 24 hours
            const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, 24 * 60 * 60 * 1000);
            debug(`Predicted ${predictionTasks.length} future tasks`);
            return predictionTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Future task prediction error', []);
        }
    }

    _detectTemporalClusters(temporalFocusSet) {
        try {
            debug(`Detecting temporal clusters for ${temporalFocusSet.length} tasks`);
            const clusterTasks = [];
            const clusters = detectTemporalClusters(temporalFocusSet);
            const abstractions = createTemporalClusterAbstractions(clusters);
            clusterTasks.push(...abstractions);
            debug(`Detected ${clusterTasks.length} temporal cluster abstractions`);
            return clusterTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal cluster detection error', []);
        }
    }

    _calculateTemporalCoherence(temporalFocusSet) {
        try {
            debug(`Calculating temporal coherence for ${temporalFocusSet.length} tasks`);
            const coherenceScore = calculateTemporalCoherence(temporalFocusSet);
            const coherenceTask = new Task(
                parseTerm('(temporal_coherence)'),
                '.',
                {
                    frequency: coherenceScore,
                    confidence: config.DEFAULT_TRUTH_VALUE.confidence
                }
            );
            debug(`Temporal coherence score: ${coherenceScore}`);
            return [coherenceTask];
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal coherence calculation error', []);
        }
    }
}

module.exports = TemporalReasoner;
