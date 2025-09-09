const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const {calculateTemporalCoherence} = require('../../utils/temporal/summary');
const {debug} = require('../../utils/logger');
const {handleErrorWithDefault} = require('../../utils/error-handler');
const config = require('../../config');

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

module.exports = TemporalCoherence;