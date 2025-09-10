import CostManager from './CostManager.js';
import * as PlannerUtils from './utils/PlannerUtils.js';
import globalConfig from '../config.js';

class BasePlanner {
    constructor(memory, lm, config = {}) {
        this.memory = memory;
        this.lm = lm;
        this.costManager = new CostManager(memory, config);
        this.config = {
            confidenceThreshold: config.confidenceThreshold || globalConfig.DEFAULT_TRUTH_VALUE.confidence,
            preconditionConfidenceThreshold: config.preconditionConfidenceThreshold || 0.8,
        };
    }

    _isAchieved(task) {
        return PlannerUtils.isAchieved(task, this.memory, this.config);
    }

    _getDecompositionMethods(task) {
        return PlannerUtils.findDecompositionMethods(task, this.memory);
    }

    _getSubTasks(method) {
        return PlannerUtils.extractSubTasksFromMethod(method);
    }

    _arePreconditionsMet(preconditions) {
        return PlannerUtils.arePreconditionsMet(preconditions, this.memory, this.config);
    }

    _getExpansions(task) {
        if (task.type === 'SequentialConjunction') {
            const subTasks = this._getSubTasks(task);
            return subTasks ? [{subTasks, method: null, preconditions: []}] : [];
        }

        const decompositionMethods = this._getDecompositionMethods(task);

        if (decompositionMethods.length === 0) {
            return [{subTasks: [task], method: null, preconditions: []}];
        }

        const expansions = [];
        for (const method of decompositionMethods) {
            const subject = method.subject;
            let preconditions = [];

            if (subject.type === 'SequentialConjunction') {
                preconditions = subject.terms.slice(1);
            }

            if (this._arePreconditionsMet(preconditions)) {
                const subTasks = this._getSubTasks(method.predicate);
                if (subTasks) {
                    expansions.push({subTasks, method, preconditions});
                }
            }
        }

        return expansions;
    }
}

export default BasePlanner;
