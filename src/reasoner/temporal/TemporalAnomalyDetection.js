import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalAnomalies} from '../../utils/temporal/pattern-detection.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/error-handler.js';
import config from '../../config.js';

class TemporalAnomalyDetection {
    static detect(temporalFocusSet) {
        try {
            debug(`Detecting temporal anomalies for ${temporalFocusSet.length} tasks`);
            const anomalyTasks = [];
            const anomalies = detectTemporalAnomalies(temporalFocusSet);

            for (const anomaly of anomalies) {
                try {
                    const anomalyTask = new Task(
                        parseTerm(`(temporal_anomaly, ${anomaly.termKey})`),
                        '.',
                        {
                            frequency: anomaly.severity,
                            confidence: 0.8
                        }
                    );
                    anomalyTasks.push(anomalyTask);
                } catch (err) {
                    handleErrorWithDefault(err, `Error processing anomaly for term ${anomaly.termKey}`, null);
                }
            }

            debug(`Detected ${anomalyTasks.length} temporal anomalies`);
            return anomalyTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal anomaly detection error', []);
        }
    }
}

export default TemporalAnomalyDetection;