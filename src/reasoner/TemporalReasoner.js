const Task = require('../core/Task');
const {parseTerm} = require('../parser/narseseParser');
const config = require('../config');
const TemporalRelationshipInference = require('./temporal/TemporalRelationshipInference');
const TemporalImplicationInference = require('./temporal/TemporalImplicationInference');
const TemporalPatternDetection = require('./temporal/TemporalPatternDetection');
const TemporalCycleDetection = require('./temporal/TemporalCycleDetection');
const TemporalAbstraction = require('./temporal/TemporalAbstraction');
const TemporalAnomalyDetection = require('./temporal/TemporalAnomalyDetection');
const FutureTaskPrediction = require('./temporal/FutureTaskPrediction');
const TemporalClusterDetection = require('./temporal/TemporalClusterDetection');
const TemporalCoherence = require('./temporal/TemporalCoherence');
const {debug} = require('../utils/logger');
const {handleErrorWithDefault} = require('../utils/error-handler');

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

module.exports = TemporalReasoner;
