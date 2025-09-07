const {parseTerm} = require('../parser/narseseParser');
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
        this.resources = new Map(); // Track resource usage
        this.constraints = new Map(); // Track execution constraints
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
     * Registers a resource with its availability.
     * @param {string} resourceName - Name of the resource.
     * @param {object} availability - Availability information.
     */
    registerResource(resourceName, availability) {
        this.resources.set(resourceName, {
            name: resourceName,
            ...availability,
            reservations: []
        });
    }

    /**
     * Reserves a resource for a specific time period.
     * @param {string} resourceName - Name of the resource.
     * @param {number} startTime - Start time of reservation.
     * @param {number} endTime - End time of reservation.
     * @returns {boolean} True if reservation was successful.
     */
    reserveResource(resourceName, startTime, endTime) {
        const resource = this.resources.get(resourceName);
        if (!resource) return false;

        // Check for conflicts
        for (const reservation of resource.reservations) {
            if ((startTime >= reservation.start && startTime < reservation.end) ||
                (endTime > reservation.start && endTime <= reservation.end) ||
                (startTime <= reservation.start && endTime >= reservation.end)) {
                return false; // Conflict found
            }
        }

        // Add reservation
        resource.reservations.push({start: startTime, end: endTime});
        return true;
    }

    /**
     * Releases a resource reservation.
     * @param {string} resourceName - Name of the resource.
     * @param {number} startTime - Start time of reservation.
     * @returns {boolean} True if reservation was released.
     */
    releaseResource(resourceName, startTime) {
        const resource = this.resources.get(resourceName);
        if (!resource) return false;

        const index = resource.reservations.findIndex(r => r.start === startTime);
        if (index !== -1) {
            resource.reservations.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Sets a constraint on action execution.
     * @param {string} constraintName - Name of the constraint.
     * @param {function} constraintFunction - Function to evaluate the constraint.
     */
    setConstraint(constraintName, constraintFunction) {
        this.constraints.set(constraintName, constraintFunction);
    }

    /**
     * Checks if all constraints are satisfied.
     * @param {object} action - The action to check.
     * @returns {boolean} True if all constraints are satisfied.
     */
    checkConstraints(action) {
        for (const [name, constraint] of this.constraints) {
            if (!constraint(action)) {
                console.warn(`Constraint ${name} not satisfied for action ${action.name}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Maps an array of parsed terms to an array of action objects.
     * @param {Array} terms - Array of parsed terms.
     * @returns {Array} Array of action objects.
     * @private
     */
    _mapTermsToActions(terms) {
        return terms.map(term => {
            if (typeof term === 'string') {
                return {name: term, parameters: {}};
            } else if (term.type === 'Atomic') {
                return {name: term.key, parameters: {}};
            } else if (term.type === 'Inheritance' && term.subject.startsWith('&')) {
                const parts = term.subject.slice(2, -1).split(/\s*,\s*/);
                return {name: parts[0], parameters: parts.slice(1)};
            }
            return null;
        }).filter(Boolean);
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
            const actions = this._mapTermsToActions(parsed.terms);

            return {
                type: 'sequence',
                actions: actions,
                parameters: {}
            };
        }

        // Handle parallel actions like (||, action1, action2, action3)
        if (parsed.type === 'Disjunction' && goalTask.termKey.startsWith('(||')) {
            const actions = this._mapTermsToActions(parsed.terms);

            return {
                type: 'parallel',
                actions: actions,
                parameters: {}
            };
        }

        // Handle choice actions like (|, action1, action2, action3)
        if (parsed.type === 'Disjunction' && goalTask.termKey.startsWith('(|')) {
            const actions = this._mapTermsToActions(parsed.terms);

            return {
                type: 'choice',
                actions: actions,
                parameters: {}
            };
        }

        // Handle complex goal structures
        if (parsed.type === 'Conjunction') {
            // For complex conjunctions, treat as a sequence of actions
            const actions = this._mapTermsToActions(parsed.terms);

            return {
                type: 'sequence',
                actions: actions,
                parameters: {}
            };
        }

        // Handle temporal actions like (Tense, action, time)
        if (parsed.type === 'Conjunction' && parsed.terms && parsed.terms.length === 3) {
            const [tenseTerm, actionTerm, timeTerm] = parsed.terms;
            if (tenseTerm.type === 'Atomic' && ['past', 'present', 'future'].includes(tenseTerm.key)) {
                return {
                    type: 'temporal',
                    tense: tenseTerm.key,
                    action: actionTerm.key || actionTerm,
                    time: timeTerm.key || timeTerm,
                    parameters: {}
                };
            }
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
            // Check constraints before execution
            if (!this.checkConstraints(action)) {
                actionRecord.status = 'failed';
                actionRecord.error = 'Constraints not satisfied';

                return {
                    success: false,
                    action: action.name,
                    error: 'Constraints not satisfied'
                };
            }

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

            case 'parallel':
                // Execute actions in parallel
                const parallelResults = await this.executeParallelActions(action.actions);
                return {
                    success: parallelResults.every(r => r.success),
                    task: goalTask.termKey,
                    results: parallelResults
                };

            case 'choice':
                // Execute one of several alternative actions
                const choiceResult = await this.executeChoiceActions(action.actions);
                return {
                    success: choiceResult.success,
                    task: goalTask.termKey,
                    result: choiceResult
                };

            case 'temporal':
                // Execute temporal action
                return await this.executeTemporalAction(action);

            default:
                return {
                    success: false,
                    task: goalTask.termKey,
                    error: `Unsupported action type: ${action.type}`
                };
        }
    }

    /**
     * Executes a temporal action.
     * @param {object} action - The temporal action to execute.
     * @returns {Promise<object>} Result of the action execution.
     */
    async executeTemporalAction(action) {
        console.log(`Executing temporal action: ${action.tense} ${action.action} at ${action.time}`);

        // For now, we'll just execute the action directly
        // In a more advanced system, we would schedule it for the appropriate time
        const result = await this.executeAction({
            name: action.action,
            parameters: action.parameters
        });

        return {
            success: result.success,
            task: `${action.tense}_${action.action}`,
            result: result,
            temporalInfo: {
                tense: action.tense,
                time: action.time
            }
        };
    }

    /**
     * Executes multiple actions in parallel.
     * @param {Array} actions - Array of actions to execute in parallel.
     * @returns {Promise<Array>} Array of results from each action.
     */
    async executeParallelActions(actions) {
        console.log(`Executing ${actions.length} actions in parallel`);

        // Execute all actions concurrently
        const promises = actions.map(action => this.executeAction(action));
        const results = await Promise.all(promises);

        return results;
    }

    /**
     * Executes one of several alternative actions.
     * @param {Array} actions - Array of alternative actions.
     * @returns {Promise<object>} Result from the first successful action.
     */
    async executeChoiceActions(actions) {
        console.log(`Executing one of ${actions.length} alternative actions`);

        // Try each action in order until one succeeds
        for (const action of actions) {
            const result = await this.executeAction(action);
            if (result.success) {
                return result;
            }
        }

        // If none succeeded, return the last result
        return {
            success: false,
            error: 'All alternative actions failed'
        };
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

// Default resources and constraints can be registered here
// or moved to a separate configuration file.

// Register resources
actionExecutor.registerResource('cpu', { total: 100, unit: 'percent' });
actionExecutor.registerResource('memory', { total: 8192, unit: 'MB' });
actionExecutor.registerResource('network', { total: 1000, unit: 'Mbps' });

// Register constraints
actionExecutor.setConstraint('resource_limit', (action) => {
    // A more meaningful, yet still simple, resource constraint check.
    // This could be expanded to check for actual usage vs. availability.
    if (action.resource_requirements) {
        for (const req of action.resource_requirements) {
            if (!actionExecutor.resources.has(req.name)) {
                console.warn(`Action ${action.name} requires unregistered resource: ${req.name}`);
                return false;
            }
        }
    }
    return true;
});

actionExecutor.setConstraint('safety', (action) => {
    // Safety constraint - prevent dangerous actions
    const dangerousActions = ['delete_system', 'format_disk', 'shutdown_system'];
    return !dangerousActions.includes(action.name);
});


module.exports = actionExecutor;