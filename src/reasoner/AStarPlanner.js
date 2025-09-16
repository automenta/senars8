import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import BasePlanner from './BasePlanner.js';

class AStarPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
    }

    async findPlan(goalTask, maxIterations = 1000) {
        const startNode = this.memory.getTerm(goalTask.termKey);
        if (!startNode) return null;

        if (this._isAchieved(startNode)) return [];

        const openSet = new MinPriorityQueue(node => node.f);
        const visited = new Set(); // To avoid cycles and redundant explorations

        const initialState = {
            tasks: [startNode],
            plan: [],
            g: 0,
            h: await this._calculateHeuristic([startNode])
        };
        initialState.f = initialState.g + initialState.h;

        openSet.enqueue(initialState);

        let iterations = 0;
        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            const currentNode = openSet.dequeue();

            if (currentNode.tasks.length === 0) {
                return currentNode.plan.map(key => this.memory.getTerm(key));
            }

            const stateKey = this._getStateKey(currentNode);
            if (visited.has(stateKey)) {
                continue;
            }
            visited.add(stateKey);

            const [currentTask, ...remainingTasks] = currentNode.tasks;

            if (this._isAchieved(currentTask)) {
                const nextNode = {...currentNode, tasks: remainingTasks, g: currentNode.g};
                nextNode.h = await this._calculateHeuristic(nextNode.tasks);
                nextNode.f = nextNode.g + nextNode.h;
                openSet.enqueue(nextNode);
                continue;
            }

            const expansions = this._getExpansions(currentTask);

            for (const expansion of expansions) {
                let newG = currentNode.g;
                let newPlan = currentNode.plan;
                let newTasks;

                if (expansion.method === null) { // Primitive action
                    newG += this.costManager.getActionCost(currentTask);
                    newPlan = [...currentNode.plan, currentTask.key];
                    newTasks = remainingTasks;
                } else { // Decomposition
                    newG += this.costManager.getTaskDifficulty(expansion.method);
                    newTasks = [...expansion.subTasks, ...remainingTasks];
                }

                const nextNode = {
                    tasks: newTasks,
                    plan: newPlan,
                    g: newG,
                    h: await this._calculateHeuristic(newTasks)
                };
                nextNode.f = nextNode.g + nextNode.h;
                openSet.enqueue(nextNode);
            }
        }

        return null; // No plan found
    }

    _getStateKey(node) {
        // A unique key for a state is the combination of remaining tasks and the current plan
        const taskKey = node.tasks.map(t => t.key).join(',');
        const planKey = node.plan.join(',');
        return `${taskKey}|${planKey}`;
    }

    async _calculateHeuristic(tasks) {
        if (!tasks || tasks.length === 0) {
            return 0;
        }
        // Heuristic is the sum of the minimum costs to achieve each remaining task
        const costs = await Promise.all(tasks.map(task => this._getMinTaskCost(task)));
        return costs.reduce((sum, cost) => sum + cost, 0);
    }

    async _getMinTaskCost(task) {
        if (this._isPrimitive(task)) {
            return this.costManager.getActionCost(task);
        }
        const expansions = this._getExpansions(task);
        if (expansions.length === 0) {
            return Infinity; // No way to solve this task
        }

        const expansionCosts = await Promise.all(expansions.map(async (exp) => {
            const subTaskCosts = await Promise.all(exp.subTasks.map(st => this._getMinTaskCost(st)));
            const totalSubTaskCost = subTaskCosts.reduce((s, c) => s + c, 0);
            const decompCost = exp.method ? this.costManager.getTaskDifficulty(exp.method) : 0;
            return decompCost + totalSubTaskCost;
        }));

        return Math.min(...expansionCosts);
    }
}

export default AStarPlanner;
