import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import BasePlanner from './BasePlanner.js';

class AStarPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.heuristicCache = new Map();
    }

    async findPlan(goalTask, maxIterations = 1000) {
        const startNode = this.memory.getTerm(goalTask.termKey);
        if (!startNode || this._isAchieved(startNode)) return startNode ? [] : null;

        const openSet = new MinPriorityQueue(node => node.f);
        const visited = new Set();

        openSet.enqueue({
            tasks: [startNode],
            plan: [],
            g: 0,
            h: await this._calculateHeuristic([startNode]),
            f: await this._calculateHeuristic([startNode]),
        });

        for (let i = 0; i < maxIterations && !openSet.isEmpty(); i++) {
            const currentNode = openSet.dequeue();

            if (currentNode.tasks.length === 0) {
                return currentNode.plan.map(key => this.memory.getTerm(key));
            }

            const stateKey = this._getStateKey(currentNode);
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);

            this._expandNode(currentNode, openSet);
        }

        return null;
    }

    _expandNode(currentNode, openSet) {
        const [currentTask, ...remainingTasks] = currentNode.tasks;

        if (this._isAchieved(currentTask)) {
            this._enqueueAchievedNode(currentNode, remainingTasks, openSet);
            return;
        }

        this._getExpansions(currentTask).forEach(expansion => {
            this._enqueueExpansion(expansion, currentNode, remainingTasks, openSet);
        });
    }

    async _enqueueAchievedNode(currentNode, remainingTasks, openSet) {
        const nextNode = {
            ...currentNode,
            tasks: remainingTasks,
            g: currentNode.g
        };
        nextNode.h = await this._calculateHeuristic(nextNode.tasks);
        nextNode.f = nextNode.g + nextNode.h;
        openSet.enqueue(nextNode);
    }

    async _enqueueExpansion(expansion, currentNode, remainingTasks, openSet) {
        const {
            plan,
            g,
            tasks
        } = this._calculateNextState(expansion, currentNode, remainingTasks);
        const h = await this._calculateHeuristic(tasks);
        openSet.enqueue({
            tasks,
            plan,
            g,
            h,
            f: g + h
        });
    }

    _calculateNextState(expansion, currentNode, remainingTasks) {
        if (expansion.method === null) {
            return {
                g: currentNode.g + this.costManager.getActionCost(currentNode.tasks[0]),
                plan: [...currentNode.plan, currentNode.tasks[0].key],
                tasks: remainingTasks,
            };
        }
        return {
            g: currentNode.g,
            plan: currentNode.plan,
            tasks: [...expansion.subTasks, ...remainingTasks],
        };
    }

    _getStateKey(node) {
        const taskKey = node.tasks.map(t => t.key).sort().join(',');
        const planKey = node.plan.sort().join(',');
        return `${taskKey}|${planKey}`;
    }

    async _calculateHeuristic(tasks, visited = new Set()) {
        if (!tasks || tasks.length === 0) return 0;
        let totalCost = 0;
        for (const task of tasks) {
            if (visited.has(task.key)) return Infinity;
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
        if (expansions.length === 0) return Infinity;

        let minCost = Infinity;
        for (const expansion of expansions) {
            minCost = Math.min(minCost, await this._calculateHeuristic(expansion.subTasks, new Set(visited)));
        }
        this.heuristicCache.set(task.key, minCost);
        return minCost;
    }
}

export default AStarPlanner;
