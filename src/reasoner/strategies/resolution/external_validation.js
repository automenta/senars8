import {createMetaTask} from '../strategy-utils.js';

function externalValidation(contradiction) {
    return contradiction.tasks.map(task => createMetaTask('external_validation', task.termKey, contradiction.confidence)).filter(Boolean);
}

export default externalValidation;
