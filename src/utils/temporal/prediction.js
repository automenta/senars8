const { groupTasksByTermKey, calculateIntervalStats } = require('./helpers');
const { createTemporalTask } = require('./task-creation');
const config = require('../../config');

function predictFutureTasks(tasks, predictionTime) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    const taskGroups = groupTasksByTermKey(temporalTasks);
    const predictions = [];

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 2) continue;

        const { avgInterval, stdDev } = calculateIntervalStats(groupTasks);
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

function advancedPredictFutureTasks(tasks, predictionHorizon) {
    const predictions = [];
    const currentTime = Date.now();
    const predictionEndTime = currentTime + predictionHorizon;

    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return predictions;

    const taskGroups = groupTasksByTermKey(temporalTasks);

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 2) continue;

        const { intervals, avgInterval, stdDev } = calculateIntervalStats(groupTasks);
        const regularity = 1.0 / (1.0 + stdDev / avgInterval);

        let intervalTrend = 0;
        if (intervals.length > 1) {
            const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
            const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
            const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;
            intervalTrend = secondAvg - firstAvg;
        }

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

module.exports = {
    predictFutureTasks,
    advancedPredictFutureTasks,
};
