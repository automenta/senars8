import {createTemporalRelationshipTask, determineTemporalRelationship} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import config from '../../config/index.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('TemporalRelationshipInference');

class TemporalRelationshipInference {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalRelationshipInference.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalRelationshipInference.metricsService = metricsService;
    }

    static infer(temporalFocusSet, options = {}) {
        return withTemporalCaching(
            'TemporalRelationshipInference',
            (tasks, options) => TemporalRelationshipInference._executeInfer(tasks, options),
            TemporalRelationshipInference.cache,
            TemporalRelationshipInference.metricsService
        )(temporalFocusSet, options);
    }

    static _executeInfer(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Inferring temporal relationships for ${temporalFocusSet.length} tasks`);
            
            const temporalTasks = [];
            let relationshipCount = 0;

            const maxComparisons = config.temporal.MAX_COMPARISONS || options.maxComparisons || 1000; // Use options as fallback
            let comparisonCount = 0;

            for (let i = 0; i < temporalFocusSet.length && comparisonCount < maxComparisons; i++) {
                for (let j = i + 1; j < temporalFocusSet.length && comparisonCount < maxComparisons; j++) {
                    comparisonCount++;
                    const task1 = temporalFocusSet[i];
                    const task2 = temporalFocusSet[j];
                    const relationship = determineTemporalRelationship(task1, task2);
                    if (relationship) {
                        const relationshipTask = createTemporalRelationshipTask(task1, task2, relationship);
                        if (relationshipTask) { // Check if task was created successfully
                            temporalTasks.push(relationshipTask);
                            relationshipCount++;
                        }
                    }
                }
            }

            debug(`Found ${relationshipCount} temporal relationships (${comparisonCount} comparisons)`);
            return temporalTasks;
        }, 'infer', []);
    }
}

export default TemporalRelationshipInference;
