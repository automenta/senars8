import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import {detectTemporalCycles} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalCycleDetection');

class TemporalCycleDetection {
    static detect(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Detecting temporal cycles for ${temporalFocusSet.length} tasks`, { module: 'temporal/TemporalCycleDetection' });
            const cycleTasks = [];
            const cycles = detectTemporalCycles(temporalFocusSet);

            for (const cycle of cycles) {
                const cycleTask = errorHandler.safeSync(() => {
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

            debug(`Detected ${cycleTasks.length} temporal cycles`, { module: 'temporal/TemporalCycleDetection' });
            return cycleTasks;
        }, 'detect', []);
    }
}

export default TemporalCycleDetection;
