const {
    detectTemporalClusters,
    createTemporalClusterAbstractions
} = require('../../utils/temporal-reasoning');
const {debug} = require('../../utils/logger');
const {handleErrorWithDefault} = require('../../utils/error-handler');

class TemporalClusterDetection {
    static detect(temporalFocusSet) {
        try {
            debug(`Detecting temporal clusters for ${temporalFocusSet.length} tasks`);
            const clusterTasks = [];
            const clusters = detectTemporalClusters(temporalFocusSet);
            const abstractions = createTemporalClusterAbstractions(clusters);
            clusterTasks.push(...abstractions);
            debug(`Detected ${clusterTasks.length} temporal cluster abstractions`);
            return clusterTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal cluster detection error', []);
        }
    }
}

module.exports = TemporalClusterDetection;