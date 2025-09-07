const { v4: uuidv4 } = require('uuid');
const { ACTION_EXECUTOR } = require('../config');
const Action = require('../core/Action');

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
        let resourcesAcquired = false;
        try {
            this._validate(action);
            this._acquireResources(action);
            resourcesAcquired = true;

            const handler = this._findHandler(action.name);
            const result = await handler(action);
            return this._recordSuccess(actionRecord, result);
        } catch (error) {
            return this._recordFailure(actionRecord, error);
        } finally {
            if (resourcesAcquired) {
                this._releaseResources(action);
            }
        }
    }

    _createActionRecord(action) {
        const record = { id: uuidv4(), action, timestamp: new Date(), status: 'pending' };
        this.actionHistory.push(record);
        return record;
    }

    _validate(action) {
        if (!this._findHandler(action.name)) {
            throw new Error(`No handler found for action: ${action.name}`);
        }

        for (const param of action.parameters) {
            if (!this.memory.getTerm(param)) {
                throw new Error(`Parameter term not found in memory: ${param}`);
            }
        }

        if (!this._checkConstraints(action)) {
            throw new Error('Action violates system constraints');
        }
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
        if (!action.resources) return;

        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (!resource) {
                throw new Error(`Resource not found: ${resourceName}`);
            }
            if (resource.locked) {
                throw new Error(`Resource is locked: ${resourceName}`);
            }
        }

        for (const resourceName of action.resources) {
            this.resources.get(resourceName).locked = true;
        }
    }

    _releaseResources(action) {
        if (!action.resources) return;

        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (resource) {
                resource.locked = false;
            }
        }
    }

    _checkConstraints(action) {
        return Array.from(this.constraints.values()).every(constraint => constraint(action));
    }

    _findHandler(actionName) {
        for (const [pattern, handler] of this.actionHandlers) {
            const regex = new RegExp(pattern);
            if (regex.test(actionName)) {
                return handler;
            }
        }
        return null;
    }
}

module.exports = ActionExecutor;