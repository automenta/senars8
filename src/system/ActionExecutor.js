import {
    createModuleErrorHandler
} from '../utils/errorHandler.js';
import {
    isNonEmptyArray
} from '../utils/arrayUtils.js';
import {
    generateActionId
} from '../utils/IdGenerator.js';
import EventBus from './EventBus.js';

const errorHandler = createModuleErrorHandler('ActionExecutor');

class ActionExecutor {
    constructor(memory, configManager) {
        this.memory = memory;
        this.configManager = configManager;
        this.actionHandlers = new Map();
        this.actionHistory = [];
        this.resources = new Map();
        this.constraints = new Map();
        this.actionQueue = [];
        this.processing = false;

        this.configManager.getArray('ACTION_EXECUTOR.RESOURCES', []).forEach(res => this.registerResource(res.name, res));
        Object.entries(this.configManager.getObject('ACTION_EXECUTOR.CONSTRAINTS', {})).forEach(([name, func]) => {
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
        const actionId = generateActionId(action.name);
        const promise = new Promise((resolve, reject) => {
            this.actionQueue.push({
                action,
                actionId,
                resolve,
                reject
            });
        });
        this._processQueue();
        return promise;
    }

    async _processQueue() {
        if (this.processing) return;
        this.processing = true;

        const stillQueued = [];
        for (const item of this.actionQueue) {
            if (this._isActionRunnable(item)) {
                await this._processActionItem(item);
            } else {
                stillQueued.push(item);
            }
        }
        this.actionQueue = stillQueued;
        this.processing = false;
    }

    _isActionRunnable(item) {
        return errorHandler.safeSync(() => {
            this._validate(item.action);
            return this._checkResourceAvailability(item.action);
        }, 'isActionRunnable', (validationError) => {
            this._rejectActionWithError(item, validationError);
            return false;
        });
    }

    _rejectActionWithError(item, error) {
        const actionRecord = this._createActionRecord(item.action, item.actionId);
        item.reject(this._recordFailure(actionRecord, error));
    }

    async _processActionItem(item) {
        const {
            action,
            actionId,
            resolve,
            reject
        } = item;
        const actionRecord = this._createActionRecord(action, actionId);

        this._acquireResources(action);
        await errorHandler.safeAsync(async () => {
            const handler = this._findHandler(action.name);
            if (!handler) throw new Error(`No handler for action: ${action.name}`);
            const result = await handler(action);
            resolve(this._recordSuccess(actionRecord, result));
        }, 'processActionItem', (executionError) => {
            reject(this._recordFailure(actionRecord, executionError));
        });
        this._releaseResources(action);
        EventBus.emit('ActionExecuted', actionRecord);
    }

    _checkResourceAvailability(action) {
        return action.resources?.every(resourceName => !this.resources.get(resourceName)?.locked) ?? true;
    }

    _createActionRecord(action, actionId) {
        const record = {
            id: actionId,
            action,
            timestamp: new Date(),
            status: 'pending'
        };
        this.actionHistory.push(record);
        return record;
    }

    _validate(action) {
        if (!action.name || typeof action.name !== 'string') throw new Error('Action must have a valid name');
        if (action.parameters && !isNonEmptyArray(action.parameters)) throw new Error('Action parameters must be a non-empty array');
        if (action.resources && !isNonEmptyArray(action.resources)) throw new Error('Action resources must be a non-empty array');

        action.parameters?.forEach(param => {
            if (!this.memory.getTerm(param)) throw new Error(`Parameter term not found in memory: ${param}`);
        });
        action.resources?.forEach(resourceName => {
            if (!this.resources.has(resourceName)) throw new Error(`Resource not registered: ${resourceName}`);
        });
        for (const constraint of this.constraints.values()) {
            if (!constraint(action)) throw new Error('Action violates system constraints');
        }
    }

    _recordSuccess(actionRecord, result) {
        actionRecord.status = 'completed';
        actionRecord.result = result;
        return {
            success: true,
            result
        };
    }

    _recordFailure(actionRecord, error) {
        actionRecord.status = 'failed';
        actionRecord.error = error.message;
        return {
            success: false,
            error: error.message
        };
    }

    _acquireResources(action) {
        action.resources?.forEach(resourceName => {
            const resource = this.resources.get(resourceName);
            if (resource) resource.locked = true;
        });
    }

    _releaseResources(action) {
        action.resources?.forEach(resourceName => {
            const resource = this.resources.get(resourceName);
            if (resource) resource.locked = false;
        });
    }

    _findHandler(actionName) {
        for (const [pattern, handler] of this.actionHandlers) {
            if (errorHandler.safeSync(() => new RegExp(pattern).test(actionName), `_findHandler RegExp test for pattern: ${pattern}`, false)) {
                return handler;
            }
        }
        return null;
    }

    getActionHistory() {
        return this.actionHistory;
    }

    clearActionHistory() {
        this.actionHistory = [];
    }

    getResources() {
        return [...this.resources.values()];
    }

    getActionHandlers() {
        return [...this.actionHandlers.keys()];
    }
}

export default ActionExecutor;
