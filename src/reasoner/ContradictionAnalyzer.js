import { CONTRADICTION_TYPES } from './contradiction-types.js';
import { detectionStrategies } from './strategies/detection/index.js';

const CONTRADICTION_SEVERITY_WEIGHTS = {
    [CONTRADICTION_TYPES.DIRECT_NEGATION]: 1.0,
    [CONTRADICTION_TYPES.INHERITANCE_CONFLICT]: 0.8,
    [CONTRADICTION_TYPES.IMPLICATION_CONFLICT]: 0.8,
    [CONTRADICTION_TYPES.TRANSITIVE_INHERITANCE_CONFLICT]: 0.7,
    [CONTRADICTION_TYPES.EQUIVALENCE_CONFLICT]: 0.7,
    [CONTRADICTION_TYPES.SET_CONFLICT]: 0.7,
    [CONTRADICTION_TYPES.CONJUNCTION_CONFLICT]: 0.65,
    [CONTRADICTION_TYPES.DISJUNCTION_CONFLICT]: 0.65,
    [CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT]: 0.65,
    [CONTRADICTION_TYPES.VARIABLE_CONFLICT]: 0.6,
    [CONTRADICTION_TYPES.TEMPORAL_CONFLICT]: 0.6,
    [CONTRADICTION_TYPES.GOAL_CONFLICT]: 0.6,
    [CONTRADICTION_TYPES.FREQUENCY_CONFLICT]: 0.55
};

class ContradictionAnalyzer {
    constructor() {
        this.strategies = detectionStrategies;
    }

    analyze(task1, task2, parsed1, parsed2) {
        for (const strategy of this.strategies) {
            const result = strategy(task1, task2, parsed1, parsed2);
            if (result) {
                return result;
            }
        }
        return null;
    }

    calculateSeverity(contradictionType, task1, task2) {
        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;
        const typeWeight = CONTRADICTION_SEVERITY_WEIGHTS[contradictionType.type] || 0.5;
        return Math.min(1.0, typeWeight * (c1 + c2) / 2);
    }
}

export default ContradictionAnalyzer;
