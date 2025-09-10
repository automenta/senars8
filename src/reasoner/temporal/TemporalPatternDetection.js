import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalPatterns} from '../../utils/temporal/pattern-detection.js';
import {createTemporalSequenceTask} from '../../utils/temporal/task-creation.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/error-handler.js';
import config from '../../config.js';

class TemporalPatternDetection {
    static detect(temporalFocusSet) {
        try {
            debug(`Detecting temporal patterns for ${temporalFocusSet.length} tasks`);
            const patternTasks = [];
            const patterns = detectTemporalPatterns(temporalFocusSet);

            for (const pattern of patterns) {
                try {
                    if (pattern.type === 'periodic') {
                        const termKey = `(periodic_pattern, ${pattern.tasks[0].termKey})`;
                        const parsedTerm = parseTerm(termKey);
                        if (parsedTerm) {
                            const periodicTask = new Task(
                                parsedTerm,
                                '.',
                                {
                                    frequency: 0.9,
                                    confidence: pattern.confidence
                                }
                            );
                            patternTasks.push(periodicTask);
                        }
                    } else if (pattern.type === 'sequential') {
                        const sequenceTask = createTemporalSequenceTask(pattern.sequence);
                        if (sequenceTask) {
                            patternTasks.push(sequenceTask);
                        }
                    }
                } catch (err) {
                    handleErrorWithDefault(err, `Error processing pattern of type ${pattern.type}`, null);
                }
            }

            debug(`Detected ${patternTasks.length} temporal pattern tasks`);
            return patternTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal pattern detection error', []);
        }
    }
}

export default TemporalPatternDetection;