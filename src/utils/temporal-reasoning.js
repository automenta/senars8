const Task = require('../core/Task');

/**
 * Creates a temporal task with occurrence time.
 * @param {string} termKey - The term key.
 * @param {string} punctuation - The punctuation ('.', '!', or '?').
 * @param {object} truthValue - The truth value.
 * @param {number} occurrenceTime - The time when the event occurs.
 * @returns {Task} A new task with temporal information.
 */
function createTemporalTask(termKey, punctuation, truthValue, occurrenceTime) {
    const stamp = {
        creationTime: Date.now(),
        occurrenceTime: occurrenceTime
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

    const timeDifference = Math.abs(currentTime - task.state.stamp.occurrenceTime);

    // Tasks closer to current time have higher temporal priority
    // Tasks in the future have slightly higher priority than past tasks
    if (task.state.stamp.occurrenceTime > currentTime) {
        // Future events
        return 1.0 / (1.0 + timeDifference / 1000);
    } else {
        // Past events
        return 1.0 / (1.0 + timeDifference / 5000);
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
        return occurrenceTime && occurrenceTime >= startTime && occurrenceTime <= endTime;
    });
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

        // Calculate average interval
        let totalInterval = 0;
        for (let i = 1; i < groupTasks.length; i++) {
            totalInterval += groupTasks[i].state.stamp.occurrenceTime - groupTasks[i - 1].state.stamp.occurrenceTime;
        }
        const avgInterval = totalInterval / (groupTasks.length - 1);

        // Predict next occurrence
        const lastOccurrence = groupTasks[groupTasks.length - 1].state.stamp.occurrenceTime;
        const predictedOccurrence = lastOccurrence + avgInterval;

        // If prediction is close to requested time, create a prediction task
        if (Math.abs(predictedOccurrence - predictionTime) < avgInterval) {
            const predictionTask = createTemporalTask(
                termKey,
                '.', // Belief prediction
                {
                    frequency: 0.7, // Lower confidence for predictions
                    confidence: 0.5
                },
                predictedOccurrence
            );
            predictions.push(predictionTask);
        }
    }

    return predictions;
}

module.exports = {
    createTemporalTask,
    calculateTemporalPriority,
    findTasksInTimeWindow,
    predictFutureTasks
};