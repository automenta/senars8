import {createTemporalAbstraction} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

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
        return errorHandler.executeSync(() => {
            debug(`Creating temporal abstractions for ${temporalFocusSet.length} tasks`);
            
            // If cache is available, try to retrieve cached result first
            if (TemporalAbstraction.cache) {
                const cachedResult = TemporalAbstraction.cache.get('TemporalAbstraction', temporalFocusSet, options);
                if (cachedResult !== null) {
                    debug(`Cache hit for TemporalAbstraction with ${temporalFocusSet.length} tasks`);
                    return cachedResult;
                }
            }

            const abstractionTasks = [];

            const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
            if (overallAbstraction) {
                abstractionTasks.push(overallAbstraction);
            }

            debug(`Created ${abstractionTasks.length} temporal abstractions`);
            
            // Cache the result if cache is available
            if (TemporalAbstraction.cache) {
                TemporalAbstraction.cache.set('TemporalAbstraction', temporalFocusSet, abstractionTasks, options);
            }

            return abstractionTasks;
        }, 'create', []);
    }
}

export default TemporalAbstraction;
