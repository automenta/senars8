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
import defaultConfig from '../config/default-config.js';

class TemporalReasoner {
    constructor(config = defaultConfig.temporal) {
        this.config = config;
        // The config can be passed down to sub-modules if they are refactored
        // to be stateful and configurable. For now, they use static methods.
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
            // Pass config to sub-modules if they are updated to accept it
            const relationshipTasks = TemporalRelationshipInference.infer(temporalFocusSet, this.config);
            const implicationTasks = TemporalImplicationInference.infer(temporalFocusSet, this.config);
            const patternTasks = TemporalPatternDetection.detect(temporalFocusSet, this.config);
            const cycleTasks = TemporalCycleDetection.detect(temporalFocusSet, this.config);
            const abstractionTasks = TemporalAbstraction.create(temporalFocusSet, this.config);
            const anomalyTasks = TemporalAnomalyDetection.detect(temporalFocusSet, this.config);
            const predictionTasks = FutureTaskPrediction.predict(temporalFocusSet, this.config);
            const clusterTasks = TemporalClusterDetection.detect(temporalFocusSet, this.config);
            const coherenceTasks = TemporalCoherence.calculate(temporalFocusSet, this.config);

            const allTasks = [...relationshipTasks, ...implicationTasks, ...patternTasks, ...cycleTasks, ...abstractionTasks, ...anomalyTasks, ...predictionTasks, ...clusterTasks, ...coherenceTasks];
            debug(`Temporal reasoning produced ${allTasks.length} derived tasks`);
            return allTasks;
        } catch (err) {
            return handleErrorWithDefault(err, 'Temporal reasoning error', []);
        }
    }
}

export default TemporalReasoner;
