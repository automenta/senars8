import {createTemporalAbstraction} from '../../utils/temporal/index.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('TemporalAbstraction');

class TemporalAbstraction {
    static create(temporalFocusSet) {
        return errorHandler.executeSync(() => {
            debug(`Creating temporal abstractions for ${temporalFocusSet.length} tasks`);
            const abstractionTasks = [];

            const overallAbstraction = createTemporalAbstraction(temporalFocusSet);
            if (overallAbstraction) {
                abstractionTasks.push(overallAbstraction);
            }

            debug(`Created ${abstractionTasks.length} temporal abstractions`);
            return abstractionTasks;
        }, 'create', []);
    }
}

export default TemporalAbstraction;
