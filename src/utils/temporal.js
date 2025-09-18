import Task from '../core/Task.js';
import {parseTerm} from '../parser/narseseParser.js';
import config from '../config/index.js';

function groupTasksByTermKey(tasks) {
    return tasks.reduce((groups, task) => {
        (groups[task.termKey] = groups[task.termKey] || []).push(task);
        return groups;
    }, {});
}

function calculateIntervalStats(tasks) {
    if (tasks.length < 2) {
        return {
            intervals: [],
            avgInterval: 0,
            variance: 0,
            stdDev: 0
        };
    }
    const sortedTimestamps = tasks.map(t => t.state.stamp.occurrenceTime).sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < sortedTimestamps.length; i++) {
        intervals.push(sortedTimestamps[i] - sortedTimestamps[i - 1]);
    }

    if (intervals.length === 0) {
        return {
            intervals,
            avgInterval: 0,
            variance: 0,
            stdDev: 0
        };
    }
    const sum = intervals.reduce((acc, val) => acc + val, 0);
    const avgInterval = sum / intervals.length;
    const variance = intervals.reduce((acc, val) => acc + (val - avgInterval) ** 2, 0) / intervals.length;

    return {
        intervals,
        avgInterval,
        variance,
        stdDev: Math.sqrt(variance),
    };
}

function findTasksInTimeWindow(tasks, startTime, endTime) {
    return tasks.filter(task => {
        const {
            occurrenceTime,
            endTime: taskEndTime
        } = task.state.stamp;
        if (!occurrenceTime) return false;
        const effectiveEndTime = taskEndTime || occurrenceTime;
        return startTime <= effectiveEndTime && endTime >= occurrenceTime;
    });
}

function determineTemporalRelationship(task1, task2) {
    const {
        occurrenceTime: start1,
        endTime: end1
    } = task1.state.stamp;
    const {
        occurrenceTime: start2,
        endTime: end2
    } = task2.state.stamp;
    if (!start1 || !start2) return null;

    const effectiveEnd1 = end1 || start1;
    const effectiveEnd2 = end2 || start2;

    if (effectiveEnd1 < start2) return 'before';
    if (effectiveEnd2 < start1) return 'after';
    if (start1 === start2 && effectiveEnd1 === effectiveEnd2) return 'equals';
    if (start1 >= start2 && effectiveEnd1 <= effectiveEnd2) return 'during';
    if (start2 >= start1 && effectiveEnd2 <= effectiveEnd1) return 'contains';
    if (effectiveEnd1 === start2) return 'meets';
    if (effectiveEnd2 === start1) return 'met-by';
    if (start1 < start2 && effectiveEnd1 > start2 && effectiveEnd1 < effectiveEnd2) return 'overlaps';
    if (start2 < start1 && effectiveEnd2 > start1 && effectiveEnd2 < effectiveEnd1) return 'overlapped-by';
    if (start1 === start2 && effectiveEnd1 < effectiveEnd2) return 'starts';
    if (start1 === start2 && effectiveEnd1 > effectiveEnd2) return 'started-by';
    if (effectiveEnd1 === effectiveEnd2 && start1 > start2) return 'finishes';
    if (effectiveEnd1 === effectiveEnd2 && start1 < start2) return 'finished-by';

    return null;
}

function createTemporalTask(termKey, punctuation, truthValue, occurrenceTime, endTime = null) {
    const stamp = {
        creationTime: Date.now(),
        occurrenceTime,
        endTime
    };
    return new Task(parseTerm(termKey), punctuation, truthValue, stamp);
}

function createTemporalRelationshipTask(task1, task2, relationship) {
    const termKey = `(${task1.termKey} ${relationship} ${task2.termKey})`;
    return createTemporalTask(termKey, '.', {
        frequency: 1.0,
        confidence: config.temporal.TEMPORAL_CONFIDENCE
    }, Date.now());
}

function createTemporalSequenceTask(tasks) {
    if (tasks.length < 2) return null;
    const termKeys = tasks.map(task => task.termKey);
    const termKey = `(&/, ${termKeys.join(', ')})`;

    const initialTruth = {
        frequency: 1.0,
        confidence: 1.0
    };
    const {
        frequency,
        confidence
    } = tasks.reduce((acc, task) => ({
        frequency: acc.frequency * task.state.truthValue.frequency,
        confidence: acc.confidence * task.state.truthValue.confidence,
    }), initialTruth);

    const finalConfidence = confidence * Math.pow(config.temporal.SEQUENCE_CONFIDENCE_DECAY, tasks.length - 1);
    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) return null;

    return new Task(parsedTerm, '.', {
        frequency,
        confidence: finalConfidence
    }, {
        creationTime: Date.now()
    });
}

function createTemporalClusterAbstractions(clusters) {
    return clusters.map(cluster => new Task(
        parseTerm(`(temporal_cluster_${cluster.tasks.length}_events)`),
        '.', {
            frequency: config.temporal.TEMPORAL_CONFIDENCE,
            confidence: cluster.confidence
        }, {
            creationTime: Date.now(),
            occurrenceTime: cluster.startTime,
            endTime: cluster.endTime
        }
    ));
}

function _createImplicationTask(termKey, truthValue) {
    const parsedTerm = parseTerm(termKey);
    return parsedTerm ? new Task(parsedTerm, '.', truthValue) : null;
}

function inferTemporalImplications(task1, task2) {
    const relationship = determineTemporalRelationship(task1, task2);
    if (!relationship) return [];

    const implicationMap = {
        before: (t1, t2) => `((&&, ${t1.termKey}, ${t2.termKey}) ==> ${t2.termKey})`,
        meets: (t1, t2) => `((&&, ${t1.termKey}, ${t2.termKey}) ==> (temporal_continuity, ${t1.termKey}, ${t2.termKey}))`,
        overlaps: (t1, t2) => `(temporal_overlap, ${t1.termKey}, ${t2.termKey})`,
    };

    const truthValueMap = {
        before: {
            frequency: task1.state.truthValue.frequency * config.temporal.TEMPORAL_RELATIONSHIP_FREQUENCY,
            confidence: task1.state.truthValue.confidence * config.temporal.TEMPORAL_RELATIONSHIP_CONFIDENCE,
        },
        meets: {
            frequency: config.temporal.MEETS_IMPLICATION_FREQUENCY,
            confidence: config.temporal.MEETS_IMPLICATION_CONFIDENCE,
        },
        overlaps: {
            frequency: config.temporal.OVERLAP_IMPLICATION_FREQUENCY,
            confidence: config.temporal.OVERLAP_IMPLICATION_CONFIDENCE,
        },
    };

    let termKey;
    let truthValue;

    switch (relationship) {
        case 'before':
        case 'after':
            if (task1.punctuation !== '.') return [];
            termKey = implicationMap.before(task1, task2);
            truthValue = truthValueMap.before;
            break;
        case 'meets':
            termKey = implicationMap.meets(task1, task2);
            truthValue = truthValueMap.meets;
            break;
        case 'overlaps':
            termKey = implicationMap.overlaps(task1, task2);
            truthValue = truthValueMap.overlaps;
            break;
        default:
            return [];
    }

    const implicationTask = _createImplicationTask(termKey, truthValue);
    return implicationTask ? [implicationTask] : [];
}

function detectTemporalPatterns(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return [];

    const {
        intervals,
        stdDev,
        avgInterval
    } = calculateIntervalStats(temporalTasks);
    const patterns = [];

    if (intervals.length > 1 && stdDev / avgInterval < 0.2) {
        patterns.push({
            type: 'periodic',
            interval: avgInterval,
            confidence: 1.0 - (stdDev / avgInterval),
            tasks: temporalTasks,
        });
    }

    if (temporalTasks.length >= 3) {
        patterns.push({
            type: 'sequential',
            sequence: temporalTasks,
            confidence: config.temporal.PERIODIC_CONFIDENCE
        });
    }
    return patterns;
}

function detectTemporalCycles(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 4) return [];

    const taskGroups = groupTasksByTermKey(temporalTasks);
    return Object.entries(taskGroups)
        .filter(([, groupTasks]) => groupTasks.length >= 3)
        .map(([termKey, groupTasks]) => {
            const {
                stdDev,
                avgInterval
            } = calculateIntervalStats(groupTasks);
            if (stdDev / avgInterval < 0.1) {
                return {
                    termKey,
                    type: 'cyclic',
                    interval: avgInterval,
                    confidence: 1.0 - (stdDev / avgInterval),
                    tasks: groupTasks,
                };
            }
            return null;
        })
        .filter(Boolean);
}

function detectTemporalAnomalies(tasks, zScoreThreshold = 2) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 5) return [];

    const taskGroups = groupTasksByTermKey(temporalTasks);
    return Object.entries(taskGroups)
        .filter(([, groupTasks]) => groupTasks.length >= 3)
        .flatMap(([termKey, groupTasks]) => {
            const {
                intervals,
                avgInterval,
                stdDev
            } = calculateIntervalStats(groupTasks);
            if (stdDev === 0) return []; // Avoid division by zero

            return intervals
                .map((interval, i) => {
                    const zScore = (interval - avgInterval) / stdDev;
                    if (Math.abs(zScore) > zScoreThreshold) {
                        return {
                            termKey,
                            type: 'temporal_anomaly',
                            timestamp: groupTasks[i + 1].state.stamp.occurrenceTime,
                            expectedInterval: avgInterval,
                            actualInterval: interval,
                            severity: Math.min(1.0, Math.abs(zScore) / (zScoreThreshold + 1)),
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        });
}

function detectTemporalClusters(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return [];

    const {
        intervals,
        avgInterval,
        stdDev
    } = calculateIntervalStats(temporalTasks);
    const clusterThreshold = avgInterval - stdDev;
    const clusters = [];
    let clusterStart = 0;

    for (let i = 0; i < intervals.length; i++) {
        if (intervals[i] <= clusterThreshold) {
            let clusterEnd = i;
            while (clusterEnd < intervals.length && intervals[clusterEnd] <= clusterThreshold) {
                clusterEnd++;
            }
            if (clusterEnd - clusterStart >= 2) {
                const clusterTasks = temporalTasks.slice(clusterStart, clusterEnd + 1);
                clusters.push({
                    type: 'temporal_cluster',
                    tasks: clusterTasks,
                    startTime: clusterTasks[0].state.stamp.occurrenceTime,
                    endTime: clusterTasks[clusterTasks.length - 1].state.stamp.occurrenceTime,
                    confidence: 0.8,
                });
            }
            i = clusterEnd;
        }
        clusterStart = i + 1;
    }
    return clusters;
}

function predictFutureTasks(tasks, predictionTime) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    const taskGroups = groupTasksByTermKey(temporalTasks);
    return Object.values(taskGroups)
        .filter(groupTasks => groupTasks.length >= 2)
        .map(groupTasks => {
            const {
                avgInterval,
                stdDev
            } = calculateIntervalStats(groupTasks);
            const regularity = 1.0 / (1.0 + stdDev / avgInterval);
            const lastOccurrence = groupTasks[groupTasks.length - 1].state.stamp.occurrenceTime;
            const predictedOccurrence = lastOccurrence + avgInterval;
            if (Math.abs(predictedOccurrence - predictionTime) < avgInterval) {
                return createTemporalTask(
                    groupTasks[0].termKey,
                    '.', {
                        frequency: config.temporal.REGULARITY_BOOST * regularity,
                        confidence: config.temporal.PREDICTION_CONFIDENCE * regularity,
                    },
                    predictedOccurrence
                );
            }
            return null;
        })
        .filter(Boolean);
}

function advancedPredictFutureTasks(tasks, predictionHorizon) {
    const currentTime = Date.now();
    const predictionEndTime = currentTime + predictionHorizon;
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return [];

    const taskGroups = groupTasksByTermKey(temporalTasks);
    return Object.values(taskGroups)
        .filter(groupTasks => groupTasks.length >= 2)
        .flatMap(groupTasks => {
            const {
                intervals,
                avgInterval,
                stdDev
            } = calculateIntervalStats(groupTasks);
            const regularity = 1.0 / (1.0 + stdDev / avgInterval);
            let intervalTrend = 0;
            if (intervals.length > 1) {
                const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
                const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
                const firstAvg = firstHalf.reduce((s, i) => s + i, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((s, i) => s + i, 0) / secondHalf.length;
                intervalTrend = secondAvg - firstAvg;
            }
            const lastOccurrence = groupTasks[groupTasks.length - 1].state.stamp.occurrenceTime;
            let nextOccurrence = lastOccurrence + avgInterval + intervalTrend;
            const predictions = [];
            while (nextOccurrence <= predictionEndTime) {
                predictions.push(createTemporalTask(
                    groupTasks[0].termKey,
                    '.', {
                        frequency: groupTasks[groupTasks.length - 1].state.truthValue.frequency,
                        confidence: 0.5 * regularity,
                    },
                    nextOccurrence
                ));
                nextOccurrence += avgInterval + intervalTrend;
            }
            return predictions;
        });
}

function calculateTemporalPriority(task, currentTime) {
    if (!task.state.stamp.occurrenceTime) return 1.0;
    const endTime = task.state.stamp.endTime || task.state.stamp.occurrenceTime;
    const isOngoing = task.state.stamp.occurrenceTime <= currentTime && currentTime <= endTime;
    const ongoingBoost = isOngoing ? 1.5 : 1.0;
    const timeDifference = Math.abs(currentTime - task.state.stamp.occurrenceTime);
    const timeFactor = task.state.stamp.occurrenceTime > currentTime ? 1000 : 5000;
    return ongoingBoost * (1.0 / (1.0 + timeDifference / timeFactor));
}

function createTemporalSummary(tasks, startTime, endTime) {
    const tasksInWindow = findTasksInTimeWindow(tasks, startTime, endTime);
    if (!tasksInWindow.length) return null;
    const taskCount = tasksInWindow.length;
    const timeSpan = endTime - startTime;
    const density = taskCount / (timeSpan / 60000);
    return new Task(
        parseTerm(`(temporal_summary_${startTime}_to_${endTime})`),
        '.', {
            frequency: Math.min(1.0, density / 10),
            confidence: config.temporal.TEMPORAL_SUMMARY_CONFIDENCE,
        }, {
            creationTime: Date.now(),
            occurrenceTime: startTime,
            endTime
        }
    );
}

function createTemporalAbstraction(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return null;

    const {
        avgInterval,
        stdDev
    } = calculateIntervalStats(temporalTasks);
    const regularity = 1.0 / (1.0 + stdDev / avgInterval);
    const startTime = temporalTasks[0].state.stamp.occurrenceTime;
    const endTime = temporalTasks[temporalTasks.length - 1].state.stamp.endTime || temporalTasks[temporalTasks.length - 1].state.stamp.occurrenceTime;
    const frequency = temporalTasks.length / ((endTime - startTime) / 3600000);

    return new Task(
        parseTerm(`(temporal_abstraction_${temporalTasks.length}_events)`),
        '.', {
            frequency: Math.min(1.0, frequency / 10),
            confidence: regularity
        }, {
            creationTime: Date.now(),
            occurrenceTime: startTime,
            endTime
        }
    );
}

function calculateTemporalCoherence(tasks, timeWindow = 3600000) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return 1.0;

    const windows = temporalTasks.reduce((acc, task) => {
        const windowKey = Math.floor(task.state.stamp.occurrenceTime / timeWindow);
        acc[windowKey] = (acc[windowKey] || 0) + 1;
        return acc;
    }, {});

    const windowCounts = Object.values(windows);
    if (windowCounts.length < 2) return 1.0; // Not enough data for coherence calculation

    const avgCount = windowCounts.reduce((sum, count) => sum + count, 0) / windowCounts.length;
    if (avgCount === 0) return 1.0; // Avoid division by zero

    const variance = windowCounts.reduce((sum, count) => sum + (count - avgCount) ** 2, 0) / windowCounts.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = stdDev / avgCount;
    return 1.0 / (1.0 + coefficientOfVariation);
}

export {
    groupTasksByTermKey,
    calculateIntervalStats,
    findTasksInTimeWindow,
    determineTemporalRelationship,
    createTemporalTask,
    createTemporalRelationshipTask,
    createTemporalSequenceTask,
    createTemporalClusterAbstractions,
    inferTemporalImplications,
    detectTemporalPatterns,
    detectTemporalCycles,
    detectTemporalAnomalies,
    detectTemporalClusters,
    predictFutureTasks,
    advancedPredictFutureTasks,
    calculateTemporalPriority,
    createTemporalSummary,
    createTemporalAbstraction,
    calculateTemporalCoherence,
};
