import Task from '../../core/Task.js';
import { parseTerm } from '../../parser/narseseParser.js';
import config from '../../config.js';
import { determineTemporalRelationship } from './query.js';

function _createImplicationTask(termKey, truthValue) {
    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) {
        return null;
    }
    return new Task(parsedTerm, '.', truthValue);
}

function inferTemporalImplications(task1, task2) {
    const relationship = determineTemporalRelationship(task1, task2);
    if (!relationship) { return []; }

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

export {
    inferTemporalImplications
};
