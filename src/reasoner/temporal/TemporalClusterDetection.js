import {createTemporalClusterAbstractions, detectTemporalClusters} from '../../utils/temporal.js';
import {debug} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalClusterDetection');

class TemporalClusterDetection {
    static detect(temporalFocusSet) {
        return errorHandler.safeSync(() => {
            debug(`Detecting temporal clusters for ${temporalFocusSet.length} tasks`, { module: 'temporal/TemporalClusterDetection' });
            const clusterTasks = [];
            const clusters = detectTemporalClusters(temporalFocusSet);
            const abstractions = createTemporalClusterAbstractions(clusters);
            clusterTasks.push(...abstractions);
            debug(`Detected ${clusterTasks.length} temporal cluster abstractions`, { module: 'temporal/TemporalClusterDetection' });
            return clusterTasks;
        }, 'detect', []);
    }
}

export default TemporalClusterDetection;
