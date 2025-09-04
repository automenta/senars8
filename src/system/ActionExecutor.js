const {parseTerm} = require('../parser/NewParser');
const Task = require('../core/Task');

/**
 * Action Execution System
 * Executes goals by converting them to concrete actions.
 */

class ActionExecutor {
    constructor() {
        this.actionHandlers = new Map();
        this.registeredActions = new Set();
        this.actionHistory = [];
        this.actionPlans = new Map();
    }

    /**
     * Registers an action handler.
     * @param {string} actionPattern - Pattern to match actions (e.g., 'move_*').
     * @param {function} handler - Function to execute the action.
     */
    registerActionHandler(actionPattern, handler) {
        this.actionHandlers.set(actionPattern, handler);
        this.registeredActions.add(actionPattern);
    }

    /**
     * Translates a goal task to an executable action.
     * @param {Task} goalTask - The goal task to translate.
     * @returns {object|null} Action object or null if translation fails.
     */
    translateGoalToAction(goalTask) {
        if (goalTask.punctuation !== '!') {
            return null; // Only goals can be translated to actions
        }

        const parsed = parseTerm(goalTask.termKey);
        if (!parsed) {
            return null;
        }

        // Simple translation rules
        if (parsed.type === 'Atomic') {
            // For atomic goals, try to find a direct action
            return {
                type: 'atomic',
                name: goalTask.termKey,
                parameters: {}
            };
        }

        if (parsed.type === 'Inheritance' && parsed.subject.startsWith('&')) {
            // For compound actions like (&, move, robot, kitchen)
            const parts = parsed.subject.slice(2, -1).split(/\s*,\s*/);
            return {
                type: 'compound',
                name: parts[0],
                parameters: parts.slice(1)
            };
        }

        // Handle conditional actions like (condition ==> action)
        if (parsed.type === 'Implication') {
            return {
                type: 'conditional',
                condition: parsed.subject,
                action: parsed.predicate,
                parameters: {}
            };
        }

        // Handle sequential actions like (&/, action1, action2, action3)
        if (parsed.type === 'Conjunction' && goalTask.termKey.startsWith('(&/')) {
            const actions = parsed.terms.map(term => {
                if (typeof term === 'string') {
                    return {name: term, parameters: {}};
                } else if (term.type === 'Atomic') {
                    return {name: term.key, parameters: {}};
                }
                return null;
            }).filter(Boolean);

            return {
                type: 'sequence',
                actions: actions,
                parameters: {}
            };
        }

        return null;
    }

    /**
     * Executes an action.
     * @param {object} action - The action to execute.
     * @returns {Promise<object>} Result of the action execution.
     */
    async executeAction(action) {
        console.log(`Executing action: ${action.name}`, action.parameters);

        // Record action in history
        const actionRecord = {
            id: Date.now(),
            action: action,
            timestamp: new Date(),
            status: 'pending'
        };
        this.actionHistory.push(actionRecord);

        try {
            // Try to find a matching handler
            for (const [pattern, handler] of this.actionHandlers) {
                if (this.matchPattern(action.name, pattern)) {
                    const result = await handler(action);
                    actionRecord.status = 'completed';
                    actionRecord.result = result;

                    return {
                        success: true,
                        action: action.name,
                        result
                    };
                }
            }

            // No handler found
            actionRecord.status = 'failed';
            actionRecord.error = 'No handler found for action';

            return {
                success: false,
                action: action.name,
                error: 'No handler found for action'
            };
        } catch (error) {
            actionRecord.status = 'failed';
            actionRecord.error = error.message;

            return {
                success: false,
                action: action.name,
                error: error.message
            };
        }
    }

    /**
     * Matches an action name against a pattern.
     * @param {string} actionName - The action name.
     * @param {string} pattern - The pattern to match against.
     * @returns {boolean} True if the action matches the pattern.
     */
    matchPattern(actionName, pattern) {
        if (pattern === '*') return true;
        if (pattern === actionName) return true;

        // Handle wildcards
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return actionName.startsWith(prefix);
        }

        return false;
    }

    /**
     * Executes a goal task by translating it to an action and executing it.
     * @param {Task} goalTask - The goal task to execute.
     * @returns {Promise<object>} Result of the execution.
     */
    async executeGoal(goalTask) {
        const action = this.translateGoalToAction(goalTask);
        if (!action) {
            return {
                success: false,
                task: goalTask.termKey,
                error: 'Failed to translate goal to action'
            };
        }

        // Handle different action types
        switch (action.type) {
            case 'atomic':
            case 'compound':
                return await this.executeAction(action);

            case 'conditional':
                // For conditional actions, we would need to evaluate the condition first
                // This is a simplified implementation
                console.log(`Conditional action: ${action.condition} ==> ${action.action}`);
                return {
                    success: true,
                    task: goalTask.termKey,
                    result: {message: 'Conditional action processed'}
                };

            case 'sequence':
                // Execute a sequence of actions
                const results = [];
                for (const seqAction of action.actions) {
                    const result = await this.executeAction(seqAction);
                    results.push(result);
                    // Stop execution if any action fails
                    if (!result.success) {
                        return {
                            success: false,
                            task: goalTask.termKey,
                            error: `Sequence failed at action: ${seqAction.name}`,
                            partialResults: results
                        };
                    }
                }
                return {
                    success: true,
                    task: goalTask.termKey,
                    results: results
                };

            default:
                return {
                    success: false,
                    task: goalTask.termKey,
                    error: `Unsupported action type: ${action.type}`
                };
        }
    }

    /**
     * Creates and executes a plan to achieve a complex goal.
     * @param {Task} goalTask - The goal task to plan for.
     * @param {Array} availableActions - Available actions to use in planning.
     * @returns {Promise<object>} Result of the plan execution.
     */
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

            const result = await this.executeAction(action);
            executionResults.push({
                step: step.id,
                action: step.action,
                result: result
            });

            // Stop if any step fails
            if (!result.success) {
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

    /**
     * Gets the action history.
     * @returns {Array} Action history.
     */
    getActionHistory() {
        return this.actionHistory;
    }

    /**
     * Gets a specific action plan.
     * @param {string} planId - The plan ID.
     * @returns {object|null} The action plan or null if not found.
     */
    getActionPlan(planId) {
        return this.actionPlans.get(planId) || null;
    }

    /**
     * Gets all action plans.
     * @returns {Map} All action plans.
     */
    getActionPlans() {
        return this.actionPlans;
    }

    /**
     * Cancels a pending action.
     * @param {string} actionId - The action ID.
     * @returns {boolean} True if action was canceled.
     */
    cancelAction(actionId) {
        // In a real implementation, this would send a cancellation signal
        // For now, we'll just mark it in the history
        const actionRecord = this.actionHistory.find(record => record.id === actionId);
        if (actionRecord && actionRecord.status === 'pending') {
            actionRecord.status = 'canceled';
            return true;
        }
        return false;
    }
}

// Create a singleton instance
const actionExecutor = new ActionExecutor();

// Register default action handlers
actionExecutor.registerActionHandler('print_*', async (action) => {
    const message = action.parameters.join(' ');
    console.log(`PRINT ACTION: ${message}`);
    return {message};
});

actionExecutor.registerActionHandler('log', async (action) => {
    console.log('LOG ACTION:', action.parameters);
    return {logged: true};
});

actionExecutor.registerActionHandler('achieve', async (action) => {
    console.log('ACHIEVE ACTION:', action.parameters);
    return {achieved: action.parameters};
});

// Register additional action handlers
actionExecutor.registerActionHandler('create_*', async (action) => {
    const objectType = action.name.replace('create_', '');
    console.log(`CREATE ACTION: Creating ${objectType}`, action.parameters);
    return {created: objectType, parameters: action.parameters};
});

actionExecutor.registerActionHandler('update_*', async (action) => {
    const objectType = action.name.replace('update_', '');
    console.log(`UPDATE ACTION: Updating ${objectType}`, action.parameters);
    return {updated: objectType, parameters: action.parameters};
});

actionExecutor.registerActionHandler('delete_*', async (action) => {
    const objectType = action.name.replace('delete_', '');
    console.log(`DELETE ACTION: Deleting ${objectType}`, action.parameters);
    return {deleted: objectType, parameters: action.parameters};
});

actionExecutor.registerActionHandler('query_*', async (action) => {
    const objectType = action.name.replace('query_', '');
    console.log(`QUERY ACTION: Querying ${objectType}`, action.parameters);
    // Simulate a query result
    return {queried: objectType, result: `Results for ${objectType} with params ${JSON.stringify(action.parameters)}`};
});

actionExecutor.registerActionHandler('analyze', async (action) => {
    console.log('ANALYZE ACTION:', action.parameters);
    return {analyzed: action.parameters, insights: `Analysis of ${action.parameters.join(', ')} completed`};
});

actionExecutor.registerActionHandler('plan', async (action) => {
    console.log('PLAN ACTION:', action.parameters);
    return {
        planned: action.parameters,
        steps: [`Step 1 for ${action.parameters.join(', ')}`, `Step 2 for ${action.parameters.join(', ')}`]
    };
});

actionExecutor.registerActionHandler('execute_*', async (action) => {
    const command = action.name.replace('execute_', '');
    console.log(`EXECUTE ACTION: Executing ${command}`, action.parameters);
    return {executed: command, parameters: action.parameters, status: 'completed'};
});

// Register advanced action handlers
actionExecutor.registerActionHandler('navigate_*', async (action) => {
    const destination = action.name.replace('navigate_', '');
    console.log(`NAVIGATE ACTION: Navigating to ${destination}`, action.parameters);
    return {navigated: destination, path: `path_to_${destination}`, status: 'completed'};
});

actionExecutor.registerActionHandler('communicate_*', async (action) => {
    const recipient = action.name.replace('communicate_', '');
    console.log(`COMMUNICATE ACTION: Communicating with ${recipient}`, action.parameters);
    return {communicated: recipient, message: action.parameters.join(' '), status: 'sent'};
});

actionExecutor.registerActionHandler('learn_*', async (action) => {
    const topic = action.name.replace('learn_', '');
    console.log(`LEARN ACTION: Learning about ${topic}`, action.parameters);
    return {learned: topic, knowledge: `knowledge_about_${topic}`, status: 'completed'};
});

actionExecutor.registerActionHandler('adapt', async (action) => {
    console.log('ADAPT ACTION: Adapting to new conditions', action.parameters);
    return {adapted: true, changes: action.parameters, status: 'completed'};
});

actionExecutor.registerActionHandler('optimize', async (action) => {
    console.log('OPTIMIZE ACTION: Optimizing performance', action.parameters);
    return {optimized: true, metrics: action.parameters, status: 'completed'};
});

actionExecutor.registerActionHandler('coordinate_*', async (action) => {
    const entity = action.name.replace('coordinate_', '');
    console.log(`COORDINATE ACTION: Coordinating with ${entity}`, action.parameters);
    return {coordinated: entity, plan: action.parameters, status: 'completed'};
});

module.exports = actionExecutor;