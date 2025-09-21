import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import ResourceAllocator from './ResourceAllocator.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import EventBus from './EventBus.js';
import { generateActionId } from '../utils/idGenerator.js';

const errorHandler = createUnifiedErrorHandler('ActionExecutor');

class ActionExecutor {
    constructor(memory, configManager) {
        this.memory = memory;
        this.config = createConfigAccessor(configManager, 'ACTION_EXECUTOR');
        this.actionHandlers = new Map();
        this.resources = new Map();
        this.constraints = new Map();
        this.actionHistory = [];
        this.resourceAllocator = new ResourceAllocator();
        this._initializeResources();
        this._initializeConstraints();
    }

    _initializeResources() {
        this.config.getArray('RESOURCES', []).forEach(res => this.registerResource(res.name, res));
        Object.entries(this.config.getObject('CONSTRAINTS', {})).forEach(([name, func]) => {
            this.setConstraint(name, func.bind(this));
        });
    }

    _initializeConstraints() {
        // Initialize default constraints if needed
        // This method can be extended to add default constraints
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

    async executeAction(action) {
        await errorHandler.execute(async () => {
            this._validateAction(action);
            const handler = this._findHandler(action.name);
            if (!handler) {
                throw new Error(`No handler found for action: ${action.name}`);
            }

            const actionId = generateActionId(action);
            const startTime = Date.now();

            try {
                const result = await handler(action);
                const endTime = Date.now();

                this.actionHistory.push({
                    id: actionId,
                    action: action.name,
                    parameters: action.parameters,
                    result,
                    startTime,
                    endTime,
                    duration: endTime - startTime,
                    status: 'success'
                });

                EventBus.emit('ActionExecuted', {
                    id: actionId,
                    action: action.name,
                    result,
                    duration: endTime - startTime
                });

                return result;
            } catch (error) {
                const endTime = Date.now();
                this.actionHistory.push({
                    id: actionId,
                    action: action.name,
                    parameters: action.parameters,
                    error: error.message,
                    startTime,
                    endTime,
                    duration: endTime - startTime,
                    status: 'error'
                });

                EventBus.emit('ActionFailed', {
                    id: actionId,
                    action: action.name,
                    error: error.message,
                    duration: endTime - startTime
                });

                throw error;
            }
        }, `executeAction: ${action.name}`);
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
        return errorHandler.executeSync(() => {
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
        await errorHandler.execute(async () => {
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

    _validateAction(action) {
        return errorHandler.executeSync(() => {
            if (!action?.name) {
                throw new Error('Action name is required');
            }
            if (this.constraints.size === 0) return true;

            for (const [name, constraint] of this.constraints) {
                if (typeof constraint === 'function' && !constraint(action)) {
                    throw new Error(`Action failed constraint: ${name}`);
                }
            }
            return true;
        }, '_validateAction');
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
            if (errorHandler.executeSync(() => new RegExp(pattern).test(actionName), `_findHandler RegExp test for pattern: ${pattern}`, false)) {
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
