import {detectionStrategies} from './strategies/detection/index.js';
import {calculateSeverity} from './ContradictionUtils.js';

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
        return calculateSeverity(contradictionType.type, task1, task2);
    }
}

export default ContradictionAnalyzer;
