const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const config = require('../../config');
const { findTasksInTimeWindow } = require('./query');
const { calculateIntervalStats } = require('./helpers');

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

function createTemporalAbstraction(tasks) {
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 2) return null;

    const { avgInterval, stdDev } = calculateIntervalStats(temporalTasks);
    const regularity = 1.0 / (1.0 + stdDev / avgInterval);

    const startTime = temporalTasks[0].state.stamp.occurrenceTime;
    const endTime = temporalTasks[temporalTasks.length - 1].state.stamp.endTime || temporalTasks[temporalTasks.length - 1].state.stamp.occurrenceTime;
    const frequency = temporalTasks.length / ((endTime - startTime) / (1000 * 60 * 60));

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

module.exports = {
    createTemporalSummary,
    createTemporalAbstraction,
    calculateTemporalCoherence,
};
