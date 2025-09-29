import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {debug, error} from '../utils/logger.js';
import * as Module from './temporal/index.js';

const errorHandler = createUnifiedErrorHandler('TemporalReasoner');

class TemporalReasoner {
    constructor(configAccessor) {
        this.config = configAccessor;
        this.inferenceModules = [
            Module.TemporalRelationshipInference,
            Module.TemporalImplicationInference,
            Module.TemporalPatternDetection,
            Module.TemporalCycleDetection,
            Module.TemporalAbstraction,
            Module.TemporalAnomalyDetection,
            Module.FutureTaskPrediction,
            Module.TemporalClusterDetection,
            Module.TemporalSummaryGeneration
        ];
    }

    infer(tasks) {
        const config = this.config.getObject('temporal');
        if (!config) {
            debug('Temporal reasoning disabled - no temporal config found');
            return [];
        }

        return this.inferenceModules.flatMap(InferenceModule => {
            const moduleName = InferenceModule?.name || 'UnknownModule';
            // Accommodate modules that use `infer`, `detect`, `create`, or `predict` static methods
            const executionFn = InferenceModule?.infer || InferenceModule?.detect || InferenceModule?.create || InferenceModule?.predict || InferenceModule?.default?.infer || InferenceModule?.default?.detect || InferenceModule?.default?.create || InferenceModule?.default?.predict;

            if (typeof executionFn !== 'function') {
                error(`[TemporalReasoner] ${moduleName} does not have a static 'infer', 'detect', 'create', or 'predict' method.`);
                return [];
            }

            const results = errorHandler.executeSync(() => executionFn(tasks, config), `infer:${moduleName}`, []);
            return Array.isArray(results) ? results : [];
        });
    }
}

export default TemporalReasoner;