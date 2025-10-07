import {inferTemporalImplications} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import config from '../../config/index.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('TemporalImplicationInference');

class TemporalImplicationInference {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalImplicationInference.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalImplicationInference.metricsService = metricsService;
    }

    static infer(temporalFocusSet, options = {}) {
        return withTemporalCaching(
            'TemporalImplicationInference',
            (tasks, options) => TemporalImplicationInference._executeInfer(tasks, options),
            TemporalImplicationInference.cache,
            TemporalImplicationInference.metricsService
        )(temporalFocusSet, options);
    }

    static _executeInfer(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Inferring temporal implications for ${temporalFocusSet.length} tasks`);

            const implicationTasks = [];
            let implicationCount = 0;

            const maxComparisons = config.temporal.MAX_COMPARISONS || options.maxComparisons || 1000; // Use options as fallback
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
