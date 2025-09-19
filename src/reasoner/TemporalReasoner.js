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
            try {
                const moduleResults = Module.infer(tasks, config);
                return Array.isArray(moduleResults) ? moduleResults : [];
            } catch (error) {
                debug(`Error in temporal inference module ${Module.name}:`, error.message);
                return [];
            }
        });
    }
}

export default TemporalReasoner;
