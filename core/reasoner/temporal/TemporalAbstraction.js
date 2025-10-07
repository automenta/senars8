import {createTemporalAbstraction} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('TemporalAbstraction');

class TemporalAbstraction {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalAbstraction.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalAbstraction.metricsService = metricsService;
    }

    static create(temporalFocusSet, options = {}) {
        return withTemporalCaching(
            'TemporalAbstraction',
            (tasks, options) => TemporalAbstraction._executeCreate(tasks, options),
            TemporalAbstraction.cache,
            TemporalAbstraction.metricsService
        )(temporalFocusSet, options);
    }

    static _executeCreate(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Creating temporal abstractions for ${temporalFocusSet.length} tasks`);
            
            const abstractionTasks = [];

            const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
            if (overallAbstraction) {
                abstractionTasks.push(overallAbstraction);
            }

            debug(`Created ${abstractionTasks.length} temporal abstractions`);
            return abstractionTasks;
        }, 'create', []);
    }
}

export default TemporalAbstraction;
