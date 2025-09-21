import {createTemporalClusterAbstractions, detectTemporalClusters} from '../../utils/temporal/index.js';
import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/unifiedErrorHandler.js';

const errorHandler = createUnifiedErrorHandler('TemporalClusterDetection');

class TemporalClusterDetection {
    static detect(temporalFocusSet) {
        return errorHandler.executeSync(() => {
            debug(`Detecting temporal clusters for ${temporalFocusSet.length} tasks`);
            const clusterTasks = [];
            const clusters = detectTemporalClusters(temporalFocusSet);
            const abstractions = createTemporalClusterAbstractions(clusters);
            clusterTasks.push(...abstractions);
            debug(`Detected ${clusterTasks.length} temporal cluster abstractions`);
            return clusterTasks;
        }, 'detect', []);
    }
}

export default TemporalClusterDetection;
