const { createMetaTask } = require('../strategy-utils');

function externalValidation(contradiction) {
    return contradiction.tasks.map(task => createMetaTask('external_validation', task.termKey, contradiction.confidence)).filter(Boolean);
}

module.exports = externalValidation;
