import {inferTemporalImplications} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import config from '../../config/index.js';

const errorHandler = createUnifiedErrorHandler('TemporalImplicationInference');

class TemporalImplicationInference {
    static infer(temporalFocusSet) {
        return errorHandler.executeSync(() => {
            debug(`Inferring temporal implications for ${temporalFocusSet.length} tasks`);
            const implicationTasks = [];
            let implicationCount = 0;

            const maxComparisons = config.temporal.MAX_COMPARISONS;
            let comparisonCount = 0;

            for (let i = 0; i < temporalFocusSet.length && comparisonCount < maxComparisons; i++) {
                for (let j = i + 1; j < temporalFocusSet.length && comparisonCount < maxComparisons; j++) {
                    comparisonCount++;
                    const task1 = temporalFocusSet[i];
                    const task2 = temporalFocusSet[j];
                    const implications = inferTemporalImplications(task1, task2);
                    implicationTasks.push(...implications);
                    implicationCount += implications.length;
                }
            }

            debug(`Found ${implicationCount} temporal implications (${comparisonCount} comparisons)`);
            return implicationTasks;
        }, 'infer', []);
    }
}

export default TemporalImplicationInference;
