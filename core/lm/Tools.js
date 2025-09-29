import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {debug, warn} from '../utils/logger.js';
import { generateId } from '../utils/idGenerator.js';

const errorHandler = createUnifiedErrorHandler('Tools');

class Tools {
    constructor(configAccessor, narseseTranslator, eventBus) {
        this.config = configAccessor;
        this.translator = narseseTranslator;
        this.eventBus = eventBus;
        this.toolRegistry = new Map();
        this.operatorMap = new Map();
        debug('Tools module initialized.');
    }

    register(toolDefinition) {
        return errorHandler.executeSync(() => {
            const { id, operator, handler, description } = toolDefinition;

            if (!id || typeof id !== 'string') {
                throw new Error('Tool registration failed: `id` must be a non-empty string.');
            }
            if (!operator || typeof operator !== 'string') {
                throw new Error(`Tool registration failed for "${id}": \`operator\` must be a non-empty string.`);
            }
            if (!handler || typeof handler !== 'function') {
                throw new Error(`Tool registration failed for "${id}": \`handler\` must be a function.`);
            }
            if (!description || typeof description !== 'string') {
                throw new Error(`Tool registration failed for "${id}": \`description\` must be a non-empty string.`);
            }

            if (this.toolRegistry.has(id)) {
                warn(`Overwriting existing tool registration for ID: ${id}`);
                const oldTool = this.toolRegistry.get(id);
                if (oldTool.operator !== operator) {
                    this.operatorMap.delete(oldTool.operator);
                }
            }

            if (this.operatorMap.has(operator) && this.operatorMap.get(operator) !== id) {
                throw new Error(`Tool registration failed for "${id}": Operator "${operator}" is already registered to another tool ("${this.operatorMap.get(operator)}").`);
            }

            const newTool = {
                id,
                operator,
                handler,
                description,
                inputSchema: toolDefinition.inputSchema || {},
                outputSchema: toolDefinition.outputSchema || {},
            };

            this.toolRegistry.set(id, newTool);
            this.operatorMap.set(operator, id);

            debug(`Successfully registered tool: ${id} (operator: ${operator})`);
            return newTool;
        }, `register:${toolDefinition?.id || 'unknown'}`);
    }

    get(toolId) {
        return this.toolRegistry.get(toolId);
    }

    findByOperator(operator) {
        const toolId = this.operatorMap.get(operator);
        return toolId ? this.get(toolId) : undefined;
    }

    getAll() {
        return [...this.toolRegistry.values()];
    }

    async execute(operator, action) {
        return await errorHandler.execute(async () => {
            const tool = this.findByOperator(operator);
            if (!tool) {
                throw new Error(`Execution failed: Tool with operator "${operator}" not found.`);
            }

            const args = this.translator.fromNarsese(action.term, tool.inputSchema);
            debug(`Executing tool "${tool.id}" with args:`, args);

            const result = await tool.handler(args);
            debug(`Tool "${tool.id}" executed with result:`, result);

            if (result) {
                const resultBeliefs = this.translator.toNarsese(result, tool.outputSchema);
                if (resultBeliefs?.length > 0) {
                    this.eventBus.emit('input.add', resultBeliefs);
                    debug(`Injected ${resultBeliefs.length} beliefs from tool "${tool.id}" result.`);
                }
            }
            return result;
        }, `execute:${operator}`);
    }
}

export default Tools;