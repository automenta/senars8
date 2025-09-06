const {parseTerm} = require('../parser/narseseParser');
const Task = require('../core/Task');
const actionExecutor = require('./ActionExecutor');

class Planner {
    constructor() {
        this.actionPlans = new Map();
        this.rollbackEnabled = false;
    }

    async planAndExecute(goalTask, availableActions = []) {
        // This is a simplified planning implementation
        // In a more advanced system, this would use automated planning algorithms

        const planId = `plan_${Date.now()}`;

        // Create a simple plan based on the goal
        const plan = {
            id: planId,
            goal: goalTask,
            steps: [],
            created: new Date()
        };

        // For demonstration, we'll create a simple 3-step plan
        plan.steps = [
            {id: 1, action: 'analyze', parameters: [goalTask.termKey], expectedOutcome: 'understanding'},
            {id: 2, action: 'plan', parameters: [goalTask.termKey], expectedOutcome: 'strategy'},
            {id: 3, action: goalTask.termKey, parameters: [], expectedOutcome: 'goal_achieved'}
        ];

        // Store the plan
        this.actionPlans.set(planId, plan);

        // Execute the plan
        const executionResults = [];
        for (const step of plan.steps) {
            const action = {
                name: step.action,
                parameters: step.parameters
            };

            const result = await actionExecutor.executeAction(action);
            executionResults.push({
                step: step.id,
                action: step.action,
                result: result
            });

            // Stop if any step fails
            if (!result.success) {
                // Attempt rollback if enabled
                if (this.rollbackEnabled) {
                    await this.rollbackPlan(planId, executionResults);
                }

                return {
                    success: false,
                    planId: planId,
                    error: `Plan failed at step ${step.id}`,
                    results: executionResults
                };
            }
        }

        return {
            success: true,
            planId: planId,
            results: executionResults
        };
    }

    async rollbackPlan(planId, executedSteps) {
        console.log(`Rolling back plan ${planId}`);

        const rollbackResults = [];

        // Execute rollback actions in reverse order
        for (let i = executedSteps.length - 1; i >= 0; i--) {
            const step = executedSteps[i];
            const rollbackAction = {
                name: `rollback_${step.action}`,
                parameters: step.result ? [step.result] : []
            };

            try {
                const result = await actionExecutor.executeAction(rollbackAction);
                rollbackResults.push({
                    step: step.step,
                    action: rollbackAction.name,
                    result: result
                });
            } catch (error) {
                console.warn(`Failed to rollback step ${step.step}: ${error.message}`);
                rollbackResults.push({
                    step: step.step,
                    action: rollbackAction.name,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            planId: planId,
            rollbackResults: rollbackResults
        };
    }

    enableRollback(enabled) {
        this.rollbackEnabled = enabled;
    }

    getActionPlan(planId) {
        return this.actionPlans.get(planId) || null;
    }

    getActionPlans() {
        return this.actionPlans;
    }

    async createHierarchicalPlan(goalTask, availableActions = [], maxDepth = 3) {
        const planId = `hierarchical_plan_${Date.now()}`;

        // Create a hierarchical plan structure
        const plan = {
            id: planId,
            goal: goalTask,
            root: {
                id: 'root',
                type: 'goal',
                task: goalTask,
                children: [],
                status: 'pending'
            },
            created: new Date(),
            maxDepth: maxDepth
        };

        // Recursively decompose the goal into subgoals
        await this._decomposeGoal(plan.root, availableActions, 0, maxDepth);

        // Store the plan
        this.actionPlans.set(planId, plan);

        return plan;
    }

    async _decomposeGoal(node, availableActions, currentDepth, maxDepth) {
        if (currentDepth >= maxDepth) {
            return;
        }

        // Simple decomposition rules based on the goal term
        const task = node.task;
        const parsed = parseTerm(task.termKey);

        if (!parsed) {
            return;
        }

        // For complex goals, create subgoals
        if (parsed.type === 'Conjunction' && parsed.terms && parsed.terms.length > 1) {
            // Decompose conjunction into individual subgoals
            for (let i = 0; i < parsed.terms.length; i++) {
                const subTerm = parsed.terms[i];
                try {
                    const subTask = new Task(
                        subTerm,
                        '!',
                        {
                            frequency: task.state.truthValue.frequency,
                            confidence: task.state.truthValue.confidence
                        }
                    );

                    const childNode = {
                        id: `subgoal_${i}`,
                        type: 'subgoal',
                        task: subTask,
                        parent: node.id,
                        children: [],
                        status: 'pending'
                    };

                    node.children.push(childNode);
                    await this._decomposeGoal(childNode, availableActions, currentDepth + 1, maxDepth);
                } catch (error) {
                    console.warn(`Failed to create subtask: ${error.message}`);
                }
            }
        } else if (parsed.type === 'Inheritance') {
            // For inheritance goals, create subgoals for subject and predicate
            try {
                const subjectTask = new Task(
                    parseTerm(parsed.subject),
                    '!',
                    {
                        frequency: task.state.truthValue.frequency,
                        confidence: task.state.truthValue.confidence
                    }
                );

                const predicateTask = new Task(
                    parseTerm(parsed.predicate),
                    '!',
                    {
                        frequency: task.state.truthValue.frequency,
                        confidence: task.state.truthValue.confidence
                    }
                );

                const subjectNode = {
                    id: 'subject_subgoal',
                    type: 'subgoal',
                    task: subjectTask,
                    parent: node.id,
                    children: [],
                    status: 'pending'
                };

                const predicateNode = {
                    id: 'predicate_subgoal',
                    type: 'subgoal',
                    task: predicateTask,
                    parent: node.id,
                    children: [],
                    status: 'pending'
                };

                node.children.push(subjectNode, predicateNode);
                await this._decomposeGoal(subjectNode, availableActions, currentDepth + 1, maxDepth);
                await this._decomposeGoal(predicateNode, availableActions, currentDepth + 1, maxDepth);
            } catch (error) {
                console.warn(`Failed to decompose inheritance goal: ${error.message}`);
            }
        }
        // For other types of goals, we might need to create action sequences
        else {
            // Create a simple action sequence for atomic goals
            const actionSequence = await this._createActionSequence(task, availableActions);
            if (actionSequence && actionSequence.length > 0) {
                for (let i = 0; i < actionSequence.length; i++) {
                    const action = actionSequence[i];
                    const actionNode = {
                        id: `action_${i}`,
                        type: 'action',
                        action: action,
                        parent: node.id,
                        children: [],
                        status: 'pending'
                    };
                    node.children.push(actionNode);
                }
            }
        }
    }

    async _createActionSequence(task, availableActions) {
        // Simple action sequence creation based on the task term
        const actions = [];

        // For demonstration, we'll create a simple 3-step sequence
        actions.push({
            name: 'analyze',
            parameters: [task.termKey]
        });

        actions.push({
            name: 'plan',
            parameters: [task.termKey]
        });

        actions.push({
            name: task.termKey,
            parameters: []
        });

        return actions;
    }

    async executeHierarchicalPlan(planId) {
        const plan = this.actionPlans.get(planId);
        if (!plan) {
            return {
                success: false,
                planId: planId,
                error: 'Plan not found'
            };
        }

        // Execute the plan starting from the root
        const result = await this._executePlanNode(plan.root);

        return {
            success: result.success,
            planId: planId,
            result: result
        };
    }

    async _executePlanNode(node) {
        try {
            // Update node status
            node.status = 'executing';

            let result;

            if (node.type === 'goal' || node.type === 'subgoal') {
                // For goals, translate to action and execute
                const action = actionExecutor.translateGoalToAction(node.task);
                if (action) {
                    result = await actionExecutor.executeAction(action);
                } else {
                    // If we can't translate directly, try to create a plan
                    const plan = await this.createHierarchicalPlan(node.task);
                    result = await this.executeHierarchicalPlan(plan.id);
                }
            } else if (node.type === 'action') {
                // For actions, execute directly
                result = await actionExecutor.executeAction(node.action);
            }

            // Execute children if any
            const childResults = [];
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    const childResult = await this._executePlanNode(child);
                    childResults.push(childResult);
                }
            }

            // Update node status
            node.status = result && result.success ? 'completed' : 'failed';

            return {
                node: node.id,
                success: result && result.success,
                result: result,
                children: childResults
            };
        } catch (error) {
            node.status = 'failed';
            return {
                node: node.id,
                success: false,
                error: error.message
            };
        }
    }

    optimizePlan(planId) {
        const plan = this.actionPlans.get(planId);
        if (!plan) {
            return null;
        }

        // Simple optimization: remove duplicate actions
        const seenActions = new Set();
        const optimizedPlan = JSON.parse(JSON.stringify(plan)); // Deep copy

        const optimizeNode = (node) => {
            if (node.type === 'action') {
                const actionKey = `${node.action.name}_${JSON.stringify(node.action.parameters)}`;
                if (seenActions.has(actionKey)) {
                    return null; // Remove duplicate
                }
                seenActions.add(actionKey);
            }

            if (node.children) {
                node.children = node.children.map(optimizeNode).filter(Boolean);
            }

            return node;
        };

        optimizedPlan.root = optimizeNode(optimizedPlan.root);

        // Store the optimized plan
        this.actionPlans.set(`optimized_${planId}`, optimizedPlan);

        return optimizedPlan;
    }
}

module.exports = new Planner();
