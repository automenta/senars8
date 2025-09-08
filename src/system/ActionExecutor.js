const {v4: uuidv4} = require('uuid');
const config = require('../config');
const {handleErrorWithDefault} = require('../utils/error-handler');
const {isNonEmptyArray} = require('../utils/array-utils');
const Action = require('../core/Action');

class ActionExecutor {
    constructor(memory) {
        this.memory = memory;
        this.actionHandlers = new Map();
        this.actionHistory = [];
        this.resources = new Map();
        this.constraints = new Map();

        this.actionQueue = [];
        this.pendingActions = new Map();
        this.processing = false;

        this._initializeFromConfig();
    }

    _initializeFromConfig() {
        config.ACTION_EXECUTOR.RESOURCES.forEach(res => this.registerResource(res.name, res));
        Object.entries(config.ACTION_EXECUTOR.CONSTRAINTS).forEach(([name, func]) => {
            this.setConstraint(name, func.bind(this));
        });
    }

    registerActionHandler(actionPattern, handler) {
        this.actionHandlers.set(actionPattern, handler);
    }

    registerResource(resourceName, availability) {
        this.resources.set(resourceName, {
            name: resourceName,
            ...availability,
            reservations: [],
            locked: false
        });
    }

    setConstraint(constraintName, constraintFunction) {
        this.constraints.set(constraintName, constraintFunction);
    }

    async execute(action) {
        const actionId = uuidv4();
        const promise = new Promise((resolve, reject) => {
            this.pendingActions.set(actionId, {resolve, reject});
        });

        this.actionQueue.push({action, actionId});
        this._processQueue();

        return promise;
    }

    async _processQueue() {
        if (this.processing) return;
        this.processing = true;

        try {
            let processedAnAction = true;
            while (processedAnAction) {
                processedAnAction = false;
                const nextRunnableIndex = this._findNextRunnableAction();

                if (nextRunnableIndex !== -1) {
                    const item = this.actionQueue.splice(nextRunnableIndex, 1)[0];
                    await this._processActionItem(item);
                    processedAnAction = true;
                }
            }
        } finally {
            this.processing = false;
        }
    }

    _findNextRunnableAction() {
        for (let i = 0; i < this.actionQueue.length; i++) {
            const item = this.actionQueue[i];
            try {
                this._validate(item.action);
                if (this._checkResourceAvailability(item.action)) {
                    return i;
                }
            } catch (validationError) {
                // Invalid action, remove it from the queue and reject
                this._rejectActionWithError(item, validationError);
                // Remove the item from the queue since we've already processed it
                this.actionQueue.splice(i, 1);
                i--; // Adjust index after removal
            }
        }
        return -1;
    }

    _rejectActionWithError(item, error) {
        const pendingAction = this.pendingActions.get(item.actionId);
        if (pendingAction) {
            const {reject} = pendingAction;
            const actionRecord = this._createActionRecord(item.action, item.actionId);
            reject(this._recordFailure(actionRecord, error));
            this.pendingActions.delete(item.actionId);
        }
    }

    async _processActionItem(item) {
        const {action, actionId} = item;
        const {resolve, reject} = this.pendingActions.get(actionId);
        const actionRecord = this._createActionRecord(action, actionId);

        this._acquireResources(action);
        try {
            const handler = this._findHandler(action.name);
            if (!handler) {
                throw new Error(`No handler found for action: ${action.name}`);
            }
            
            const result = await handler(action);
            resolve(this._recordSuccess(actionRecord, result));
        } catch (executionError) {
            reject(this._recordFailure(actionRecord, executionError));
        } finally {
            this._releaseResources(action);
            this.pendingActions.delete(actionId);
        }
    }

    _checkResourceAvailability(action) {
        if (!action.resources || action.resources.length === 0) return true;

        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (!resource) {
                return false;
            }
            if (resource.locked) {
                return false;
            }
        }
        return true;
    }

    _createActionRecord(action, actionId) {
        const record = {id: actionId, action, timestamp: new Date(), status: 'pending'};
        this.actionHistory.push(record);
        return record;
    }

    _validate(action) {
        // Validate action name
        if (!action.name || typeof action.name !== 'string') {
            throw new Error('Action must have a valid name');
        }

        // Validate parameters
        if (action.parameters) {
            if (!isNonEmptyArray(action.parameters)) {
                throw new Error('Action parameters must be an array');
            }
            
            for (const param of action.parameters) {
                if (!this.memory.getTerm(param)) {
                    throw new Error(`Parameter term not found in memory: ${param}`);
                }
            }
        }

        // Validate resources
        if (action.resources) {
            if (!isNonEmptyArray(action.resources)) {
                throw new Error('Action resources must be an array');
            }
            
            for (const resourceName of action.resources) {
                if (!this.resources.has(resourceName)) {
                    throw new Error(`Resource not registered: ${resourceName}`);
                }
            }
        }

        // Check constraints
        if (!this._checkConstraints(action)) {
            throw new Error('Action violates system constraints');
        }
    }

    _recordSuccess(actionRecord, result) {
        actionRecord.status = 'completed';
        actionRecord.result = result;
        return {success: true, result};
    }

    _recordFailure(actionRecord, error) {
        actionRecord.status = 'failed';
        actionRecord.error = error.message;
        return {success: false, error: error.message};
    }

    _acquireResources(action) {
        if (!action.resources || action.resources.length === 0) return;
        
        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (resource) {
                resource.locked = true;
            }
        }
    }

    _releaseResources(action) {
        if (!action.resources || action.resources.length === 0) return;
        
        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (resource) {
                resource.locked = false;
            }
        }
    }

    _checkConstraints(action) {
        return Array.from(this.constraints.values()).every(constraint => {
            try {
                return constraint(action);
            } catch (error) {
                return handleErrorWithDefault(error, 'Constraint check failed', false);
            }
        });
    }

    _findHandler(actionName) {
        for (const [pattern, handler] of this.actionHandlers) {
            try {
                const regex = new RegExp(pattern);
                if (regex.test(actionName)) {
                    return handler;
                }
            } catch (error) {
                return handleErrorWithDefault(error, `Invalid regex pattern in action handler: ${pattern}`, false);
            }
        }
        return null;
    }

    /**
     * Get action history
     * @returns {Array} Action history
     */
    getActionHistory() {
        return this.actionHistory;
    }

    /**
     * Clear action history
     */
    clearActionHistory() {
        this.actionHistory = [];
    }

    /**
     * Get registered resources
     * @returns {Array} Registered resources
     */
    getResources() {
        return Array.from(this.resources.values());
    }

    /**
     * Get registered action handlers
     * @returns {Array} Registered action handlers
     */
    getActionHandlers() {
        return Array.from(this.actionHandlers.keys());
    }
}

module.exports = ActionExecutor;