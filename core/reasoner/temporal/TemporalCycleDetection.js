import Task from '../../core/Task.js';
import {parseTerm} from '../../../coreagent/parser/narseseParser.js';
import {detectTemporalCycles} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

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
        return withTemporalCaching(
            'TemporalCycleDetection',
            (tasks, options) => TemporalCycleDetection._executeDetect(tasks, options),
            TemporalCycleDetection.cache,
            TemporalCycleDetection.metricsService
        )(temporalFocusSet, options);
    }

    static _executeDetect(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal cycles for ${temporalFocusSet.length} tasks`);

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
            return cycleTasks;
        }, 'detect', []);
    }
}

export default TemporalCycleDetection;
