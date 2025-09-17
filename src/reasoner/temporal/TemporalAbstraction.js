import {createTemporalAbstraction} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalAbstraction');

class TemporalAbstraction {
    static create(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Creating temporal abstractions for ${temporalFocusSet.length} tasks`, { module: 'temporal/TemporalAbstraction' });
            const abstractionTasks = [];

            const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
            if (overallAbstraction) {
                abstractionTasks.push(overallAbstraction);
            }

            debug(`Created ${abstractionTasks.length} temporal abstractions`, { module: 'temporal/TemporalAbstraction' });
            return abstractionTasks;
        }, 'create', []);
    }
}

export default TemporalAbstraction;
