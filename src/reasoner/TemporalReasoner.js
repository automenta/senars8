import TemporalRelationshipInference from './temporal/TemporalRelationshipInference.js';
import TemporalImplicationInference from './temporal/TemporalImplicationInference.js';
import TemporalPatternDetection from './temporal/TemporalPatternDetection.js';
import TemporalCycleDetection from './temporal/TemporalCycleDetection.js';
import TemporalAbstraction from './temporal/TemporalAbstraction.js';
import TemporalAnomalyDetection from './temporal/TemporalAnomalyDetection.js';
import FutureTaskPrediction from './temporal/FutureTaskPrediction.js';
import TemporalClusterDetection from './temporal/TemporalClusterDetection.js';
import TemporalCoherence from './temporal/TemporalCoherence.js';
import {debug} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('TemporalReasoner');

class TemporalReasoner {
    constructor(configManager) {
        this.configManager = configManager;
    }

    infer(focusSet) {
        return errorHandler.safeSync(() => {
            debug(`Temporal reasoning on ${focusSet.length} tasks`, { module: 'reasoner/TemporalReasoner' });
            const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
            if (temporalFocusSet.length < 2) {
                debug('Insufficient temporal tasks for reasoning', { module: 'reasoner/TemporalReasoner' });
                return [];
            }

            debug(`Processing ${temporalFocusSet.length} temporal tasks`, { module: 'reasoner/TemporalReasoner' });
            const config = this.configManager.get('temporal');
            const relationshipTasks = TemporalRelationshipInference.infer(temporalFocusSet, config);
            const implicationTasks = TemporalImplicationInference.infer(temporalFocusSet, config);
            const patternTasks = TemporalPatternDetection.detect(temporalFocusSet, config);
            const cycleTasks = TemporalCycleDetection.detect(temporalFocusSet, config);
            const abstractionTasks = TemporalAbstraction.create(temporalFocusSet, config);
            const anomalyTasks = TemporalAnomalyDetection.detect(temporalFocusSet, config);
            const predictionTasks = FutureTaskPrediction.predict(temporalFocusSet, config);
            const clusterTasks = TemporalClusterDetection.detect(temporalFocusSet, config);
            const coherenceTasks = TemporalCoherence.calculate(temporalFocusSet, config);

            const allTasks = [...relationshipTasks, ...implicationTasks, ...patternTasks, ...cycleTasks, ...abstractionTasks, ...anomalyTasks, ...predictionTasks, ...clusterTasks, ...coherenceTasks];
            debug(`Temporal reasoning produced ${allTasks.length} derived tasks`, { module: 'reasoner/TemporalReasoner' });
            return allTasks;
        }, 'infer', []);
    }
}

export default TemporalReasoner;
