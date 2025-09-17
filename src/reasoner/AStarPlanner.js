import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import BasePlanner from './BasePlanner.js';

class AStarPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.heuristicCache = new Map();
    }

    async findPlan(goalTask) {
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
        while (!openSet.isEmpty() && iterations < this.config.maxIterations) {
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
                    // The cost of a decomposition is the cost of its subtasks, which is handled by the heuristic.
                    // The g-value should only reflect the cost of the actions taken so far.
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
        const taskKey = node.tasks.map(t => t.key).sort().join(',');
        const planKey = node.plan.sort().join(',');
        return `${taskKey}|${planKey}`;
    }

    async _calculateHeuristic(tasks, visited = new Set()) {
        if (!tasks || tasks.length === 0) {
            return 0;
        }

        let totalCost = 0;
        for (const task of tasks) {
            if (visited.has(task.key)) {
                // Found a cycle, return infinity to avoid infinite loops
                return Infinity;
            }
            visited.add(task.key);
            totalCost += await this._getMinTaskCost(task, visited);
            visited.delete(task.key);
        }
        return totalCost;
    }

    async _getMinTaskCost(task, visited) {
        if (this.heuristicCache.has(task.key)) {
            return this.heuristicCache.get(task.key);
        }

        if (this._isPrimitive(task)) {
            const cost = this.costManager.getActionCost(task);
            this.heuristicCache.set(task.key, cost);
            return cost;
        }

        const expansions = this._getExpansions(task);
        if (expansions.length === 0) {
            return Infinity; // No way to solve this task
        }

        let minCost = Infinity;
        for (const expansion of expansions) {
            const subTaskCosts = await this._calculateHeuristic(expansion.subTasks, new Set(visited));
            minCost = Math.min(minCost, subTaskCosts);
        }

        this.heuristicCache.set(task.key, minCost);
        return minCost;
    }
}

export default AStarPlanner;
