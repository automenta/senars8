import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import config from '../../config.js';

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
    if (tasks.length < 2) {
        return null;
    }

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

export {
    createTemporalTask,
    createTemporalRelationshipTask,
    createTemporalSequenceTask,
    createTemporalClusterAbstractions
};
