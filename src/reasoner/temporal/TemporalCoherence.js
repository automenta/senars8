import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {calculateTemporalCoherence} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';
import config from '../../config/index.js';

const errorHandler = createModuleErrorHandler('TemporalCoherence');

class TemporalCoherence {
    static calculate(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Calculating temporal coherence for ${temporalFocusSet.length} tasks`, { module: 'temporal/TemporalCoherence' });
            const coherenceScore = calculateTemporalCoherence(temporalFocusSet);
            const coherenceTask = new Task(
                parseTerm('(temporal_coherence)'),
                '.',
                {
                    frequency: coherenceScore,
                    confidence: config.DEFAULT_TRUTH_VALUE.confidence
                }
            );
            debug(`Temporal coherence score: ${coherenceScore}`, { module: 'temporal/TemporalCoherence' });
            return [coherenceTask];
        }, 'calculate', []);
    }
}

export default TemporalCoherence;
