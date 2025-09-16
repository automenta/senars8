import {v4 as uuidv4} from 'uuid';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {isNonEmptyArray} from '../utils/index.js';
import EventBus from './EventBus.js';
import defaultConfig from '../config/default-config.js';

const errorHandler = createModuleErrorHandler('ActionExecutor');

class ActionExecutor {
    constructor(memory, config = defaultConfig.ACTION_EXECUTOR) {
        this.memory = memory;
        this.config = config;
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
        this.config.RESOURCES.forEach(res => this.registerResource(res.name, res));
        Object.entries(this.config.CONSTRAINTS).forEach(([name, func]) => {
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
        await this._processQueue();

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
                this._rejectActionWithError(item, validationError);
                this.actionQueue.splice(i, 1);
                i--;
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
            EventBus.emit('ActionExecuted', actionRecord);
        }
    }

    _checkResourceAvailability(action) {
        if (!action.resources || action.resources.length === 0) return true;
        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (!resource || resource.locked) return false;
        }
        return true;
    }

    _createActionRecord(action, actionId) {
        const record = {id: actionId, action, timestamp: new Date(), status: 'pending'};
        this.actionHistory.push(record);
        return record;
    }

    _validate(action) {
        if (!action.name || typeof action.name !== 'string') {
            throw new Error('Action must have a valid name');
        }
        if (action.parameters) {
            if (!isNonEmptyArray(action.parameters)) throw new Error('Action parameters must be an array');
            for (const param of action.parameters) {
                if (!this.memory.getTerm(param)) throw new Error(`Parameter term not found in memory: ${param}`);
            }
        }
        if (action.resources) {
            if (!isNonEmptyArray(action.resources)) throw new Error('Action resources must be an array');
            for (const resourceName of action.resources) {
                if (!this.resources.has(resourceName)) throw new Error(`Resource not registered: ${resourceName}`);
            }
        }
        for (const constraint of this.constraints.values()) {
            if (!constraint(action)) throw new Error('Action violates system constraints');
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
            if (resource) resource.locked = true;
        }
    }

    _releaseResources(action) {
        if (!action.resources || action.resources.length === 0) return;
        for (const resourceName of action.resources) {
            const resource = this.resources.get(resourceName);
            if (resource) resource.locked = false;
        }
    }

    _findHandler(actionName) {
        for (const [pattern, handler] of this.actionHandlers) {
            try {
                const regex = new RegExp(pattern);
                if (regex.test(actionName)) return handler;
            } catch (error) {
                return errorHandler.handleWithDefault(error, '_getActionHandler', null);
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
        return Array.from(this.resources.values());
    }

    getActionHandlers() {
        return Array.from(this.actionHandlers.keys());
    }
}

export default ActionExecutor;
