import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalAnomalies} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalAnomalyDetection');

class TemporalAnomalyDetection {
    static detect(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Detecting temporal anomalies for ${temporalFocusSet.length} tasks`, { module: 'temporal/TemporalAnomalyDetection' });
            const anomalyTasks = [];
            const anomalies = detectTemporalAnomalies(temporalFocusSet);

            for (const anomaly of anomalies) {
                const anomalyTask = errorHandler.safeSync(() => {
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

            debug(`Detected ${anomalyTasks.length} temporal anomalies`, { module: 'temporal/TemporalAnomalyDetection' });
            return anomalyTasks;
        }, 'detect', []);
    }
}

export default TemporalAnomalyDetection;
