import {advancedPredictFutureTasks} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/common.js';

const errorHandler = createModuleErrorHandler('FutureTaskPrediction');

class FutureTaskPrediction {
    static predict(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Predicting future tasks for ${temporalFocusSet.length} tasks`);
            const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, 24 * 60 * 60 * 1000);
            debug(`Predicted ${predictionTasks.length} future tasks`);
            return predictionTasks;
        }, 'predict', []);
    }
}

export default FutureTaskPrediction;
