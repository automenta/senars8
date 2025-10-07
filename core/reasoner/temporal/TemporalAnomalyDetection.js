import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalAnomalies} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {withTemporalCaching} from './TemporalCachingUtils.js';

const errorHandler = createUnifiedErrorHandler('TemporalAnomalyDetection');

class TemporalAnomalyDetection {
    static cache = null;
    static metricsService = null;

    /**
     * Sets the cache instance for this module
     * @param {TemporalCache} cache - Temporal cache instance
     */
    static setCache(cache) {
        TemporalAnomalyDetection.cache = cache;
    }

    /**
     * Sets the metrics service for tracking performance
     * @param {MetricsService} metricsService - Metrics service instance
     */
    static setMetricsService(metricsService) {
        TemporalAnomalyDetection.metricsService = metricsService;
    }

    static detect(temporalFocusSet, options = {}) {
        return withTemporalCaching(
            'TemporalAnomalyDetection',
            (tasks, options) => TemporalAnomalyDetection._executeDetect(tasks, options),
            TemporalAnomalyDetection.cache,
            TemporalAnomalyDetection.metricsService
        )(temporalFocusSet, options);
    }

    static _executeDetect(temporalFocusSet, options = {}) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal anomalies for ${temporalFocusSet.length} tasks`);
            
            const anomalyTasks = [];
            const anomalies = detectTemporalAnomalies(temporalFocusSet);

            for (const anomaly of anomalies) {
                const anomalyTask = errorHandler.executeSync(() => {
                    return new Task(
                        parseTerm(`(temporal_anomaly, ${anomaly.termKey})`),
                        '.',
                        {
                            frequency: anomaly.severity,
                            confidence: 0.8
                        }
                    );
                }, `process-anomaly-${anomaly.termKey}`, null);

                if (anomalyTask) {
                    anomalyTasks.push(anomalyTask);
                }
            }

            debug(`Detected ${anomalyTasks.length} temporal anomalies`);
            return anomalyTasks;
        }, 'detect', []);
    }
}

export default TemporalAnomalyDetection;
