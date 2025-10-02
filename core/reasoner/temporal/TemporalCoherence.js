import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {calculateTemporalCoherence} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import config from '../../config/index.js';

const errorHandler = createUnifiedErrorHandler('TemporalCoherence');

class TemporalCoherence {
    static calculate(temporalFocusSet) {
        return errorHandler.executeSync(() => {
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
        }, 'calculate', []);
    }
}

export default TemporalCoherence;
