import CostManager from './CostManager.js';
import * as PlannerUtils from './utils/PlannerUtils.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

class BasePlanner {
    constructor(lm, commandBus, configManager) {
        this.lm = lm;
        this.commandBus = commandBus;
        this.configManager = configManager;
        this.config = createConfigAccessor(configManager, 'BASE_PLANNER');
        this.costManager = new CostManager(commandBus, configManager);
        this.confidenceThreshold = this.config.get('confidenceThreshold', 0.9);
        this.preconditionConfidenceThreshold = this.config.get('preconditionConfidenceThreshold', 0.8);
    }

    async _isAchieved(task) {
        return await PlannerUtils.isAchieved(task, this.commandBus, this.confidenceThreshold);
    }

    async _getDecompositionMethods(task) {
        return await PlannerUtils.findDecompositionMethods(task, this.commandBus);
    }

    /**
     * Determines if a task is a primitive action (i.e., cannot be decomposed further).
     * @param {Term} task - The task term to check.
     * @returns {boolean} True if the task is primitive, false otherwise.
     * @protected
     */
    async _isPrimitive(task) {
        if (!task) return false;
        const methods = await this._getDecompositionMethods(task);
        return methods.length === 0;
    }

    _getSubTasks(method) {
        return PlannerUtils.extractSubTasksFromMethod(method);
    }

    async _arePreconditionsMet(preconditions) {
        return await PlannerUtils.arePreconditionsMet(preconditions, this.commandBus, this.preconditionConfidenceThreshold);
    }

    async _getExpansions(task) {
        if (task.type === 'SequentialConjunction') {
            const subTasks = this._getSubTasks(task);
            return subTasks ? [{
                subTasks,
                method: null,
                preconditions: []
            }] : [];
        }

        const decompositionMethods = await this._getDecompositionMethods(task);

        if (decompositionMethods.length === 0 && (await this._isPrimitive(task))) {
            return [{
                subTasks: [task],
                method: null,
                preconditions: []
            }];
        }

        const expansions = [];
        for (const method of decompositionMethods) {
            const {
                subject
            } = method;
            let preconditions = [];

            if (subject.type === 'SequentialConjunction') {
                preconditions = subject.terms.slice(1);
            }

            if (await this._arePreconditionsMet(preconditions)) {
                const subTasks = this._getSubTasks(method.predicate);
                if (subTasks) {
                    expansions.push({
                        subTasks,
                        method,
                        preconditions
                    });
                }
            }
        }

        return expansions;
    }
}

export default BasePlanner;
