const { createMetaTask } = require('../strategy-utils');

function hierarchicalReconciliation(contradiction) {
    return [createMetaTask('hierarchical_reconciliation', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

module.exports = hierarchicalReconciliation;
