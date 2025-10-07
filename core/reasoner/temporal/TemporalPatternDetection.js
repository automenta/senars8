import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {createTemporalSequenceTask, detectTemporalPatterns} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('TemporalPatternDetection');

class TemporalPatternDetection {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalPatternDetection.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalPatternDetection.metricsService = metricsService;
    }

    static detect(temporalFocusSet, config = {}) {
        return withTemporalCaching(
            'TemporalPatternDetection',
            (tasks, options) => TemporalPatternDetection._executeDetect(tasks, options),
            TemporalPatternDetection.cache,
            TemporalPatternDetection.metricsService
        )(temporalFocusSet, config);
    }

    static _executeDetect(temporalFocusSet, config = {}) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal patterns for ${temporalFocusSet.length} tasks`);
            
            const patternTasks = [];
            const patterns = detectTemporalPatterns(temporalFocusSet);

            for (const pattern of patterns) {
                const patternTask = errorHandler.executeSync(() => {
                    if (pattern.type === 'periodic') {
                        const termKey = `(periodic_pattern, ${pattern.tasks[0].termKey})`;
                        const parsedTerm = parseTerm(termKey);
                        if (parsedTerm) {
                            return new Task(
                                parsedTerm,
                                '.',
                                {
                                    frequency: 0.9,
                                    confidence: pattern.confidence
                                }
                            );
                        }
                    } else if (pattern.type === 'sequential') {
                        return createTemporalSequenceTask(pattern.sequence);
                    }
                    return null;
                }, `process-pattern-${pattern.type}`, null);

                if (patternTask) {
                    patternTasks.push(patternTask);
                }
            }

            debug(`Detected ${patternTasks.length} temporal pattern tasks`);
            return patternTasks;
        }, 'detect', []);
    }
}

export default TemporalPatternDetection;
