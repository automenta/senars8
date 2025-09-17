import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {createTemporalSequenceTask, detectTemporalPatterns} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalPatternDetection');

class TemporalPatternDetection {
    static detect(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Detecting temporal patterns for ${temporalFocusSet.length} tasks`);
            const patternTasks = [];
            const patterns = detectTemporalPatterns(temporalFocusSet);

            for (const pattern of patterns) {
                const patternTask = errorHandler.safeSync(() => {
                    if (pattern.type === 'periodic') {
                        const termKey = `(periodic_pattern, ${pattern.tasks[0].termKey})`;
                        const parsedTerm = parseTerm(termKey);
                        if (parsedTerm) {
                            return new Task(
                                parsedTerm,
                                '.',
                                {
                                    frequency: 0.9,
                                    confidence: pattern.confidence
                                }
                            );
                        }
                    } else if (pattern.type === 'sequential') {
                        return createTemporalSequenceTask(pattern.sequence);
                    }
                    return null;
                }, `process-pattern-${pattern.type}`, null);

                if (patternTask) {
                    patternTasks.push(patternTask);
                }
            }

            debug(`Detected ${patternTasks.length} temporal pattern tasks`);
            return patternTasks;
        }, 'detect', []);
    }
}

export default TemporalPatternDetection;
