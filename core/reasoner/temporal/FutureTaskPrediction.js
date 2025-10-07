import {advancedPredictFutureTasks} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

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
        return errorHandler.executeSync(() => {
            debug(`Predicting future tasks for ${temporalFocusSet.length} tasks`);
            
            // If cache is available, try to retrieve cached result first
            if (FutureTaskPrediction.cache) {
                const predictionHorizon = options.predictionHorizon || 24 * 60 * 60 * 1000;
                const cacheOptions = { ...options, predictionHorizon };
                const cachedResult = FutureTaskPrediction.cache.get('FutureTaskPrediction', temporalFocusSet, cacheOptions);
                if (cachedResult !== null) {
                    debug(`Cache hit for FutureTaskPrediction with ${temporalFocusSet.length} tasks`);
                    return cachedResult;
                }
            }

            const predictionHorizon = options.predictionHorizon || 24 * 60 * 60 * 1000;
            const predictionTasks = advancedPredictFutureTasks(temporalFocusSet, predictionHorizon);
            debug(`Predicted ${predictionTasks.length} future tasks`);
            
            // Cache the result if cache is available
            if (FutureTaskPrediction.cache) {
                const cacheOptions = { ...options, predictionHorizon };
                FutureTaskPrediction.cache.set('FutureTaskPrediction', temporalFocusSet, predictionTasks, cacheOptions);
            }

            return predictionTasks;
        }, 'predict', []);
    }
}

export default FutureTaskPrediction;
