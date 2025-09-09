const Task = require('../core/Task');
const {parseTerm} = require('../parser/narseseParser');
const config = require('../config');

function _groupTasksByTermKey(tasks) {
    const taskGroups = {};
    tasks.forEach(task => {
        if (!taskGroups[task.termKey]) {
            taskGroups[task.termKey] = [];
        }
        taskGroups[task.termKey].push(task);
    });
    return taskGroups;
}

function createTemporalTask(termKey, punctuation, truthValue, occurrenceTime, endTime = null) {
    const stamp = {
        creationTime: Date.now(),
        occurrenceTime: occurrenceTime,
        endTime: endTime
    };
    return new Task(parseTerm(termKey), punctuation, truthValue, stamp);
}

function calculateTemporalPriority(task, currentTime) {
    if (!task.state.stamp.occurrenceTime) {
        return 1.0;
    }

    const endTime = task.state.stamp.endTime || task.state.stamp.occurrenceTime;
    const isOngoing = task.state.stamp.occurrenceTime <= currentTime && currentTime <= endTime;
    const ongoingBoost = isOngoing ? 1.5 : 1.0;

    const timeDifference = Math.abs(currentTime - task.state.stamp.occurrenceTime);

    if (task.state.stamp.occurrenceTime > currentTime) {
        return ongoingBoost * 1.0 / (1.0 + timeDifference / 1000);
    } else {
        return ongoingBoost * 1.0 / (1.0 + timeDifference / 5000);
    }
}

function findTasksInTimeWindow(tasks, startTime, endTime) {
    return tasks.filter(task => {
        const occurrenceTime = task.state.stamp.occurrenceTime;
        if (!occurrenceTime) return false;

        const taskEndTime = task.state.stamp.endTime || occurrenceTime;

        return startTime <= taskEndTime && endTime >= occurrenceTime;
    });
}

function determineTemporalRelationship(task1, task2) {
    const time1 = task1.state.stamp.occurrenceTime;
    const time2 = task2.state.stamp.occurrenceTime;

    if (!time1 || !time2) return null;

    const end1 = task1.state.stamp.endTime || time1;
    const end2 = task2.state.stamp.endTime || time2;

    if (end1 < time2) return 'before';

    if (end2 < time1) return 'after';

    if (time1 >= time2 && end1 <= end2) return 'during';

    if (time2 >= time1 && end2 <= end1) return 'contains';

    if ((time1 <= time2 && end1 > time2) || (time2 <= time1 && end2 > time1)) return 'overlaps';

    if (end1 === time2) return 'meets';

    if (end2 === time1) return 'met-by';

    return null;
}

function predictFutureTasks(tasks, predictionTime) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    const taskGroups = _groupTasksByTermKey(temporalTasks);
    const predictions = [];

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 2) continue;

        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        let totalInterval = 0;
        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            const interval = groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime;
            intervals.push(interval);
            totalInterval += interval;
        }
        const avgInterval = totalInterval / (groupTasks.length - 1);

        let variance = 0;
        for (const interval of intervals) {
            variance += Math.pow(interval - avgInterval, 2);
        }
        variance /= intervals.length;
        const stdDev = Math.sqrt(variance);

        const regularity = 1.0 / (1.0 + stdDev / avgInterval);

        const lastOccurrence = groupTasks[groupTasks.length - 1].state.stamp.occurrenceTime;
        const predictedOccurrence = lastOccurrence + avgInterval;

        if (Math.abs(predictedOccurrence - predictionTime) < avgInterval) {
            const predictionTask = createTemporalTask(
                termKey,
                '.',
                {
                    frequency: config.temporal.REGULARITY_BOOST * regularity,
                    confidence: config.temporal.PREDICTION_CONFIDENCE * regularity
                },
                predictedOccurrence
            );
            predictions.push(predictionTask);
        }
    }

    return predictions;
}

function createTemporalRelationshipTask(task1, task2, relationship) {
    const termKey = `(${task1.termKey} ${relationship} ${task2.termKey})`;
    return createTemporalTask(termKey, '.', {
        frequency: 1.0,
        confidence: config.temporal.TEMPORAL_CONFIDENCE
    }, Date.now());
}

function _createImplicationTask(termKey, truthValue) {
    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) {
        return null;
    }
    return new Task(parsedTerm, '.', truthValue);
}

function inferTemporalImplications(task1, task2) {
    const relationship = determineTemporalRelationship(task1, task2);
    if (!relationship) return [];

    let implicationTask = null;
    switch (relationship) {
        case 'before':
        case 'after':
            if (task1.punctuation === '.') {
                const termKey = `((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`;
                implicationTask = _createImplicationTask(termKey, {
                    frequency: task1.state.truthValue.frequency * config.temporal.TEMPORAL_RELATIONSHIP_FREQUENCY,
                    confidence: task1.state.truthValue.confidence * config.temporal.TEMPORAL_RELATIONSHIP_CONFIDENCE
                });
            }
            break;
        case 'meets':
            const termKey = `((&&, ${task1.termKey}, ${task2.termKey}) ==> (temporal_continuity, ${task1.termKey}, ${task2.termKey}))`;
            implicationTask = _createImplicationTask(termKey, {
                frequency: config.temporal.MEETS_IMPLICATION_FREQUENCY,
                confidence: config.temporal.MEETS_IMPLICATION_CONFIDENCE
            });
            break;
        case 'overlaps':
            const overlapTermKey = `(temporal_overlap, ${task1.termKey}, ${task2.termKey})`;
            implicationTask = _createImplicationTask(overlapTermKey, {
                frequency: config.temporal.OVERLAP_IMPLICATION_FREQUENCY,
                confidence: config.temporal.OVERLAP_IMPLICATION_CONFIDENCE
            });
            break;
    }

    return implicationTask ? [implicationTask] : [];
}

function createTemporalSequenceTask(tasks) {
    if (tasks.length < 2) return null;

    const termKeys = tasks.map(task => task.termKey);
    const termKey = `(&/, ${termKeys.join(', ')})`;

    let frequency = 1.0;
    let confidence = 1.0;
    for (const task of tasks) {
        frequency *= task.state.truthValue.frequency;
        confidence *= task.state.truthValue.confidence;
    }

    confidence *= Math.pow(config.temporal.SEQUENCE_CONFIDENCE_DECAY, tasks.length - 1);

    return new Task(parseTerm(termKey), '.', {
        frequency,
        confidence
    }, {
        creationTime: Date.now()
    });
}

function detectTemporalPatterns(tasks) {
    const patterns = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 3) return patterns;

    temporalTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

    const intervals = [];
    for (let i = 1; i < temporalTasks.length; i++) {
        intervals.push(temporalTasks[i].state.stamp.occurrenceTime - temporalTasks[i - 1].state.stamp.occurrenceTime);
    }

    if (intervals.length > 1) {
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev / avgInterval < 0.2) {
            patterns.push({
                type: 'periodic',
                interval: avgInterval,
                confidence: 1.0 - (stdDev / avgInterval),
                tasks: temporalTasks
            });
        }
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
    const cycles = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 4) return cycles;

    const taskGroups = _groupTasksByTermKey(temporalTasks);

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 3) continue;

        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            intervals.push(groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime);
        }

        if (intervals.length > 2) {
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev / avgInterval < 0.1) {
                cycles.push({
                    termKey: termKey,
                    type: 'cyclic',
                    interval: avgInterval,
                    confidence: 1.0 - (stdDev / avgInterval),
                    tasks: groupTasks
                });
            }
        }
    }

    return cycles;
}

function createTemporalAbstraction(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return null;

    temporalTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

    const startTime = temporalTasks[0].state.stamp.occurrenceTime;
    const endTime = temporalTasks[temporalTasks.length - 1].state.stamp.occurrenceTime ||
        temporalTasks[temporalTasks.length - 1].state.stamp.occurrenceTime;

    const frequency = temporalTasks.length / ((endTime - startTime) / (1000 * 60 * 60));

    const intervals = [];
    for (let i = 1; i < temporalTasks.length; i++) {
        intervals.push(temporalTasks[i].state.stamp.occurrenceTime - temporalTasks[i - 1].state.stamp.occurrenceTime);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const regularity = 1.0 / (1.0 + stdDev / avgInterval);

    const termKey = `(temporal_abstraction_${temporalTasks.length}_events)`;

    return new Task(parseTerm(termKey), '.', {
        frequency: Math.min(1.0, frequency / 10),
        confidence: regularity
    }, {
        creationTime: Date.now(),
        occurrenceTime: startTime,
        endTime: endTime
    });
}

function detectTemporalAnomalies(tasks) {
    const anomalies = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 5) return anomalies;

    const taskGroups = _groupTasksByTermKey(temporalTasks);

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 3) continue;

        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            intervals.push(groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime);
        }

        const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        for (let i = 0; i < intervals.length; i++) {
            if (Math.abs(intervals[i] - mean) > 2 * stdDev) {
                anomalies.push({
                    termKey: termKey,
                    type: 'temporal_anomaly',
                    timestamp: groupTasks[i + 1].state.stamp.occurrenceTime,
                    expectedInterval: mean,
                    actualInterval: intervals[i],
                    severity: Math.min(1.0, Math.abs(intervals[i] - mean) / (3 * stdDev))
                });
            }
        }
    }

    return anomalies;
}

function advancedPredictFutureTasks(tasks, predictionHorizon) {
    const predictions = [];
    const currentTime = Date.now();
    const predictionEndTime = currentTime + predictionHorizon;

    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return predictions;

    const taskGroups = _groupTasksByTermKey(temporalTasks);

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 2) continue;

        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            intervals.push(groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime);
        }

        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

        let intervalTrend = 0;
        if (intervals.length > 1) {
            const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
            const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
            const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;
            intervalTrend = secondAvg - firstAvg;
        }

        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        const regularity = 1.0 / (1.0 + stdDev / avgInterval);

        const lastOccurrence = groupTasks[groupTasks.length - 1].state.stamp.occurrenceTime;
        let nextOccurrence = lastOccurrence + avgInterval + intervalTrend;

        while (nextOccurrence <= predictionEndTime) {
            const predictionTask = createTemporalTask(
                termKey,
                '.',
                {
                    frequency: groupTasks[groupTasks.length - 1].state.truthValue.frequency,
                    confidence: 0.5 * regularity
                },
                nextOccurrence
            );
            predictions.push(predictionTask);

            nextOccurrence += avgInterval + intervalTrend;
        }
    }

    return predictions;
}

function createTemporalSummary(tasks, startTime, endTime) {
    const tasksInWindow = findTasksInTimeWindow(tasks, startTime, endTime);
    if (tasksInWindow.length === 0) return null;

    const taskCount = tasksInWindow.length;
    const uniqueTerms = new Set(tasksInWindow.map(task => task.termKey)).size;

    const timeSpan = endTime - startTime;
    const density = taskCount / (timeSpan / (1000 * 60));

    const termCounts = {};
    tasksInWindow.forEach(task => {
        termCounts[task.termKey] = (termCounts[task.termKey] || 0) + 1;
    });

    const mostFrequentTerms = Object.entries(termCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([termKey, count]) => ({termKey, count}));

    const termKey = `(temporal_summary_${startTime}_to_${endTime})`;

    return new Task(parseTerm(termKey), '.', {
        frequency: Math.min(1.0, density / 10),
        confidence: config.temporal.TEMPORAL_SUMMARY_CONFIDENCE
    }, {
        creationTime: Date.now(),
        occurrenceTime: startTime,
        endTime: endTime
    });
}

function calculateTemporalCoherence(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return 1.0;

    const timeWindow = 60 * 60 * 1000;
    const windows = {};

    temporalTasks.forEach(task => {
        const windowKey = Math.floor(task.state.stamp.occurrenceTime / timeWindow);
        if (!windows[windowKey]) {
            windows[windowKey] = [];
        }
        windows[windowKey].push(task);
    });

    const windowCounts = Object.values(windows).map(window => window.length);
    const avgCount = windowCounts.reduce((sum, count) => sum + count, 0) / windowCounts.length;

    let variance = 0;
    windowCounts.forEach(count => {
        variance += Math.pow(count - avgCount, 2);
    });
    variance /= windowCounts.length;

    const stdDev = Math.sqrt(variance);

    return 1.0 / (1.0 + stdDev / avgCount);
}

function detectTemporalClusters(tasks) {
    const clusters = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 3) return clusters;

    temporalTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

    const intervals = [];
    for (let i = 1; i < temporalTasks.length; i++) {
        intervals.push(temporalTasks[i].state.stamp.occurrenceTime - temporalTasks[i - 1].state.stamp.occurrenceTime);
    }

    const meanInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    let variance = 0;
    intervals.forEach(interval => {
        variance += Math.pow(interval - meanInterval, 2);
    });
    variance /= intervals.length;
    const stdDev = Math.sqrt(variance);

    const clusterThreshold = meanInterval - stdDev;

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
                    confidence: 0.8
                });
            }

            clusterStart = clusterEnd + 1;
            i = clusterEnd;
        } else {
            clusterStart = i + 1;
        }
    }

    return clusters;
}

function createTemporalClusterAbstractions(clusters) {
    const abstractions = [];

    clusters.forEach(cluster => {
        const termKey = `(temporal_cluster_${cluster.tasks.length}_events)`;
        const abstractionTask = new Task(
            parseTerm(termKey),
            '.',
            {
                frequency: config.temporal.TEMPORAL_CONFIDENCE,
                confidence: cluster.confidence
            },
            {
                creationTime: Date.now(),
                occurrenceTime: cluster.startTime,
                endTime: cluster.endTime
            }
        );
        abstractions.push(abstractionTask);
    });

    return abstractions;
}

module.exports = {
    createTemporalTask,
    calculateTemporalPriority,
    findTasksInTimeWindow,
    predictFutureTasks,
    determineTemporalRelationship,
    createTemporalRelationshipTask,
    inferTemporalImplications,
    createTemporalSequenceTask,
    detectTemporalPatterns,
    detectTemporalCycles,
    createTemporalAbstraction,
    detectTemporalAnomalies,
    advancedPredictFutureTasks,
    createTemporalSummary,
    calculateTemporalCoherence,
    detectTemporalClusters,
    createTemporalClusterAbstractions
};