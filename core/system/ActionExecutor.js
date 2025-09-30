import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import ResourceAllocator from './ResourceAllocator.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import {generateId} from '../utils/idGenerator.js';
import Tools from '../lm/Tools.js';
import NarseseTranslator from '../utils/NarseseTranslator.js';
import {OP} from '../config/constants.js';
import {parseTerm} from '../parser/narseseParser.js';
import { SystemCommands } from './SystemCommands.js';

const errorHandler = createUnifiedErrorHandler('ActionExecutor');

class ActionExecutor {
    constructor(configManager, eventBus, commandBus) {
        this.config = createConfigAccessor(configManager, 'ACTION_EXECUTOR');
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.actionHandlers = new Map();
        this.resources = new Map();
        this.constraints = new Map();
        this.actionHistory = [];
        this.resourceAllocator = new ResourceAllocator();

        // Add tools and translator for operation execution
        this.tools = new Tools();
        this.narseseTranslator = new NarseseTranslator();

        this._initializeResources();
        this._initializeConstraints();

        this.commandBus.handle(SystemCommands.EXECUTE_ACTION, (action) => this.executeAction(action));
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
        // Simple logging instead of using debug method
        console.debug && console.debug(`ActionExecutor: Registered action handler: ${actionPattern}`);
    }

    registerTool(name, handler, metadata = {}) {
        this.tools.registerTool(name, handler, metadata);
        // Simple logging instead of using debug method
        console.debug && console.debug(`ActionExecutor: Registered tool: ${name}`);
    }

    registerMcpTool(name, mcpConfig) {
        this.tools.registerMcpTool(name, mcpConfig);
        // Simple logging instead of using debug method
        console.debug && console.debug(`ActionExecutor: Registered MCP tool: ${name}`);
    }

    registerExternalTool(name, toolInstance) {
        this.tools.registerExternalTool(name, toolInstance);
        // Simple logging instead of using debug method
        console.debug && console.debug(`ActionExecutor: Registered external tool: ${name}`);
    }

    registerResource(name, resource) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Resource name must be a non-empty string');
        }

        this.resources.set(name, resource);
        // Simple logging instead of using debug method
        console.debug && console.debug(`ActionExecutor: Registered resource: ${name}`);
    }

    setConstraint(constraintName, constraintFunction) {
        this.constraints.set(constraintName, constraintFunction);
    }

    getResource(resourceName) {
        return this.resources.get(resourceName);
    }

    /**
     * Execute an action, with special handling for operation terms
     */
    async executeAction(action) {
        return await errorHandler.execute(async () => {
            this._validateAction(action);

            // Check if this is an operation term that should be handled by tools
            if (action.operationTerm) {
                return await this._executeOperation(action.operationTerm);
            }

            const handler = this._findHandler(action.name);
            if (!handler) {
                throw new Error(`No handler found for action: ${action.name}`);
            }

            const actionId = generateId(`action-${action.name}`);
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

                this.eventBus.emit('ActionExecuted', {
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

                this.eventBus.emit('ActionFailed', {
                    id: actionId,
                    action: action.name,
                    error: error.message,
                    duration: endTime - startTime
                });

                throw error;
            }
        }, `executeAction: ${action.name}`);
    }

    /**
     * Execute an operation term using the tools system
     */
    async _executeOperation(operationTerm) {
        if (!operationTerm) {
            throw new Error('Operation term cannot be null or undefined');
        }

        try {
            // Extract operation name and arguments from the Narsese operation term
            const extracted = this.narseseTranslator.extractArgumentsFromGoal({
                term: operationTerm
            });

            if (!extracted.operationName) {
                throw new Error(`Could not extract operation name from term: ${JSON.stringify(operationTerm)}`);
            }

            // Validate extracted arguments
            const validatedArgs = Array.isArray(extracted.args) ? extracted.args : [];

            const startTime = Date.now();
            const result = await this.tools.executeTool(extracted.operationName, validatedArgs);
            const endTime = Date.now();

            // Convert the result back to a Narsese belief for learning
            const belief = this.narseseTranslator.resultToNarseseBelief(
                result,
                extracted.operationName,
                {
                    frequency: 0.9,
                    confidence: 0.9
                }
            );

            // Add to history
            const executionId = generateId(`operation-${extracted.operationName}`);
            this.actionHistory.push({
                id: executionId,
                action: extracted.operationName,
                parameters: validatedArgs,
                result,
                startTime,
                endTime,
                duration: endTime - startTime,
                status: 'success',
                type: 'operation'
            });

            this.eventBus.emit('OperationExecuted', {
                id: executionId,
                operation: extracted.operationName,
                result,
                duration: endTime - startTime,
                narseseBelief: belief
            });

            return {result, narseseBelief: belief};
        } catch (error) {
            const endTime = Date.now();
            const executionId = generateId(`operation-error-${Date.now()}`);

            this.actionHistory.push({
                id: executionId,
                action: operationTerm?.subject?.key || operationTerm?.name || 'unknown',
                parameters: operationTerm?.predicate?.terms || [],
                error: error.message,
                startTime: Date.now(), // Use current time as fallback
                endTime: endTime,
                duration: endTime - Date.now(),
                status: 'error',
                type: 'operation'
            });

            this.eventBus.emit('OperationFailed', {
                id: executionId,
                operation: operationTerm?.subject?.key || operationTerm?.name || 'unknown',
                error: error.message,
                duration: endTime - Date.now()
            });

            throw error;
        }
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
            // Check if this is an operation term
            if (action.operationTerm) {
                const result = await this._executeOperation(action.operationTerm);
                resolve(this._recordSuccess(actionRecord, result));
            } else {
                const handler = this._findHandler(action.name);
                if (!handler) throw new Error(`No handler for action: ${action.name}`);
                const result = await handler(action);
                resolve(this._recordSuccess(actionRecord, result));
            }
        }, 'processActionItem', (executionError) => {
            reject(this._recordFailure(actionRecord, executionError));
        });
        this._releaseResources(action);
        this.eventBus.emit('ActionExecuted', actionRecord);
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
            if (!action?.name && !action?.operationTerm) {
                throw new Error('Action name or operationTerm is required');
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

    /**
     * Get tools instance for external access
     */
    getTools() {
        return this.tools;
    }

    /**
     * Check if a parsed term is an operation
     */
    isOperationTerm(term) {
        return term && term.type === OP.OPERATION;
    }

    /**
     * Execute a Narsese operation string directly
     */
    async executeNarseseOperation(narseseString) {
        if (typeof narseseString !== 'string') {
            throw new Error('Narsese string must be provided');
        }

        const parsedTerm = parseTerm(narseseString);
        if (!parsedTerm || parsedTerm.type !== OP.OPERATION) {
            throw new Error(`Invalid operation term: ${narseseString}`);
        }

        return await this._executeOperation(parsedTerm);
    }
}

export default ActionExecutor;
