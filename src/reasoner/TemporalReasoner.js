const Task = require('../core/Task');
const {parseTerm} = require('../parser/NewParser');
const {
    determineTemporalRelationship,
    createTemporalRelationshipTask,
    inferTemporalImplications: inferImplications,
    createTemporalSequenceTask,
    detectTemporalPatterns: detectPatterns,
} = require('../utils/temporal-reasoning');

class TemporalReasoner {
    infer(focusSet) {
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
        if (temporalFocusSet.length < 2) {
            return [];
        }

        const relationshipTasks = this._inferTemporalRelationships(temporalFocusSet);
        const implicationTasks = this._inferTemporalImplications(temporalFocusSet);
        const patternTasks = this._detectTemporalPatterns(temporalFocusSet);

        return [...relationshipTasks, ...implicationTasks, ...patternTasks];
    }

    _inferTemporalRelationships(temporalFocusSet) {
        const temporalTasks = [];
        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];
                const relationship = determineTemporalRelationship(task1, task2);
                if (relationship) {
                    const relationshipTask = createTemporalRelationshipTask(task1, task2, relationship);
                    temporalTasks.push(relationshipTask);
                }
            }
        }
        return temporalTasks;
    }

    _inferTemporalImplications(temporalFocusSet) {
        const implicationTasks = [];
        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];
                const implications = inferImplications(task1, task2);
                implicationTasks.push(...implications);
            }
        }
        return implicationTasks;
    }

    _detectTemporalPatterns(temporalFocusSet) {
        const patternTasks = [];
        const patterns = detectPatterns(temporalFocusSet);

        for (const pattern of patterns) {
            if (pattern.type === 'periodic') {
                const periodicTask = new Task(
                    parseTerm(`(periodic_pattern, ${pattern.tasks[0].termKey})`),
                    '.', {
                        frequency: 0.9,
                        confidence: pattern.confidence
                    }
                );
                patternTasks.push(periodicTask);
            } else if (pattern.type === 'sequential') {
                const sequenceTask = createTemporalSequenceTask(pattern.sequence);
                if (sequenceTask) {
                    patternTasks.push(sequenceTask);
                }
            }
        }
        return patternTasks;
    }
}

module.exports = TemporalReasoner;
