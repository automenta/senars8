import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalCycles} from '../../utils/temporal/index.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('TemporalCycleDetection');

class TemporalCycleDetection {
    static detect(temporalFocusSet) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal cycles for ${temporalFocusSet.length} tasks`);
            const cycleTasks = [];
            const cycles = detectTemporalCycles(temporalFocusSet);

            for (const cycle of cycles) {
                const cycleTask = errorHandler.executeSync(() => {
                    return new Task(
                        parseTerm(`(cyclic_pattern, ${cycle.termKey})`),
                        '.',
                        {
                            frequency: 0.95,
                            confidence: cycle.confidence
                        }
                    );
                }, `process-cycle-${cycle.termKey}`, null);

                if (cycleTask) {
                    cycleTasks.push(cycleTask);
                }
            }

            debug(`Detected ${cycleTasks.length} temporal cycles`);
            return cycleTasks;
        }, 'detect', []);
    }
}

export default TemporalCycleDetection;
