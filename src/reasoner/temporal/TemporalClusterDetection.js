import {detectTemporalClusters, createTemporalClusterAbstractions} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/errorHandler.js';

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

export default TemporalClusterDetection;
