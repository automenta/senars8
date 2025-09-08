const {createMetaTask} = require('../strategy-utils');

function temporalAnalysis(contradiction) {
    return [createMetaTask('temporal_analysis', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

module.exports = temporalAnalysis;
