import {calculateIntervalStats, groupTasksByTermKey} from './helpers.js';
import config from '../../config.js';

function detectTemporalPatterns(tasks) {
    const patterns = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 3) return patterns;

    const {intervals, stdDev, avgInterval} = calculateIntervalStats(temporalTasks);

    if (intervals.length > 1) {
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

    const taskGroups = groupTasksByTermKey(temporalTasks);

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 3) continue;

        const {stdDev, avgInterval} = calculateIntervalStats(groupTasks);

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

    return cycles;
}

function detectTemporalAnomalies(tasks) {
    const anomalies = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);
    if (temporalTasks.length < 5) return anomalies;

    const taskGroups = groupTasksByTermKey(temporalTasks);

    for (const [termKey, groupTasks] of Object.entries(taskGroups)) {
        if (groupTasks.length < 3) continue;

        const {intervals, avgInterval, stdDev} = calculateIntervalStats(groupTasks);

        for (let i = 0; i < intervals.length; i++) {
            if (Math.abs(intervals[i] - avgInterval) > 2 * stdDev) {
                anomalies.push({
                    termKey: termKey,
                    type: 'temporal_anomaly',
                    timestamp: groupTasks[i + 1].state.stamp.occurrenceTime,
                    expectedInterval: avgInterval,
                    actualInterval: intervals[i],
                    severity: Math.min(1.0, Math.abs(intervals[i] - avgInterval) / (3 * stdDev))
                });
            }
        }
    }

    return anomalies;
}

function detectTemporalClusters(tasks) {
    const clusters = [];
    const temporalTasks = tasks.filter(task => task.state.stamp.occurrenceTime);

    if (temporalTasks.length < 3) return clusters;

    const {intervals, avgInterval, stdDev} = calculateIntervalStats(temporalTasks);
    const clusterThreshold = avgInterval - stdDev;

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

export {
    detectTemporalPatterns,
    detectTemporalCycles,
    detectTemporalAnomalies,
    detectTemporalClusters,
};
