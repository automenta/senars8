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
import {handleErrorWithDefault} from '../utils/errorHandler.js';

class TemporalReasoner {
    constructor(configManager) {
        this.configManager = configManager;
    }

    infer(focusSet) {
        try {
            debug(`Temporal reasoning on ${focusSet.length} tasks`);
            const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
            if (temporalFocusSet.length < 2) {
                debug('Insufficient temporal tasks for reasoning');
                return [];
            }

            debug(`Processing ${temporalFocusSet.length} temporal tasks`);
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
            debug(`Temporal reasoning produced ${allTasks.length} derived tasks`);
            return allTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal reasoning error', []);
        }
    }
}

export default TemporalReasoner;
