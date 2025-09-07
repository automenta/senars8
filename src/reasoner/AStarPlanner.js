const { MinPriorityQueue } = require('@datastructures-js/priority-queue');
const BasePlanner = require('./BasePlanner');

class AStarPlanner extends BasePlanner {
    async findPlan(goalTask, maxIterations = 100) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

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

            if (this._isAchieved(currentTask)) {
                const newNode = {
                    plan: currentNode.plan,
                    tasks: remainingTasks,
                    g: currentNode.g,
                    h: remainingTasks.length,
                };
                openSet.enqueue(newNode);
                continue;
            }

            const decompositionMethods = this._findDecompositionMethods(currentTask);

            if (decompositionMethods.length === 0) {
                const newPlan = [...currentNode.plan, currentTask];
                const newNode = {
                    plan: newPlan,
                    tasks: remainingTasks,
                    g: newPlan.length,
                    h: remainingTasks.length,
                };
                openSet.enqueue(newNode);
            } else {
                for (const method of decompositionMethods) {
                    const subject = method.subject;
                    let preconditions = [];
                    if (subject.type === 'SequentialConjunction') {
                        preconditions = subject.terms.slice(1);
                    }

                    if (this._arePreconditionsMet(preconditions)) {
                        const subTasks = this._extractSubTasksFromMethod(method.predicate);
                        if (!subTasks) continue;

                        const newTasks = [...subTasks, ...remainingTasks];
                        const newNode = {
                            plan: currentNode.plan,
                            tasks: newTasks,
                            g: currentNode.g,
                            h: newTasks.length,
                        };
                        openSet.enqueue(newNode);
                    }
                }
            }
        }

        return null;
    }
}

module.exports = AStarPlanner;
