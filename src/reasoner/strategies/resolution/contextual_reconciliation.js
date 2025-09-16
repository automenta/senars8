import {createMetaTask} from '../strategy-utils.js';

function contextualReconciliation(contradiction) {
    return [createMetaTask('contextual_reconciliation', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

export default contextualReconciliation;
