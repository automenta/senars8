import { createMetaTask } from '../strategy-utils.js';

function causalAnalysis(contradiction) {
    return [createMetaTask('causal_analysis', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

export default causalAnalysis;
