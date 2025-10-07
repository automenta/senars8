import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalAnomalies} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

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
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal anomalies for ${temporalFocusSet.length} tasks`);
            
            // If cache is available, try to retrieve cached result first
            if (TemporalAnomalyDetection.cache) {
                const cachedResult = TemporalAnomalyDetection.cache.get('TemporalAnomalyDetection', temporalFocusSet, options);
                if (cachedResult !== null) {
                    debug(`Cache hit for TemporalAnomalyDetection with ${temporalFocusSet.length} tasks`);
                    return cachedResult;
                }
            }

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
            
            // Cache the result if cache is available
            if (TemporalAnomalyDetection.cache) {
                TemporalAnomalyDetection.cache.set('TemporalAnomalyDetection', temporalFocusSet, anomalyTasks, options);
            }

            return anomalyTasks;
        }, 'detect', []);
    }
}

export default TemporalAnomalyDetection;
