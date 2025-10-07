import {createTemporalClusterAbstractions, detectTemporalClusters} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

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
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal clusters for ${temporalFocusSet.length} tasks`);
            
            // If cache is available, try to retrieve cached result first
            if (TemporalClusterDetection.cache) {
                const cachedResult = TemporalClusterDetection.cache.get('TemporalClusterDetection', temporalFocusSet, options);
                if (cachedResult !== null) {
                    debug(`Cache hit for TemporalClusterDetection with ${temporalFocusSet.length} tasks`);
                    return cachedResult;
                }
            }

            const clusterTasks = [];
            const clusters = detectTemporalClusters(temporalFocusSet);
            const abstractions = createTemporalClusterAbstractions(clusters);
            clusterTasks.push(...abstractions);
            debug(`Detected ${clusterTasks.length} temporal cluster abstractions`);
            
            // Cache the result if cache is available
            if (TemporalClusterDetection.cache) {
                TemporalClusterDetection.cache.set('TemporalClusterDetection', temporalFocusSet, clusterTasks, options);
            }

            return clusterTasks;
        }, 'detect', []);
    }
}

export default TemporalClusterDetection;
