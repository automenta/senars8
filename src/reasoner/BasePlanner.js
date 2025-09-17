import CostManager from './CostManager.js';
import * as PlannerUtils from './utils/PlannerUtils.js';
import globalConfig from '../config/index.js';

class BasePlanner {
    constructor(memory, lm, config = {}) {
        this.memory = memory;
        this.lm = lm;
        this.costManager = new CostManager(memory, config);
        this.config = {
            confidenceThreshold: config.confidenceThreshold || globalConfig.DEFAULT_TRUTH_VALUE.confidence,
            preconditionConfidenceThreshold: config.preconditionConfidenceThreshold || 0.8
        };
    }

    _isAchieved(task) {
        return PlannerUtils.isAchieved(task, this.memory, this.config);
    }

    _getDecompositionMethods(task) {
        return PlannerUtils.findDecompositionMethods(task, this.memory);
    }

    /**
     * Determines if a task is a primitive action (i.e., cannot be decomposed further).
     * @param {Term} task - The task term to check.
     * @returns {boolean} True if the task is primitive, false otherwise.
     * @protected
     */
    _isPrimitive(task) {
        if (!task) return false;
        // A task is primitive if it has no decomposition methods in the knowledge base.
        return this._getDecompositionMethods(task).length === 0;
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
            // This is a primitive action, it "expands" to itself.
            return [{subTasks: [task], method: null, preconditions: []}];
        }

        const expansions = [];
        for (const method of decompositionMethods) {
            const {subject} = method;
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
