import TemporalRelationshipInference from './temporal/TemporalRelationshipInference.js';
import TemporalImplicationInference from './temporal/TemporalImplicationInference.js';
import TemporalPatternDetection from './temporal/TemporalPatternDetection.js';
import TemporalCycleDetection from './temporal/TemporalCycleDetection.js';
import TemporalAbstraction from './temporal/TemporalAbstraction.js';
import TemporalAnomalyDetection from './temporal/TemporalAnomalyDetection.js';
import FutureTaskPrediction from './temporal/FutureTaskPrediction.js';
import TemporalClusterDetection from './temporal/TemporalClusterDetection.js';
import TemporalCoherence from './temporal/TemporalCoherence.js';
import {
    debug
} from '../utils/logger.js';
import {
    createModuleErrorHandler
} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalReasoner');

class TemporalReasoner {
    constructor(configManager) {
        this.configManager = configManager;
        this.inferenceModules = [
            TemporalRelationshipInference,
            TemporalImplicationInference,
            TemporalPatternDetection,
            TemporalCycleDetection,
            TemporalAbstraction,
            TemporalAnomalyDetection,
            FutureTaskPrediction,
            TemporalClusterDetection,
            TemporalCoherence,
        ];
    }

    infer(focusSet) {
        return errorHandler.safeSync(() => {
            debug(`Temporal reasoning on ${focusSet.length} tasks`);
            const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
            if (temporalFocusSet.length < 2) {
                debug('Insufficient temporal tasks for reasoning');
                return [];
            }

            debug(`Processing ${temporalFocusSet.length} temporal tasks`);
            const config = this.configManager.get('temporal');
            const allTasks = this.inferenceModules.flatMap(module => module.infer(temporalFocusSet, config));

            debug(`Temporal reasoning produced ${allTasks.length} derived tasks`);
            return allTasks;
        }, 'infer', []);
    }
}

export default TemporalReasoner;
