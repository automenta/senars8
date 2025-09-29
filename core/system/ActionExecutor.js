import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {generateId} from '../utils/idGenerator.js';
import { parseTerm } from '../parser/parse-utils.js';

const errorHandler = createUnifiedErrorHandler('ActionExecutor');

class ActionExecutor {
    constructor(memory, configAccessor, eventBus, tools) {
        this.memory = memory;
        this.config = configAccessor;
        this.eventBus = eventBus;
        this.tools = tools;
        this.actionHandlers = new Map();
    }

    registerActionHandler(actionPattern, handler) {
        this.actionHandlers.set(actionPattern, handler);
    }

    async executeAction(goalTask) {
        return await errorHandler.execute(async () => {
            if (!goalTask?.termKey) {
                return; // Silently ignore invalid tasks
            }

            const parsedTerm = parseTerm(goalTask.termKey);

            if (!parsedTerm) {
                 const constitutionalGoals = ['AcquireKnowledge', 'ReduceUncertainty', 'MaintainCoherence', 'MaintainCognitiveIntegrity'];
                if (constitutionalGoals.includes(goalTask.termKey)) {
                    return;
                }
                // This could be an error, but for now we'll ignore unparsable terms that aren't known goals.
                return;
            }

            const actionTask = { ...goalTask, term: parsedTerm };
            const actionName = actionTask.termKey;

            if (actionTask.term.type === 'Operation') {
                const operator = actionTask.term.operator + actionTask.term.term.key;
                if (this.tools.findByOperator(operator)) {
                    return await this.tools.execute(operator, actionTask);
                }
            }

            const legacyAction = { name: actionName, parameters: actionTask.term, originalTask: actionTask };
            const handler = this._findHandler(actionName);

            if (!handler) {
                return;
            }

            this._validateAction(legacyAction);

            const actionId = generateId(`action-${actionName}`);
            const startTime = Date.now();

            try {
                const result = await handler(legacyAction);
                const endTime = Date.now();
                const duration = endTime - startTime;

                this.eventBus.emit('ActionExecuted', { id: actionId, action: actionName, result, duration });
                return result;

            } catch (error) {
                const endTime = Date.now();
                const duration = endTime - startTime;

                this.eventBus.emit('ActionFailed', { id: actionId, action: actionName, error: error.message, duration });
                throw error;
            }
        }, `executeAction: ${goalTask.termKey}`);
    }

    _validateAction(action) {
        if (!action?.name) {
            throw new Error('Action name is required');
        }
    }

    _findHandler(actionName) {
        for (const [pattern, handler] of this.actionHandlers) {
            if (new RegExp(pattern).test(actionName)) {
                return handler;
            }
        }
        return null;
    }
}

export default ActionExecutor;