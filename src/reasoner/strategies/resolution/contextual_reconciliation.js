const { createMetaTask } = require('../strategy-utils');

function contextualReconciliation(contradiction) {
    return [createMetaTask('contextual_reconciliation', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

module.exports = contextualReconciliation;
