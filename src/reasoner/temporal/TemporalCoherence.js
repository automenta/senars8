import Task from '../../core/Task.js';
import { parseTerm } from '../../parser/narseseParser.js';
import { calculateTemporalCoherence } from '../../utils/temporal/summary.js';
import { debug } from '../../utils/logger.js';
import { handleErrorWithDefault } from '../../utils/error-handler.js';
import config from '../../config.js';

class TemporalCoherence {
    static calculate(temporalFocusSet) {
        try {
            debug(`Calculating temporal coherence for ${temporalFocusSet.length} tasks`);
            const coherenceScore = calculateTemporalCoherence(temporalFocusSet);
            const coherenceTask = new Task(
                parseTerm('(temporal_coherence)'),
                '.',
                {
                    frequency: coherenceScore,
                    confidence: config.DEFAULT_TRUTH_VALUE.confidence
                }
            );
            debug(`Temporal coherence score: ${coherenceScore}`);
            return [coherenceTask];
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal coherence calculation error', []);
        }
    }
}

export default TemporalCoherence;
