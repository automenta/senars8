import {determineTemporalRelationship} from '../../utils/temporal/query.js';
import {createTemporalRelationshipTask} from '../../utils/temporal/task-creation.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/error-handler.js';
import config from '../../config.js';

class TemporalRelationshipInference {
    static infer(temporalFocusSet) {
        try {
            debug(`Inferring temporal relationships for ${temporalFocusSet.length} tasks`);
            const temporalTasks = [];
            let relationshipCount = 0;

            const maxComparisons = config.temporal.MAX_COMPARISONS;
            let comparisonCount = 0;

            for (let i = 0; i < temporalFocusSet.length && comparisonCount < maxComparisons; i++) {
                for (let j = i + 1; j < temporalFocusSet.length && comparisonCount < maxComparisons; j++) {
                    comparisonCount++;
                    const task1 = temporalFocusSet[i];
                    const task2 = temporalFocusSet[j];
                    const relationship = determineTemporalRelationship(task1, task2);
                    if (relationship) {
                        const relationshipTask = createTemporalRelationshipTask(task1, task2, relationship);
                        if (relationshipTask) { // Check if task was created successfully
                            temporalTasks.push(relationshipTask);
                            relationshipCount++;
                        }
                    }
                }
            }

            debug(`Found ${relationshipCount} temporal relationships (${comparisonCount} comparisons)`);
            return temporalTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal relationship inference error', []);
        }
    }
}

export default TemporalRelationshipInference;