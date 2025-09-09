const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const {
    detectTemporalCycles
} = require('../../utils/temporal-reasoning');
const {debug} = require('../../utils/logger');
const {handleErrorWithDefault} = require('../../utils/error-handler');

class TemporalCycleDetection {
    static detect(temporalFocusSet) {
        try {
            debug(`Detecting temporal cycles for ${temporalFocusSet.length} tasks`);
            const cycleTasks = [];
            const cycles = detectTemporalCycles(temporalFocusSet);

            for (const cycle of cycles) {
                try {
                    const cycleTask = new Task(
                        parseTerm(`(cyclic_pattern, ${cycle.termKey})`),
                        '.',
                        {
                            frequency: 0.95,
                            confidence: cycle.confidence
                        }
                    );
                    cycleTasks.push(cycleTask);
                } catch (err) {
                    handleErrorWithDefault(err, `Error processing cycle for term ${cycle.termKey}`, null);
                }
            }
            
            debug(`Detected ${cycleTasks.length} temporal cycles`);
            return cycleTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal cycle detection error', []);
        }
    }
}

module.exports = TemporalCycleDetection;