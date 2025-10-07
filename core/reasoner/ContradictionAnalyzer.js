import {CONTRADICTION_TYPES, CONTRADICTION_SEVERITY_WEIGHTS} from './contradiction-types.js';
import {detectionStrategies} from './strategies/detection/index.js';

class ContradictionAnalyzer {
    constructor() {
        this.strategies = detectionStrategies;
    }

    analyze(task1, task2, parsed1, parsed2) {
        for (const strategy of this.strategies) {
            const result = strategy(task1, task2, parsed1, parsed2);
            if (result) return result;
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
