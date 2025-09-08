const {
    advancedPredictFutureTasks
} = require('../../utils/temporal-reasoning');
const {debug} = require('../../utils/logger');
const {handleErrorWithDefault} = require('../../utils/error-handler');

class FutureTaskPrediction {
    static predict(temporalFocusSet) {
        try {
            debug(`Predicting future tasks for ${temporalFocusSet.length} tasks`);
            // Predict for the next 24 hours
            const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, 24 * 60 * 60 * 1000);
            debug(`Predicted ${predictionTasks.length} future tasks`);
            return predictionTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Future task prediction error', []);
        }
    }
}

module.exports = FutureTaskPrediction;