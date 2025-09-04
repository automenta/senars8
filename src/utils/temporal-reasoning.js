const Task = require('../core/Task');
const {parseTerm} = require('../parser/TermParser');

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

    const taskGroups = {};
    temporalTasks.forEach(task => {
        if (!taskGroups[task.termKey]) {
            taskGroups[task.termKey] = [];
        }
        taskGroups[task.termKey].push(task);
    });

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
    return new Task(parseTerm(termKey), '.', {
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
                const implication = new Task(
                    parseTerm(`((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`),
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
            if (task1.punctuation === '.') {
                const implication = new Task(
                    parseTerm(`((&&, ${task1.termKey}, ${task2.termKey}) ==> ${task2.termKey})`),
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
            const meetsImplication = new Task(
                parseTerm(`((&&, ${task1.termKey}, ${task2.termKey}) ==> (temporal_continuity, ${task1.termKey}, ${task2.termKey}))`),
                '.',
                {
                    frequency: 0.9,
                    confidence: 0.8
                }
            );
            implications.push(meetsImplication);
            break;

        case 'overlaps':
            const overlapImplication = new Task(
                parseTerm(`(temporal_overlap, ${task1.termKey}, ${task2.termKey})`),
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