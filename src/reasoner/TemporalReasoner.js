import {createUnifiedErrorHandler} from '../utils/unifiedErrorHandler.js';
import {debug} from '../utils/logger.js';
import * as Module from './temporal/index.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createUnifiedErrorHandler('TemporalReasoner');

class TemporalReasoner {
    constructor(configManager) {
        this.config = createConfigAccessor(configManager, 'temporal');
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
        const config = this.config.get('temporal');
        if (!config) {
            debug('Temporal reasoning disabled - no temporal config found');
            return [];
        }

        return this.inferenceModules.flatMap(Module => {
            const results = errorHandler.executeSync(() => Module.infer(tasks, config), `infer:${Module.name}`, []);
            return Array.isArray(results) ? results : [];
        });
    }
}

export default TemporalReasoner;
