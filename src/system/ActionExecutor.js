const { parseTerm } = require('../parser/TermParser');

/**
 * Action Execution System
 * Executes goals by converting them to concrete actions.
 */

class ActionExecutor {
    constructor() {
        this.actionHandlers = new Map();
        this.registeredActions = new Set();
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
        
        return null;
    }
    
    /**
     * Executes an action.
     * @param {object} action - The action to execute.
     * @returns {Promise<object>} Result of the action execution.
     */
    async executeAction(action) {
        console.log(`Executing action: ${action.name}`, action.parameters);
        
        // Try to find a matching handler
        for (const [pattern, handler] of this.actionHandlers) {
            if (this.matchPattern(action.name, pattern)) {
                try {
                    const result = await handler(action);
                    return {
                        success: true,
                        action: action.name,
                        result
                    };
                } catch (error) {
                    return {
                        success: false,
                        action: action.name,
                        error: error.message
                    };
                }
            }
        }
        
        // No handler found
        return {
            success: false,
            action: action.name,
            error: 'No handler found for action'
        };
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
        
        return await this.executeAction(action);
    }
}

// Create a singleton instance
const actionExecutor = new ActionExecutor();

// Register some default action handlers
actionExecutor.registerActionHandler('print_*', async (action) => {
    const message = action.parameters.join(' ');
    console.log(`PRINT ACTION: ${message}`);
    return { message };
});

actionExecutor.registerActionHandler('log', async (action) => {
    console.log('LOG ACTION:', action.parameters);
    return { logged: true };
});

actionExecutor.registerActionHandler('achieve', async (action) => {
    console.log('ACHIEVE ACTION:', action.parameters);
    return { achieved: action.parameters };
});

module.exports = actionExecutor;