import {createTemporalClusterAbstractions, detectTemporalClusters} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('TemporalClusterDetection');

class TemporalClusterDetection {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalClusterDetection.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalClusterDetection.metricsService = metricsService;
    }

    static detect(temporalFocusSet, options = {}) {
        return withTemporalCaching(
            'TemporalClusterDetection',
            (tasks, options) => TemporalClusterDetection._executeDetect(tasks, options),
            TemporalClusterDetection.cache,
            TemporalClusterDetection.metricsService
        )(temporalFocusSet, options);
    }

    static _executeDetect(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal clusters for ${temporalFocusSet.length} tasks`);

            const clusterTasks = [];
            const clusters = detectTemporalClusters(temporalFocusSet);
            const abstractions = createTemporalClusterAbstractions(clusters);
            clusterTasks.push(...abstractions);
            debug(`Detected ${clusterTasks.length} temporal cluster abstractions`);
            return clusterTasks;
        }, 'detect', []);
    }
}

export default TemporalClusterDetection;
