import {createTemporalAbstraction} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/errorHandler.js';

class TemporalAbstraction {
    static create(temporalFocusSet) {
        try {
            debug(`Creating temporal abstractions for ${temporalFocusSet.length} tasks`);
            const abstractionTasks = [];

            const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
            if (overallAbstraction) {
                abstractionTasks.push(overallAbstraction);
            }

            debug(`Created ${abstractionTasks.length} temporal abstractions`);
            return abstractionTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal abstraction creation error', []);
        }
    }
}

export default TemporalAbstraction;
