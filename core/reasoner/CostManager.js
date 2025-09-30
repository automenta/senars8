import createConfigAccessor from '../config/ConfigAccessor.js';
import {
    SystemCommands
} from '../system/SystemCommands.js';

class CostManager {
    constructor(commandBus, configManager) {
        this.commandBus = commandBus;
        this.config = createConfigAccessor(configManager, 'COST_MANAGER');
        this.defaultCost = this.config.get('defaultCost', 1);
    }

    async getTaskDifficulty(taskTerm) {
        const methods = await this.commandBus.request(SystemCommands.MEMORY_GET_IMPLICATIONS, taskTerm.key) || [];
        if (methods.length === 0) return await this.getActionCost(taskTerm);

        let minDifficulty = Infinity;
        for (const method of methods) {
            let methodDifficulty = 0;
            const preconditions = method.subject?.type === 'SequentialConjunction' ? method.subject.terms.slice(1) : [];
            for (const precondition of preconditions) {
                const beliefs = await this.commandBus.request(SystemCommands.MEMORY_QUERY_TASKS, {
                    termKey: precondition.key,
                    punctuation: '.',
                    limit: 1
                });
                const belief = beliefs && beliefs[0];
                methodDifficulty += 1 - (belief ? belief.state.truthValue.confidence : 0);
            }
            minDifficulty = Math.min(minDifficulty, methodDifficulty);
        }
        return minDifficulty;
    }

    async getActionCost(actionTerm) {
        const cost = await this.commandBus.request(SystemCommands.MEMORY_GET_COST, actionTerm.key);
        return cost ?? this.defaultCost;
    }

    async getPlanCost(plan) {
        let totalCost = 0;
        for (const action of plan) {
            totalCost += await this.getActionCost(action);
        }
        return totalCost;
    }
}

export default CostManager;
