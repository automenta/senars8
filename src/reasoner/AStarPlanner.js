const {MinPriorityQueue} = require('@datastructures-js/priority-queue');
const BasePlanner = require('./BasePlanner');
const {cosineSimilarity} = require('../utils/math');

class AStarPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.config.heuristicWeights = config.heuristicWeights || {
            complexity: 0.4,
            confidence: 0.3,
            semantic: 0.3,
        };
    }

    async findPlan(goalTask, maxIterations = 100) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

        const openSet = new MinPriorityQueue((node) => node.g + node.h);

        const initialState = {
            plan: [],
            tasks: [goalTerm],
            g: 0,
            h: await this._calculateHeuristic([goalTerm], goalTerm),
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

            if (this._isAchieved(currentTask)) {
                const newNode = {
                    plan: currentNode.plan,
                    tasks: remainingTasks,
                    g: currentNode.g,
                    h: await this._calculateHeuristic(remainingTasks, goalTerm),
                };
                openSet.enqueue(newNode);
                continue;
            }

            const expansions = this._getExpansions(currentTask);

            for (const expansion of expansions) {
                if (expansion.method === null && expansion.subTasks.length > 0) {
                    const newPlanKeys = [...currentNode.plan, ...expansion.subTasks.map(t => t.key)];
                    const newPlanTerms = newPlanKeys.map(key => this.memory.getTerm(key));
                    const newNode = {
                        plan: newPlanKeys,
                        tasks: remainingTasks,
                        g: this.costManager.getPlanCost(newPlanTerms),
                        h: await this._calculateHeuristic(remainingTasks, goalTerm),
                    };
                    openSet.enqueue(newNode);
                } else {
                    const newTasks = [...expansion.subTasks, ...remainingTasks];
                    const newNode = {
                        plan: currentNode.plan,
                        tasks: newTasks,
                        g: currentNode.g,
                        h: await this._calculateHeuristic(newTasks, goalTerm),
                    };
                    openSet.enqueue(newNode);
                }
            }
        }

        return null;
    }

    async _calculateHeuristic(tasks, goalTerm) {
        if (tasks.length === 0) return 0;

        const complexityCost = tasks.reduce((acc, task) => acc + this.costManager.getTaskDifficulty(task), 0);

        const confidenceCost = tasks.reduce((acc, task) => {
            const beliefs = this.memory.beliefIndex.get(task.key);
            const confidence = beliefs && beliefs.length > 0 
                ? Math.max(...beliefs.map(b => b.state.truthValue.confidence))
                : 0;
            return acc + (1 - confidence);
        }, 0);

        let semanticCost = 0;
        if (this.lm) {
            const taskEmbeddings = tasks.map(t => t.embedding).filter(Boolean);
            if (taskEmbeddings.length > 0 && goalTerm.embedding) {
                const avgSimilarity = taskEmbeddings.reduce((acc, emb) => acc + cosineSimilarity(emb, goalTerm.embedding), 0) / taskEmbeddings.length;
                semanticCost = 1 - avgSimilarity;
            }
        }

        const {complexity, confidence, semantic} = this.config.heuristicWeights;
        return (complexityCost * complexity) + (confidenceCost * confidence) + (semanticCost * semantic);
    }
}

module.exports = AStarPlanner;
