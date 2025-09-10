import {detectTemporalClusters} from '../../utils/temporal/pattern-detection.js';
import {createTemporalClusterAbstractions} from '../../utils/temporal/task-creation.js';
import {debug} from '../../utils/logger.js';
import {handleErrorWithDefault} from '../../utils/error-handler.js';

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