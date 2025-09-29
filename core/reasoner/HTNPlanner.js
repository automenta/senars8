import BasePlanner from './BasePlanner.js';
import {debug} from '../utils/logger.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

class HTNPlanner extends BasePlanner {
    constructor(memory, lm, configManager) {
        super(memory, lm, configManager);
        this.config = createConfigAccessor(configManager, 'HTN_PLANNER');
        this.maxDepth = this.config.get('maxDepth', 10);
        this.planCache = new Map();
    }

    async findPlan(goalTask) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) {
            debug('HTNPlanner: Goal term not found in memory.', {
                goalTask
            });
            return null;
        }
        debug('HTNPlanner: Starting plan search for goal:', {
            goal: goalTask.termKey
        });
        const plan = await this._decompose(goalTerm, [], 0);
        if (plan) {
            debug('HTNPlanner: Plan found for goal:', {
                goal: goalTask.termKey,
                plan: plan.map(t => t.key)
            });
        } else {
            debug('HTNPlanner: No plan found for goal:', {
                goal: goalTask.termKey
            });
        }
        return plan;
    }

    async _decompose(task, visited, depth) {
        const taskKey = task.key;
        if (this.planCache.has(taskKey)) {
            debug('HTNPlanner: Cache hit for task:', {
                task: taskKey
            });
            return this.planCache.get(taskKey);
        }

        if (visited.includes(taskKey)) {
            debug('HTNPlanner: Cyclic dependency detected for task:', {
                task: taskKey,
                visited
            });
            return null; // Cyclic dependency
        }

        if (depth > this.maxDepth) {
            debug('HTNPlanner: Max depth exceeded for task:', {
                task: taskKey,
                depth
            });
            return null;
        }

        if (this._isAchieved(task)) {
            debug('HTNPlanner: Task already achieved:', {
                task: taskKey
            });
            return [];
        }

        if (this._isPrimitive(task)) {
            debug('HTNPlanner: Primitive task:', {
                task: taskKey
            });
            return [task];
        }

        const expansions = this._getExpansions(task);
        if (!expansions.length) {
            debug('HTNPlanner: No decomposition methods found for task:', {
                task: taskKey
            });
            return null;
        }

        debug('HTNPlanner: Decomposing task:', {
            task: taskKey,
            methods: expansions.map(e => e.method?.key).filter(Boolean),
            depth
        });

        for (const expansion of expansions) {
            const { subTasks } = expansion;
            if (!subTasks) continue;

            const plan = await this._constructPlanForSubtasks(subTasks, [
                ...visited,
                taskKey
            ], depth);
            if (plan !== null) {
                this.planCache.set(taskKey, plan);
                return plan;
            }
        }

        this.planCache.set(taskKey, null);
        return null;
    }

    async _constructPlanForSubtasks(subTasks, visited, depth) {
        const plan = [];
        for (const subTask of subTasks) {
            const subTaskTerm = this.memory.getTerm(subTask.key);
            if (!subTaskTerm) {
                debug('HTNPlanner: Subtask term not found in memory.', {
                    subTask: subTask.key
                });
                return null;
            }

            const subPlan = await this._decompose(subTaskTerm, visited, depth + 1);
            if (subPlan === null) {
                return null;
            }
            plan.push(...subPlan);
        }
        return plan;
    }
}

export default HTNPlanner;
