function groupTasksByTermKey(tasks) {
    const taskGroups = {};
    tasks.forEach(task => {
        if (!taskGroups[task.termKey]) {
            taskGroups[task.termKey] = [];
        }
        taskGroups[task.termKey].push(task);
    });
    return taskGroups;
}

function calculateIntervalStats(tasks) {
    if (tasks.length < 2) return { intervals: [], avgInterval: 0, variance: 0, stdDev: 0 };

    const sortedTasks = [...tasks].sort((a, b) => a.state.stamp.occurrenceTime - b.state.stamp.occurrenceTime);
    const intervals = [];
    for (let i = 1; i < sortedTasks.length; i++) {
        intervals.push(sortedTasks[i].state.stamp.occurrenceTime - sortedTasks[i - 1].state.stamp.occurrenceTime);
    }

    if (intervals.length === 0) return { intervals, avgInterval: 0, variance: 0, stdDev: 0 };

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    return { intervals, avgInterval, variance, stdDev };
}

module.exports = {
    groupTasksByTermKey,
    calculateIntervalStats,
};
