const { v4: uuidv4 } = require('uuid');
const { ACTION_EXECUTOR } = require('../config');

class Action {
    constructor(name, parameters = []) {
        this.name = name;
        this.parameters = parameters;
    }
}

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
        Object.entries(ACTION_EXECUTOR.CONSTRAINTS).forEach(([name, func]) => {
            this.setConstraint(name, func.bind(this));
        });
    }

    registerActionHandler(actionPattern, handler) {
        this.actionHandlers.set(actionPattern, handler);
    }

    registerResource(resourceName, availability) {
        this.resources.set(resourceName, { name: resourceName, ...availability, reservations: [] });
    }

    setConstraint(constraintName, constraintFunction) {
        this.constraints.set(constraintName, constraintFunction);
    }

    async execute(action) {
        const actionRecord = this._createActionRecord(action);
        try {
            this._validate(action);
            const result = await this._performExecution(action);
            return this._recordSuccess(actionRecord, result);
        } catch (error) {
            this._releaseResources(action); // Release resources on failure
            return this._recordFailure(actionRecord, error);
        }
    }

    _createActionRecord(action) {
        const record = { id: uuidv4(), action, timestamp: new Date(), status: 'pending' };
        this.actionHistory.push(record);
        return record;
    }

    _validate(action) {
        if (!this._checkConstraints(action)) {
            throw new Error('Constraints not satisfied');
        }
        if (!this._findHandler(action.name)) {
            throw new Error('No handler found for action');
        }
    }

    async _performExecution(action) {
        const handler = this._findHandler(action.name);
        this._acquireResources(action);
        const result = await handler(action);
        this._releaseResources(action);
        return result;
    }

    _recordSuccess(actionRecord, result) {
        actionRecord.status = 'completed';
        actionRecord.result = result;
        return { success: true, result };
    }

    _recordFailure(actionRecord, error) {
        actionRecord.status = 'failed';
        actionRecord.error = error.message;
        return { success: false, error: error.message };
    }

    _acquireResources(action) {
        // Placeholder for resource acquisition logic
    }

    _releaseResources(action) {
        // Placeholder for resource release logic
    }

    _checkConstraints(action) {
        return Array.from(this.constraints.values()).every(constraint => constraint(action));
    }

    _findHandler(actionName) {
        for (const [pattern, handler] of this.actionHandlers) {
            if (this._matchPattern(actionName, pattern)) {
                return handler;
            }
        }
        return null;
    }

    _matchPattern(actionName, pattern) {
        if (pattern.endsWith('*')) {
            return actionName.startsWith(pattern.slice(0, -1));
        }
        return pattern === '*' || pattern === actionName;
    }
}

module.exports = { ActionExecutor, Action };