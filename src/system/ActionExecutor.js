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

        this.actionQueue = [];
        this.pendingActions = new Map();
        this.processing = false;

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
        const actionId = uuidv4();
        const promise = new Promise((resolve, reject) => {
            this.pendingActions.set(actionId, { resolve, reject });
        });

        this.actionQueue.push({ action, actionId });
        this._processQueue();

        return promise;
    }

    async _processQueue() {
        if (this.processing) return;
        this.processing = true;

        let processedAnAction = true;
        while (processedAnAction) {
            processedAnAction = false;
            let actionToProcess = null;
            let indexToRemove = -1;

            // Find the first runnable action
            for (let i = 0; i < this.actionQueue.length; i++) {
                const item = this.actionQueue[i];
                try {
                    this._validate(item.action);
                    if (this._checkResourceAvailability(item.action)) {
                        actionToProcess = item;
                        indexToRemove = i;
                        break; // Found one, stop searching
                    }
                } catch (validationError) {
                    // Invalid action, remove it from the queue and reject
                    const { reject } = this.pendingActions.get(item.actionId);
                    const actionRecord = this._createActionRecord(item.action, item.actionId);
                    reject(this._recordFailure(actionRecord, validationError));
                    this.pendingActions.delete(item.actionId);
                    this.actionQueue.splice(i, 1);
                    i--; // Adjust index after splice
                }
            }

            if (actionToProcess) {
                // Remove from queue
                this.actionQueue.splice(indexToRemove, 1);

                const { action, actionId } = actionToProcess;
                const { resolve, reject } = this.pendingActions.get(actionId);
                const actionRecord = this._createActionRecord(action, actionId);

                this._acquireResources(action);
                try {
                    const handler = this._findHandler(action.name);
                    const result = await handler(action);
                    resolve(this._recordSuccess(actionRecord, result));
                } catch (executionError) {
                    reject(this._recordFailure(actionRecord, executionError));
                } finally {
                    this._releaseResources(action);
                    this.pendingActions.delete(actionId);
                }
                processedAnAction = true; // Loop again to check for more actions
            }
        }

        this.processing = false;
    }

    _checkResourceAvailability(action) {
        if (!action.resources) return true;

        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (!resource || resource.locked) {
                return false;
            }
        }
        return true;
    }

    _createActionRecord(action, actionId) {
        const record = { id: actionId, action, timestamp: new Date(), status: 'pending' };
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
            if (resource) {
                resource.locked = true;
            }
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