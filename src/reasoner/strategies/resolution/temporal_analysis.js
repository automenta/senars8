import { createMetaTask } from '../strategy-utils.js';

function temporalAnalysis(contradiction) {
    return [createMetaTask('temporal_analysis', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

export default temporalAnalysis;
