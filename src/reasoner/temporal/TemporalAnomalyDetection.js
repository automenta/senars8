const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const {
    detectTemporalAnomalies
} = require('../../utils/temporal-reasoning');
const {debug} = require('../../utils/logger');
const {handleErrorWithDefault} = require('../../utils/error-handler');
const config = require('../../config');

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
                    // Continue with other anomalies
                }
            }
            
            debug(`Detected ${anomalyTasks.length} temporal anomalies`);
            return anomalyTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal anomaly detection error', []);
        }
    }
}

module.exports = TemporalAnomalyDetection;