import { createModuleErrorHandler } from '../utils/common.js';
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
import ConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createModuleErrorHandler('TemporalReasoner');

class TemporalReasoner {
    constructor(configManager) {
        this.config = new ConfigAccessor(configManager);
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

    infer(tasks) {
        const config = this.config.get('temporal');
        if (!config) {
            debug('Temporal reasoning disabled - no temporal config found');
            return [];
        }

        return this.inferenceModules.flatMap(Module => {
            const results = errorHandler.safeSync(() => Module.infer(tasks, config), `infer:${Module.name}`, []);
            return Array.isArray(results) ? results : [];
        });
    }
}

export default TemporalReasoner;
