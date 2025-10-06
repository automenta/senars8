import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import ResourceAllocator from './ResourceAllocator.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import {generateId} from '../utils/idGenerator.js';
import Tools from '../lm/Tools.js';
import NarseseTranslator from '../utils/NarseseTranslator.js';
import {OP} from '../config/constants.js';
import {parseTerm} from '../parser/narseseParser.js';
import {SystemCommands} from './SystemCommands.js';
import logger from '../utils/logger.js';

const errorHandler = createUnifiedErrorHandler('ActionExecutor');

class ActionExecutor {
    constructor(memory, configManager, eventBus, commandBus) {
        this.memory = memory;
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
        // Method reserved for default constraints
    }

    registerActionHandler(actionPattern, handler) {
        this.actionHandlers.set(actionPattern, handler);
    }

    registerTool(name, handler, metadata = {}) {
        this.tools.registerTool(name, handler, metadata);
    }

    registerMcpTool(name, mcpConfig) {
        this.tools.registerMcpTool(name, mcpConfig);
    }

    registerExternalTool(name, toolInstance) {
        this.tools.registerExternalTool(name, toolInstance);
    }

    registerResource(name, resource) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Resource name must be a non-empty string');
        }

        this.resources.set(name, resource);
        // Simple logging instead of using debug method
        //console.debug && console.debug(`ActionExecutor: Registered resource: ${name}`);
    }

    setConstraint(constraintName, constraintFunction) {
        this.constraints.set(constraintName, constraintFunction);
    }

    getResource(resourceName) {
        return this.resources.get(resourceName);
    }

    async executeAction(action) {
        if (!this._validateAction(action)) {
            return this._handleInvalidAction(action);
        }

        return await errorHandler.execute(async () => {
            return action.operationTerm
                ? await this._executeOperationAction(action)
                : await this._executeRegularAction(action);
        }, `executeAction: ${action?.name || 'undefined'}`);
    }

    _handleInvalidAction(action) {
        const record = this._createExecutionRecord('invalid', action || {});
        this._finalizeExecutionRecord(record, null, new Error('Action failed validation'));

        this._emitExecutionEvent('ActionFailed', record, {
            error: 'Action failed validation'
        });

        return {success: false, error: 'Action failed validation'};
    }

    async _executeOperationAction(action) {
        return await this._executeOperation(action.operationTerm);
    }

    async _executeRegularAction(action) {
        const actionName = action?.name || 'unknown';
        const handler = this._findHandler(actionName);

        if (!handler) {
            return this._handleUnknownAction(actionName, action);
        }

        const record = this._createExecutionRecord(actionName, action.parameters);

        try {
            const result = await handler(action);
            this._finalizeExecutionRecord(record, result);

            this._emitExecutionEvent('ActionExecuted', record, {result});

            return result;
        } catch (error) {
            this._finalizeExecutionRecord(record, null, error);

            this._emitExecutionEvent('ActionFailed', record, {
                error: error.message
            });

            throw error;
        }
    }

    _handleUnknownAction(actionName, action) {
        logger.warn(`No handler found for action: ${actionName}`);

        const record = this._createExecutionRecord(actionName, action?.parameters || {});
        this._finalizeExecutionRecord(record, null,
            new Error(`No handler found for action: ${actionName}`));

        this._emitExecutionEvent('ActionFailed', record, {
            error: `No handler found for action: ${actionName}`
        });

        return {success: false, error: `No handler found for action: ${actionName}`};
    }

    async _executeOperation(operationTerm) {
        if (!operationTerm) {
            throw new Error('Operation term cannot be null or undefined');
        }

        const extracted = this.narseseTranslator.extractArgumentsFromGoal({term: operationTerm});
        if (!extracted.operationName) {
            throw new Error(`Could not extract operation name from term: ${JSON.stringify(operationTerm)}`);
        }

        const record = this._createExecutionRecord(extracted.operationName, extracted.args, 'operation');

        try {
            const result = await this.tools.executeTool(extracted.operationName, extracted.args);
            const belief = this.narseseTranslator.resultToNarseseBelief(result, extracted.operationName, {
                frequency: 0.9,
                confidence: 0.9
            });

            this._finalizeExecutionRecord(record, result);

            this._emitExecutionEvent('OperationExecuted', record, {
                operation: extracted.operationName,
                result,
                narseseBelief: belief
            });

            return {result, narseseBelief: belief};
        } catch (error) {
            this._finalizeExecutionRecord(record, null, error);

            this._emitExecutionEvent('OperationFailed', record, {
                operation: operationTerm?.subject?.key || operationTerm?.name || 'unknown',
                error: error.message
            });

            throw error;
        }
    }


    async _processActionItem(item) {
        const {action, resolve, reject} = item;

        if (!this._validateAction(action)) {
            const record = this._createExecutionRecord('invalid', action || {});
            this._finalizeExecutionRecord(record, null, new Error('Action failed validation'));

            this._emitExecutionEvent('ActionFailed', record, {
                error: 'Action failed validation'
            });

            resolve({success: false, error: 'Action failed validation'});
            return;
        }

        const actionName = action?.name || 'unknown';
        const record = this._createExecutionRecord(actionName, action.parameters);

        this._acquireResources(action);

        await errorHandler.execute(async () => {
            const result = action.operationTerm
                ? await this._executeOperation(action.operationTerm)
                : await this._executeRegularActionForQueue(action);

            this._finalizeExecutionRecord(record, result);
            this._emitExecutionEvent('ActionExecuted', record, {result});

            resolve({success: true, result});
        }, 'processActionItem', (executionError) => {
            this._finalizeExecutionRecord(record, null, executionError);
            this._emitExecutionEvent('ActionFailed', record, {error: executionError.message});

            reject({success: false, error: executionError.message});
        });

        this._releaseResources(action);
    }

    async _executeRegularActionForQueue(action) {
        const actionName = action?.name || 'unknown';
        const handler = this._findHandler(actionName);

        if (!handler) {
            logger.warn(`No handler found for action: ${actionName}`);
            throw new Error(`No handler found for action: ${actionName}`);
        }

        return await handler(action);
    }


    _validateAction(action) {
        return errorHandler.executeSync(() => {
            if (!action || (!action?.name && !action?.operationTerm)) {
                return false;
            }

            if (this.constraints.size === 0) return true;

            for (const [name, constraint] of this.constraints) {
                if (constraint(action)) continue;
                logger.warn(`Action failed constraint: ${name}`);
                return false;
            }

            return true;
        }, '_validateAction');
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

    _createExecutionRecord(actionName, parameters = {}, type = 'action') {
        const executionId = generateId(`${type}-${actionName}`);
        const startTime = Date.now();
        return {id: executionId, action: actionName, parameters, startTime, type};
    }

    _finalizeExecutionRecord(record, result = null, error = null) {
        const endTime = Date.now();
        const duration = endTime - record.startTime;

        const historyEntry = {
            id: record.id,
            action: record.action,
            parameters: record.parameters,
            startTime: record.startTime,
            endTime,
            duration,
            status: error ? 'error' : 'success',
            type: record.type,
            ...(result && {result}),
            ...(error && {error: error.message})
        };

        this.actionHistory.push(historyEntry);
        return {endTime, duration, historyEntry};
    }

    _emitExecutionEvent(eventType, record, additionalData = {}) {
        const {duration} = record;

        this.eventBus.emit(eventType, {
            id: record.id,
            action: record.action,
            duration,
            ...additionalData
        });
    }

    _acquireResources(action) {
        action.resources?.forEach(name => {
            this.resources.get(name).locked = true;
        });
    }

    _releaseResources(action) {
        action.resources?.forEach(name => {
            this.resources.get(name).locked = false;
        });
    }

    _withResources(action, operation) {
        this._acquireResources(action);
        try {
            return operation();
        } finally {
            this._releaseResources(action);
        }
    }

    _findHandler(actionName) {
        return [...this.actionHandlers.entries()].find(([pattern]) =>
            errorHandler.executeSync(() => new RegExp(pattern).test(actionName),
                `_findHandler RegExp test for pattern: ${pattern}`, false)
        )?.[1] || null;
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
