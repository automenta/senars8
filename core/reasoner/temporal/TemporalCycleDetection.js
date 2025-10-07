import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalCycles} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('TemporalCycleDetection');

class TemporalCycleDetection {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalCycleDetection.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalCycleDetection.metricsService = metricsService;
    }

    static detect(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal cycles for ${temporalFocusSet.length} tasks`);
            
            // If cache is available, try to retrieve cached result first
            if (TemporalCycleDetection.cache) {
                const cachedResult = TemporalCycleDetection.cache.get('TemporalCycleDetection', temporalFocusSet, options);
                if (cachedResult !== null) {
                    debug(`Cache hit for TemporalCycleDetection with ${temporalFocusSet.length} tasks`);
                    return cachedResult;
                }
            }

            const cycleTasks = [];
            const cycles = detectTemporalCycles(temporalFocusSet);

            for (const cycle of cycles) {
                const cycleTask = errorHandler.executeSync(() => {
                    return new Task(
                        parseTerm(`(cyclic_pattern, ${cycle.termKey})`),
                        '.',
                        {
                            frequency: 0.95,
                            confidence: cycle.confidence
                        }
                    );
                }, `process-cycle-${cycle.termKey}`, null);

                if (cycleTask) {
                    cycleTasks.push(cycleTask);
                }
            }

            debug(`Detected ${cycleTasks.length} temporal cycles`);
            
            // Cache the result if cache is available
            if (TemporalCycleDetection.cache) {
                TemporalCycleDetection.cache.set('TemporalCycleDetection', temporalFocusSet, cycleTasks, options);
            }

            return cycleTasks;
        }, 'detect', []);
    }
}

export default TemporalCycleDetection;
