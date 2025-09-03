const Task = require('../core/Task');

/**
 * Creates a temporal task with occurrence time.
 * @param {string} termKey - The term key.
 * @param {string} punctuation - The punctuation ('.', '!', or '?').
 * @param {object} truthValue - The truth value.
 * @param {number} occurrenceTime - The time when the event occurs.
 * @param {number} [endTime] - The end time for events with duration.
 * @returns {Task} A new task with temporal information.
 */
function createTemporalTask(termKey, punctuation, truthValue, occurrenceTime, endTime = null) {
    const stamp = {
        creationTime: Date.now(),
        occurrenceTime: occurrenceTime,
        endTime: endTime
    };
    return new Task(termKey, punctuation, truthValue, stamp);
}

/**
 * Calculates temporal priority based on occurrence time.
 * @param {Task} task - The task to calculate priority for.
 * @param {number} currentTime - The current time.
 * @returns {number} Temporal priority factor.
 */
function calculateTemporalPriority(task, currentTime) {
    if (!task.state.stamp.occurrenceTime) {
        // Non-temporal tasks get neutral temporal priority
        return 1.0;
    }

    // If the task has an end time, consider its duration
    const endTime = task.state.stamp.endTime || task.state.stamp.occurrenceTime;
    const duration = endTime - task.state.stamp.occurrenceTime;
    
    // For ongoing events, give them a boost
    const isOngoing = task.state.stamp.occurrenceTime <= currentTime && currentTime <= endTime;
    const ongoingBoost = isOngoing ? 1.5 : 1.0;

    const timeDifference = Math.abs(currentTime - task.state.stamp.occurrenceTime);

    // Tasks closer to current time have higher temporal priority
    // Tasks in the future have slightly higher priority than past tasks
    if (task.state.stamp.occurrenceTime > currentTime) {
        // Future events
        return ongoingBoost * 1.0 / (1.0 + timeDifference / 1000);
    } else {
        // Past events
        return ongoingBoost * 1.0 / (1.0 + timeDifference / 5000);
    }
}

/**
 * Finds tasks that are relevant to a specific time window.
 * @param {Task[]} tasks - Array of tasks to filter.
 * @param {number} startTime - Start of the time window.
 * @param {number} endTime - End of the time window.
 * @returns {Task[]} Tasks that occur within the time window.
 */
function findTasksInTimeWindow(tasks, startTime, endTime) {
    return tasks.filter(task => {
        const occurrenceTime = task.state.stamp.occurrenceTime;
        if (!occurrenceTime) return false;
        
        // If task has an end time, check for overlap
        const taskEndTime = task.state.stamp.endTime || occurrenceTime;
        
        // Check for overlap between [startTime, endTime] and [occurrenceTime, taskEndTime]
        return startTime <= taskEndTime && endTime >= occurrenceTime;
    });
}

/**
 * Determines temporal relationship between two tasks.
 * @param {Task} task1 - First task.
 * @param {Task} task2 - Second task.
 * @returns {string|null} Temporal relationship or null if undetermined.
 */
function determineTemporalRelationship(task1, task2) {
    const time1 = task1.state.stamp.occurrenceTime;
    const time2 = task2.state.stamp.occurrenceTime;
    
    if (!time1 || !time2) return null;
    
    const end1 = task1.state.stamp.endTime || time1;
    const end2 = task2.state.stamp.endTime || time2;
    
    // Before relationship
    if (end1 < time2) return 'before';
    
    // After relationship
    if (end2 < time1) return 'after';
    
    // During relationship (task1 occurs during task2)
    if (time1 >= time2 && end1 <= end2) return 'during';
    
    // Contains relationship (task2 occurs during task1)
    if (time2 >= time1 && end2 <= end1) return 'contains';
    
    // Overlaps relationship
    if ((time1 <= time2 && end1 > time2) || (time2 <= time1 && end2 > time1)) return 'overlaps';
    
    // Meets relationship (task1 ends when task2 starts)
    if (end1 === time2) return 'meets';
    
    // Met-by relationship (task2 ends when task1 starts)
    if (end2 === time1) return 'met-by';
    
    return null;
}

/**
 * Predicts future tasks based on temporal patterns.
 * @param {Task[]} tasks - Array of existing tasks.
 * @param {number} predictionTime - Time for which to make predictions.
 * @returns {Task[]} Predicted tasks.
 */
function predictFutureTasks(tasks, predictionTime) {
    // Simple prediction: find recurring patterns
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    // Group tasks by term key
    const taskGroups = {};
    temporalTasks.forEach(task => {
        if (!taskGroups[task.termKey]) {
            taskGroups[task.termKey] = [];
        }
        taskGroups[task.termKey].push(task);
    });

    const predictions = [];

    // For each group, check if there's a temporal pattern
    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 2) continue;

        // Sort by occurrence time
        groupTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);

        // Calculate average interval and variance
        let totalInterval = 0;
        const intervals = [];
        for (let i = 1; i < groupTasks.length; i++) {
            const interval = groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime;
            intervals.push(interval);
            totalInterval += interval;
        }
        const avgInterval = totalInterval / (groupTasks.length - 1);
        
        // Calculate variance
        let variance = 0;
        for (const interval of intervals) {
            variance += Math.pow(interval - avgInterval, 2);
        }
        variance /= intervals.length;
        const stdDev = Math.sqrt(variance);
        
        // Regularity measure (lower std dev means more regular)
        const regularity = 1.0 / (1.0 + stdDev / avgInterval);

        // Predict next occurrence
        const lastOccurrence = groupTasks[groupTasks.length - 1].state.stamp.occurrenceTime;
        const predictedOccurrence = lastOccurrence + avgInterval;

        // If prediction is close to requested time, create a prediction task
        if (Math.abs(predictedOccurrence - predictionTime) < avgInterval) {
            const predictionTask = createTemporalTask(
                termKey,
                '.', // Belief prediction
                {
                    frequency: 0.7 * regularity, // Lower confidence for predictions, adjusted by regularity
                    confidence: 0.5 * regularity
                },
                predictedOccurrence
            );
            predictions.push(predictionTask);
        }
    }

    return predictions;
}

/**
 * Creates a temporal relationship task.
 * @param {Task} task1 - First task.
 * @param {Task} task2 - Second task.
 * @param {string} relationship - The temporal relationship.
 * @returns {Task} A new task representing the temporal relationship.
 */
function createTemporalRelationshipTask(task1, task2, relationship) {
    const termKey = `(${task1.termKey} ${relationship} ${task2.termKey})`;
    return new Task(termKey, '.', {
        frequency: 1.0,
        confidence: 0.9
    }, {
        creationTime: Date.now()
    });
}

/**
 * Infers temporal implications from task relationships.
 * @param {Task} task1 - First task.
 * @param {Task} task2 - Second task.
 * @returns {Task[]} Array of tasks representing temporal implications.
 */
function inferTemporalImplications(task1, task2) {
    const implications = [];
    
    // Get temporal relationship
    const relationship = determineTemporalRelationship(task1, task2);
    if (!relationship) return implications;
    
    // Create implications based on temporal relationships
    switch (relationship) {
        case 'before':
            // If A before B and A is true, then B will be true in the future
            if (task1.punctuation === '.') {
                const implication = new Task(
                    `((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`,
                    '.',
                    {
                        frequency: task1.state.truthValue.frequency * 0.8,
                        confidence: task1.state.truthValue.confidence * 0.7
                    }
                );
                implications.push(implication);
            }
            break;
            
        case 'after':
            // If A after B and A is true, then B was true in the past
            if (task1.punctuation === '.') {
                const implication = new Task(
                    `((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`,
                    '.',
                    {
                        frequency: task1.state.truthValue.frequency * 0.8,
                        confidence: task1.state.truthValue.confidence * 0.7
                    }
                );
                implications.push(implication);
            }
            break;
            
        case 'meets':
            // If A meets B, there's a direct temporal connection
            const meetsImplication = new Task(
                `((&&, ${task1.termKey}, ${task2.termKey}) ==> (temporal_continuity, ${task1.termKey}, ${task2.termKey}))`,
                '.',
                {
                    frequency: 0.9,
                    confidence: 0.8
                }
            );
            implications.push(meetsImplication);
            break;
            
        case 'overlaps':
            // If A overlaps B, there's a temporal intersection
            const overlapImplication = new Task(
                `(temporal_overlap, ${task1.termKey}, ${task2.termKey})`,
                '.',
                {
                    frequency: 0.8,
                    confidence: 0.7
                }
            );
            implications.push(overlapImplication);
            break;
    }
    
    return implications;
}

/**
 * Creates a temporal sequence task representing a sequence of events.
 * @param {Task[]} tasks - Array of tasks in temporal order.
 * @returns {Task} A new task representing the temporal sequence.
 */
function createTemporalSequenceTask(tasks) {
    if (tasks.length < 2) return null;
    
    // Create a sequence term key
    const termKeys = tasks.map(task => task.termKey);
    const termKey = `(&/, ${termKeys.join(', ')})`;
    
    // Calculate aggregate truth value
    let frequency = 1.0;
    let confidence = 1.0;
    for (const task of tasks) {
        frequency *= task.state.truthValue.frequency;
        confidence *= task.state.truthValue.confidence;
    }
    
    // Reduce confidence for longer sequences
    confidence *= Math.pow(0.9, tasks.length - 1);
    
    return new Task(termKey, '.', {
        frequency,
        confidence
    }, {
        creationTime: Date.now()
    });
}

/**
 * Detects temporal patterns in a set of tasks.
 * @param {Task[]} tasks - Array of temporal tasks.
 * @returns {object[]} Array of detected temporal patterns.
 */
function detectTemporalPatterns(tasks) {
    const patterns = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    
    if (temporalTasks.length < 3) return patterns;
    
    // Sort by occurrence time
    temporalTasks.sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);
    
    // Look for common temporal patterns
    // 1. Regular intervals (periodic patterns)
    const intervals = [];
    for (let i = 1; i < temporalTasks.length; i++) {
        intervals.push(temporalTasks[i].state.stamp.occurrenceTime - temporalTasks[i-1].state.stamp.occurrenceTime);
    }
    
    // Check if intervals are similar (periodic pattern)
    if (intervals.length > 1) {
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        // If standard deviation is small compared to average, it's periodic
        if (stdDev / avgInterval < 0.2) {
            patterns.push({
                type: 'periodic',
                interval: avgInterval,
                confidence: 1.0 - (stdDev / avgInterval),
                tasks: temporalTasks
            });
        }
    }
    
    // 2. Sequential patterns (A followed by B followed by C)
    if (temporalTasks.length >= 3) {
        patterns.push({
            type: 'sequential',
            sequence: temporalTasks,
            confidence: 0.8
        });
    }
    
    return patterns;
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
    detectTemporalPatterns
};