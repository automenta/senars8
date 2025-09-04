const Task = require('../core/Task');
const {parseTerm} = require('../parser/TermParser');
const {
    determineTemporalRelationship,
    createTemporalRelationshipTask,
    inferTemporalImplications,
    createTemporalSequenceTask,
    detectTemporalPatterns
} = require('../utils/temporal-reasoning');

class TemporalReasoner {
    inferTemporalRelationships(focusSet) {
        const temporalTasks = [];
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);

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

    inferTemporalImplications(focusSet) {
        const implicationTasks = [];
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);

        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];

                const implications = inferTemporalImplications(task1, task2);
                implicationTasks.push(...implications);
            }
        }

        return implicationTasks;
    }

    detectTemporalPatterns(focusSet) {
        const patternTasks = [];
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);

        const patterns = detectTemporalPatterns(temporalFocusSet);

        for (const pattern of patterns) {
            switch (pattern.type) {
                case 'periodic':
                    const periodicTask = new Task(
                        parseTerm(`(periodic_pattern, ${pattern.tasks[0].termKey})`),
                        '.',
                        {
                            frequency: 0.9,
                            confidence: pattern.confidence
                        }
                    );
                    patternTasks.push(periodicTask);
                    break;

                case 'sequential':
                    const sequenceTask = createTemporalSequenceTask(pattern.sequence);
                    if (sequenceTask) {
                        patternTasks.push(sequenceTask);
                    }
                    break;
            }
        }

        return patternTasks;
    }
}

module.exports = TemporalReasoner;
