import {advancedPredictFutureTasks} from '../../utils/temporal/prediction.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/error-handler.js';

class FutureTaskPrediction {
    static predict(temporalFocusSet) {
        try {
            debug(`Predicting future tasks for ${temporalFocusSet.length} tasks`);
            const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, 24 * 60 * 60 * 1000);
            debug(`Predicted ${predictionTasks.length} future tasks`);
            return predictionTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Future task prediction error', []);
        }
    }
}

export default FutureTaskPrediction;
