import {advancedPredictFutureTasks} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('FutureTaskPrediction');

class FutureTaskPrediction {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        FutureTaskPrediction.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        FutureTaskPrediction.metricsService = metricsService;
    }

    static predict(temporalFocusSet, options = {}) {
        return withTemporalCaching(
            'FutureTaskPrediction',
            (tasks, options) => FutureTaskPrediction._executePredict(tasks, options),
            FutureTaskPrediction.cache,
            FutureTaskPrediction.metricsService
        )(temporalFocusSet, options);
    }

    static _executePredict(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Predicting future tasks for ${temporalFocusSet.length} tasks`);

            const predictionHorizon = options.predictionHorizon || 24 * 60 * 60 * 1000;
            const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, predictionHorizon);
            debug(`Predicted ${predictionTasks.length} future tasks`);

            return predictionTasks;
        }, 'predict', []);
    }
}

export default FutureTaskPrediction;
