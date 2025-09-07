const { v4: uuidv4 } = require('uuid');

const { ACTION_EXECUTOR } = require('../config');

class ActionExecutor {
    constructor(memory) {
        this.memory = memory;
        this.actionHandlers = new Map();
        this.actionHistory = [];
        this.resources = new Map();
        this.constraints = new Map();
        this._initializeFromConfig();
    }

    _initializeFromConfig() {
        ACTION_EXECUTOR.RESOURCES.forEach(res => this.registerResource(res.name, res));
        for (const [name, func] of Object.entries(ACTION_EXECUTOR.CONSTRAINTS)) {
            this.setConstraint(name, func.bind(this));
        }
    }

    registerActionHandler(actionPattern, handler) {
        this.actionHandlers.set(actionPattern, handler);
    }

    registerResource(resourceName, availability) {
        this.resources.set(resourceName, {
            name: resourceName,
            ...availability,
            reservations: [],
        });
    }

    setConstraint(constraintName, constraintFunction) {
        this.constraints.set(constraintName, constraintFunction);
    }

    checkConstraints(action) {
        for (const [name, constraint] of this.constraints) {
            if (!constraint(action)) {
                console.warn(`Constraint ${name} not satisfied for action ${action.name}`);
                return false;
            }
        }
        return true;
    }

    async execute(action) {
        console.log(`Executing action: ${action.name}`, action.parameters);

        const actionRecord = {
            id: uuidv4(),
            action,
            timestamp: new Date(),
            status: 'pending',
        };
        this.actionHistory.push(actionRecord);

        try {
            if (!this.checkConstraints(action)) {
                actionRecord.status = 'failed';
                actionRecord.error = 'Constraints not satisfied';
                return { success: false, error: actionRecord.error };
            }

            for (const [pattern, handler] of this.actionHandlers) {
                if (this.matchPattern(action.name, pattern)) {
                    const result = await handler(action);
                    actionRecord.status = 'completed';
                    actionRecord.result = result;
                    return { success: true, result };
                }
            }

            actionRecord.status = 'failed';
            actionRecord.error = 'No handler found for action';
            return { success: false, error: actionRecord.error };
        } catch (error) {
            actionRecord.status = 'failed';
            actionRecord.error = error.message;
            return { success: false, error: error.message };
        }
    }

    matchPattern(actionName, pattern) {
        if (pattern === '*' || pattern === actionName) return true;
        if (pattern.endsWith('*')) {
            return actionName.startsWith(pattern.slice(0, -1));
        }
        return false;
    }
}

module.exports = ActionExecutor;