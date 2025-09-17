import {createMetaTask} from '../strategy-utils.js';

function hierarchicalReconciliation(contradiction) {
    return [createMetaTask('hierarchical_reconciliation', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

export default hierarchicalReconciliation;
