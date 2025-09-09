const {
    createTemporalAbstraction
} = require('../../utils/temporal-reasoning');
const {debug} = require('../../utils/logger');
const {handleErrorWithDefault} = require('../../utils/error-handler');

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

module.exports = TemporalAbstraction;