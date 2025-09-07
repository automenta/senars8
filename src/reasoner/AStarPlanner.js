const { MinPriorityQueue } = require('@datastructures-js/priority-queue');
const BasePlanner = require('./BasePlanner');
const PlannerUtils = require('./utils/PlannerUtils');

class AStarPlanner extends BasePlanner {
    async findPlan(goalTask, maxIterations = 100) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

        const openSet = new MinPriorityQueue((node) => node.g + node.h);

        const initialState = {
            plan: [],
            tasks: [goalTerm],
            g: 0,
            h: this._calculateHeuristic([goalTerm]),
        };

        openSet.enqueue(initialState);
        const visited = new Set();

        let iterations = 0;
        while (!openSet.isEmpty() && iterations < maxIterations) {
            iterations++;
            const currentNode = openSet.dequeue();

            if (currentNode.tasks.length === 0) {
                return currentNode.plan.map(termKey => this.memory.getTerm(termKey));
            }

            const tasksKey = currentNode.tasks.map(t => t.key).join(',');
            if (visited.has(tasksKey)) {
                continue;
            }
            visited.add(tasksKey);

            const [currentTask, ...remainingTasks] = currentNode.tasks;

            if (PlannerUtils.isAchieved(currentTask, this.memory, this.config)) {
                const newNode = {
                    plan: currentNode.plan,
                    tasks: remainingTasks,
                    g: currentNode.g,
                    h: this._calculateHeuristic(remainingTasks),
                };
                openSet.enqueue(newNode);
                continue;
            }

            if (currentTask.type === 'SequentialConjunction') {
                const subTasks = PlannerUtils.extractSubTasksFromMethod(currentTask);
                const newTasks = [...subTasks, ...remainingTasks];
                const newNode = {
                    plan: currentNode.plan,
                    tasks: newTasks,
                    g: currentNode.g,
                    h: this._calculateHeuristic(newTasks),
                };
                openSet.enqueue(newNode);
                continue;
            }

            const decompositionMethods = PlannerUtils.findDecompositionMethods(currentTask, this.memory);

            if (decompositionMethods.length === 0) {
                const newPlanKeys = [...currentNode.plan, currentTask.key];
                const newPlanTerms = newPlanKeys.map(key => this.memory.getTerm(key));
                const newNode = {
                    plan: newPlanKeys,
                    tasks: remainingTasks,
                    g: this.costManager.getPlanCost(newPlanTerms),
                    h: this._calculateHeuristic(remainingTasks),
                };
                openSet.enqueue(newNode);
            } else {
                for (const method of decompositionMethods) {
                    const subject = method.subject;
                    let preconditions = [];
                    if (subject.type === 'SequentialConjunction') {
                        preconditions = subject.terms.slice(1);
                    }

                    if (PlannerUtils.arePreconditionsMet(preconditions, this.memory, this.config)) {
                        const subTasks = PlannerUtils.extractSubTasksFromMethod(method.predicate);
                        if (!subTasks) continue;

                        const newTasks = [...subTasks, ...remainingTasks];
                        const newNode = {
                            plan: currentNode.plan,
                            tasks: newTasks,
                            g: currentNode.g,
                            h: this._calculateHeuristic(newTasks),
                        };
                        openSet.enqueue(newNode);
                    }
                }
            }
        }

        return null;
    }

    _calculateHeuristic(tasks) {
        // Heuristic: sum of difficulties of all remaining tasks.
        return tasks.reduce((total, task) => total + this.costManager.getTaskDifficulty(task), 0);
    }
}

module.exports = AStarPlanner;
