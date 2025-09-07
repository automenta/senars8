const { MinPriorityQueue } = require('@datastructures-js/priority-queue');

class AStarPlanner {
    constructor(memory) {
        this.memory = memory;
    }

    async findPlan(goalTask, maxIterations = 100) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

        if (this._isAchieved(goalTerm)) {
            return [];
        }

        const openSet = new MinPriorityQueue(
            (node) => node.g + node.h
        );

        const initialState = {
            plan: [],
            tasks: [goalTerm],
            g: 0,
            h: 1,
        };

        openSet.enqueue(initialState);
        const visited = new Set();

        let iterations = 0;
        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            const currentNode = openSet.dequeue();

            if (currentNode.tasks.length === 0) {
                return currentNode.plan;
            }

            const tasksKey = currentNode.tasks.map(t => t.key).join(',');
            if (visited.has(tasksKey)) {
                continue;
            }
            visited.add(tasksKey);

            const [currentTask, ...remainingTasks] = currentNode.tasks;
            const decompositionMethods = this._findDecompositionMethods(currentTask);

            if (decompositionMethods.length === 0) {
                // **CORRECTED LOGIC**: This is a primitive task. It's a leaf node.
                // Add it to the current plan and continue with the remaining tasks.
                const newPlan = [...currentNode.plan, currentTask];
                const newNode = {
                    plan: newPlan,
                    tasks: remainingTasks,
                    g: newPlan.length,
                    h: remainingTasks.length,
                };
                openSet.enqueue(newNode);
            } else {
                // This is a compound task. Expand it.
                for (const method of decompositionMethods) {
                    const subTasks = this._extractSubTasksFromMethod(method.predicate);
                    if (!subTasks) continue;

                    const newTasks = [...subTasks, ...remainingTasks];
                    const newNode = {
                        plan: currentNode.plan,
                        tasks: newTasks,
                        g: currentNode.plan.length,
                        h: newTasks.length,
                    };
                    openSet.enqueue(newNode);
                }
            }
        }

        return null;
    }

    _findDecompositionMethods(goalTerm) {
        if (this._isAchieved(goalTerm)) return [];
        return this.memory.implicationIndex.get(goalTerm.key) || [];
    }

    _isAchieved(term, confidenceThreshold = 0.9) {
        const belief = this.memory.beliefIndex.get(term.key);
        return belief && belief.state.truthValue.confidence >= confidenceThreshold;
    }

    _extractSubTasksFromMethod(methodTerm) {
        if (!methodTerm) return null;
        if (methodTerm.type === 'SequentialConjunction') {
            return methodTerm.terms;
        }
        return [methodTerm];
    }
}

module.exports = AStarPlanner;
