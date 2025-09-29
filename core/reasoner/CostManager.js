import createConfigAccessor from '../config/ConfigAccessor.js';

class CostManager {
    constructor(memory, configManager) {
        this.memory = memory;
        this.config = createConfigAccessor(configManager, 'COST_MANAGER');
        this.defaultCost = this.config.get('defaultCost', 1);
    }

    getTaskDifficulty(taskTerm) {
        const methods = this.memory.indexer.implicationIndex.get(taskTerm.key) || [];
        if (methods.length === 0) return this.getActionCost(taskTerm);

        return methods.reduce((minDifficulty, method) => {
            let methodDifficulty = 0;
            const preconditions = method.subject?.type === 'SequentialConjunction' ? method.subject.terms.slice(1) : [];
            for (const precondition of preconditions) {
                const belief = this.memory.indexer.beliefIndex.get(precondition.key);
                methodDifficulty += 1 - (belief ? belief.state.truthValue.confidence : 0);
            }
            return Math.min(minDifficulty, methodDifficulty);
        }, Infinity);
    }

    getActionCost(actionTerm) {
        return this.memory.indexer.costIndex.get(actionTerm.key) || this.defaultCost;
    }

    getPlanCost(plan) {
        return plan.reduce((totalCost, action) => totalCost + this.getActionCost(action), 0);
    }
}

export default CostManager;
