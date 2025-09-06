const Task = require('../core/Task');
const {parseTerm} = require('../parser/narseseParser');

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
                    frequency: 0.7 * regularity,
                    confidence: 0.5 * regularity
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
    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) {
        return null; // Return null if parsing fails
    }
    return new Task(parsedTerm, '.', {
        frequency: 1.0,
        confidence: 0.9
    }, {
        creationTime: Date.now()
    });
}

function inferTemporalImplications(task1, task2) {
    const implications = [];

    const relationship = determineTemporalRelationship(task1, task2);
    if (!relationship) return implications;

    switch (relationship) {
        case 'before':
            if (task1.punctuation === '.') {
                const termKey = `((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`;
                const parsedTerm = parseTerm(termKey);
                if (parsedTerm) {
                    const implication = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: task1.state.truthValue.frequency * 0.8,
                            confidence: task1.state.truthValue.confidence * 0.7
                        }
                    );
                    implications.push(implication);
                }
            }
            break;

        case 'after':
            if (task1.punctuation === '.') {
                const termKey = `((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`;
                const parsedTerm = parseTerm(termKey);
                if (parsedTerm) {
                    const implication = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: task1.state.truthValue.frequency * 0.8,
                            confidence: task1.state.truthValue.confidence * 0.7
                        }
                    );
                    implications.push(implication);
                }
            }
            break;

        case 'meets':
            const termKey = `((&&, ${task1.termKey}, ${task2.termKey}) ==> (temporal_continuity, ${task1.termKey}, ${task2.termKey}))`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const meetsImplication = new Task(
                    parsedTerm,
                    '.',
                    {
                        frequency: 0.9,
                        confidence: 0.8
                    }
                );
                implications.push(meetsImplication);
            }
            break;

        case 'overlaps':
            const overlapTermKey = `(temporal_overlap, ${task1.termKey}, ${task2.termKey})`;
            const overlapParsedTerm = parseTerm(overlapTermKey);
            if (overlapParsedTerm) {
                const overlapImplication = new Task(
                    overlapParsedTerm,
                    '.',
                    {
                        frequency: 0.8,
                        confidence: 0.7
                    }
                );
                implications.push(overlapImplication);
            }
            break;
    }

    return implications;
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

    confidence *= Math.pow(0.9, tasks.length - 1);

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
            confidence: 0.8
        });
    }

    return patterns;
}

/**
 * Detects temporal cycles in a sequence of tasks.
 * @param {Array} tasks - Array of temporal tasks.
 * @returns {Array} Array of detected cycles.
 */
function detectTemporalCycles(tasks) {
    const cycles = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 4) return cycles;

    const taskGroups = _groupTasksByTermKey(temporalTasks);

    // For each group, check for cyclic patterns
    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 3) continue;

        // Sort by occurrence time
        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            intervals.push(groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime);
        }

        // Check for regular intervals (potential cycle)
        if (intervals.length > 2) {
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            // If variance is low, we likely have a cycle
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

/**
 * Creates a temporal abstraction of a sequence of tasks.
 * @param {Array} tasks - Array of temporal tasks.
 * @returns {object|null} Temporal abstraction or null if not enough tasks.
 */
function createTemporalAbstraction(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return null;

    // Sort by occurrence time
    temporalTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

    // Calculate overall time span
    const startTime = temporalTasks[0].state.stamp.occurrenceTime;
    const endTime = temporalTasks[temporalTasks.length - 1].state.stamp.occurrenceTime ||
        temporalTasks[temporalTasks.length - 1].state.stamp.occurrenceTime;

    // Calculate frequency of events
    const frequency = temporalTasks.length / ((endTime - startTime) / (1000 * 60 * 60)); // Events per hour

    // Calculate regularity
    const intervals = [];
    for (let i = 1; i < temporalTasks.length; i++) {
        intervals.push(temporalTasks[i].state.stamp.occurrenceTime - temporalTasks[i - 1].state.stamp.occurrenceTime);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const regularity = 1.0 / (1.0 + stdDev / avgInterval);

    // Create abstraction term
    const termKey = `(temporal_abstraction_${temporalTasks.length}_events)`;

    return new Task(parseTerm(termKey), '.', {
        frequency: Math.min(1.0, frequency / 10), // Normalize frequency
        confidence: regularity
    }, {
        creationTime: Date.now(),
        occurrenceTime: startTime,
        endTime: endTime
    });
}

/**
 * Detects temporal anomalies in a sequence of tasks.
 * @param {Array} tasks - Array of temporal tasks.
 * @returns {Array} Array of detected anomalies.
 */
function detectTemporalAnomalies(tasks) {
    const anomalies = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 5) return anomalies;

    const taskGroups = _groupTasksByTermKey(temporalTasks);

    // For each group, check for anomalies
    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 3) continue;

        // Sort by occurrence time
        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            intervals.push(groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime);
        }

        // Calculate mean and standard deviation
        const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // Detect anomalies (intervals more than 2 standard deviations from mean)
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

/**
 * Predicts future task occurrences based on temporal patterns.
 * @param {Array} tasks - Array of temporal tasks.
 * @param {number} predictionHorizon - Time horizon for predictions (in milliseconds).
 * @returns {Array} Array of predicted tasks.
 */
function advancedPredictFutureTasks(tasks, predictionHorizon) {
    const predictions = [];
    const currentTime = Date.now();
    const predictionEndTime = currentTime + predictionHorizon;

    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return predictions;

    const taskGroups = _groupTasksByTermKey(temporalTasks);

    // For each group, make predictions
    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 2) continue;

        // Sort by occurrence time
        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            intervals.push(groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime);
        }

        // Calculate average interval and trend
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

        // Calculate trend in intervals
        let intervalTrend = 0;
        if (intervals.length > 1) {
            const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
            const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
            const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;
            intervalTrend = secondAvg - firstAvg;
        }

        // Calculate confidence based on regularity
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        const regularity = 1.0 / (1.0 + stdDev / avgInterval);

        // Predict future occurrences
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

            // Calculate next occurrence
            nextOccurrence += avgInterval + intervalTrend;
        }
    }

    return predictions;
}

/**
 * Creates a temporal summary of tasks within a time window.
 * @param {Array} tasks - Array of temporal tasks.
 * @param {number} startTime - Start time of the window.
 * @param {number} endTime - End time of the window.
 * @returns {object|null} Temporal summary or null if no tasks in window.
 */
function createTemporalSummary(tasks, startTime, endTime) {
    const tasksInWindow = findTasksInTimeWindow(tasks, startTime, endTime);
    if (tasksInWindow.length === 0) return null;

    // Calculate statistics
    const taskCount = tasksInWindow.length;
    const uniqueTerms = new Set(tasksInWindow.map(task => task.termKey)).size;

    // Calculate density (tasks per unit time)
    const timeSpan = endTime - startTime;
    const density = taskCount / (timeSpan / (1000 * 60)); // Tasks per minute

    // Calculate most frequent terms
    const termCounts = {};
    tasksInWindow.forEach(task => {
        termCounts[task.termKey] = (termCounts[task.termKey] || 0) + 1;
    });

    const mostFrequentTerms = Object.entries(termCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([termKey, count]) => ({termKey, count}));

    // Create summary term
    const termKey = `(temporal_summary_${startTime}_to_${endTime})`;

    return new Task(parseTerm(termKey), '.', {
        frequency: Math.min(1.0, density / 10), // Normalize density
        confidence: 0.9
    }, {
        creationTime: Date.now(),
        occurrenceTime: startTime,
        endTime: endTime
    });
}

/**
 * Calculates temporal coherence between tasks
 * @param {Array} tasks - Array of temporal tasks
 * @returns {number} Coherence score between 0 and 1
 */
function calculateTemporalCoherence(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return 1.0;

    // Group tasks by time windows
    const timeWindow = 60 * 60 * 1000; // 1 hour windows
    const windows = {};

    temporalTasks.forEach(task => {
        const windowKey = Math.floor(task.state.stamp.occurrenceTime / timeWindow);
        if (!windows[windowKey]) {
            windows[windowKey] = [];
        }
        windows[windowKey].push(task);
    });

    // Calculate coherence as the regularity of task distribution across windows
    const windowCounts = Object.values(windows).map(window => window.length);
    const avgCount = windowCounts.reduce((sum, count) => sum + count, 0) / windowCounts.length;

    let variance = 0;
    windowCounts.forEach(count => {
        variance += Math.pow(count - avgCount, 2);
    });
    variance /= windowCounts.length;

    const stdDev = Math.sqrt(variance);

    // Coherence is inversely related to variance
    return 1.0 / (1.0 + stdDev / avgCount);
}

/**
 * Detects temporal clustering of tasks
 * @param {Array} tasks - Array of temporal tasks
 * @returns {Array} Array of detected clusters
 */
function detectTemporalClusters(tasks) {
    const clusters = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 3) return clusters;

    // Sort by occurrence time
    temporalTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

    // Calculate intervals
    const intervals = [];
    for (let i = 1; i < temporalTasks.length; i++) {
        intervals.push(temporalTasks[i].state.stamp.occurrenceTime - temporalTasks[i - 1].state.stamp.occurrenceTime);
    }

    // Calculate mean and std deviation of intervals
    const meanInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    let variance = 0;
    intervals.forEach(interval => {
        variance += Math.pow(interval - meanInterval, 2);
    });
    variance /= intervals.length;
    const stdDev = Math.sqrt(variance);

    // Find clusters (intervals significantly shorter than average)
    const clusterThreshold = meanInterval - stdDev;

    let clusterStart = 0;
    for (let i = 0; i < intervals.length; i++) {
        if (intervals[i] <= clusterThreshold) {
            // Start of a potential cluster
            let clusterEnd = i;
            while (clusterEnd < intervals.length && intervals[clusterEnd] <= clusterThreshold) {
                clusterEnd++;
            }

            // Create cluster if it contains at least 3 tasks
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

/**
 * Creates temporal abstraction tasks for detected clusters
 * @param {Array} clusters - Array of detected clusters
 * @returns {Array} Array of abstraction tasks
 */
function createTemporalClusterAbstractions(clusters) {
    const abstractions = [];

    clusters.forEach(cluster => {
        const termKey = `(temporal_cluster_${cluster.tasks.length}_events)`;
        const abstractionTask = new Task(
            parseTerm(termKey),
            '.',
            {
                frequency: 0.9,
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