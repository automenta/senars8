import TemporalRelationshipInference from './temporal/TemporalRelationshipInference.js';
import TemporalImplicationInference from './temporal/TemporalImplicationInference.js';
import TemporalPatternDetection from './temporal/TemporalPatternDetection.js';
import TemporalCycleDetection from './temporal/TemporalCycleDetection.js';
import TemporalAbstraction from './temporal/TemporalAbstraction.js';
import TemporalAnomalyDetection from './temporal/TemporalAnomalyDetection.js';
import FutureTaskPrediction from './temporal/FutureTaskPrediction.js';
import TemporalClusterDetection from './temporal/TemporalClusterDetection.js';
import TemporalCoherence from './temporal/TemporalCoherence.js';
import { debug } from '../utils/logger.js';
import { handleErrorWithDefault } from '../utils/error-handler.js';

class TemporalReasoner {
    infer(focusSet) {
        try {
            debug(`Temporal reasoning on ${focusSet.length} tasks`);
            const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
            if (temporalFocusSet.length < 2) {
                debug('Insufficient temporal tasks for reasoning');
                return [];
            }

            debug(`Processing ${temporalFocusSet.length} temporal tasks`);
            const relationshipTasks = TemporalRelationshipInference.infer(temporalFocusSet);
            const implicationTasks = TemporalImplicationInference.infer(temporalFocusSet);
            const patternTasks = TemporalPatternDetection.detect(temporalFocusSet);
            const cycleTasks = TemporalCycleDetection.detect(temporalFocusSet);
            const abstractionTasks = TemporalAbstraction.create(temporalFocusSet);
            const anomalyTasks = TemporalAnomalyDetection.detect(temporalFocusSet);
            const predictionTasks = FutureTaskPrediction.predict(temporalFocusSet);
            const clusterTasks = TemporalClusterDetection.detect(temporalFocusSet);
            const coherenceTasks = TemporalCoherence.calculate(temporalFocusSet);

            const allTasks = [...relationshipTasks, ...implicationTasks, ...patternTasks, ...cycleTasks, ...abstractionTasks, ...anomalyTasks, ...predictionTasks, ...clusterTasks, ...coherenceTasks];
            debug(`Temporal reasoning produced ${allTasks.length} derived tasks`);
            return allTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal reasoning error', []);
        }
    }
}

export default TemporalReasoner;
