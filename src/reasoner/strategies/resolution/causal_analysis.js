const {createMetaTask} = require('../strategy-utils');

function causalAnalysis(contradiction) {
    return [createMetaTask('causal_analysis', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
}

module.exports = causalAnalysis;
