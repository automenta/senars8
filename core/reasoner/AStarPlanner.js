import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import BasePlanner from './BasePlanner.js';

class AStarPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.heuristicCache = new Map();
    }

    async findPlan(goalTask, maxIterations = 1000) {
        const startNode = this.memory.getTerm(goalTask.termKey);
        if (!startNode) return null;

        // If the goal is already achieved, return an empty plan
        if (this._isAchieved(startNode)) return [];

        const openSet = new MinPriorityQueue(node => node.f);
        const visited = new Set();

        const initialHeuristic = await this._calculateHeuristic([startNode]);
        openSet.enqueue({
            tasks: [startNode],
            plan: [],
            g: 0,
            h: initialHeuristic,
            f: initialHeuristic,
        });

        for (let i = 0; i < maxIterations && !openSet.isEmpty(); i++) {
            const currentNode = openSet.dequeue();

            // If we have no more tasks, we've found a complete plan
            if (currentNode.tasks.length === 0) {
                return currentNode.plan.map(key => {
                    const term = this.memory.getTerm(key);
                    return term || {key}; // Return a minimal object if term not found
                });
            }

            const stateKey = this._getStateKey(currentNode);
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);

            await this._expandNode(currentNode, openSet);
        }

        return null;
    }

    async _expandNode(currentNode, openSet) {
        const [currentTask, ...remainingTasks] = currentNode.tasks;

        if (this._isAchieved(currentTask)) {
            await this._enqueueAchievedNode(currentNode, remainingTasks, openSet);
            return;
        }

        const expansions = this._getExpansions(currentTask);
        for (const expansion of expansions) {
            await this._enqueueExpansion(expansion, currentNode, remainingTasks, openSet);
        }
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

    async _calculateHeuristic(tasks, visited = new Set()) {
        if (!tasks || tasks.length === 0) return 0;
        let totalCost = 0;
        for (const task of tasks) {
            if (visited.has(task.key)) return Infinity; // Cycle detected
            const newVisited = new Set(visited);
            newVisited.add(task.key);
            totalCost += await this._getMinTaskCost(task, newVisited);
        }
        return totalCost;
    }

    async _getMinTaskCost(task, visited) {
        const cacheKey = task.key;
        if (this.heuristicCache.has(cacheKey)) {
            return this.heuristicCache.get(cacheKey);
        }

        if (this._isPrimitive(task)) {
            const cost = this.costManager.getActionCost(task);
            this.heuristicCache.set(cacheKey, cost);
            return cost;
        }

        const expansions = this._getExpansions(task);
        if (expansions.length === 0) return Infinity;

        let minCost = Infinity;
        for (const expansion of expansions) {
            minCost = Math.min(minCost, await this._calculateHeuristic(expansion.subTasks, visited));
        }

        if (minCost === Infinity) {
            // All expansions lead to cycles or dead ends, cache this
            this.heuristicCache.set(cacheKey, Infinity);
            return Infinity;
        }

        this.heuristicCache.set(cacheKey, minCost);
        return minCost;
    }
}

export default AStarPlanner;
