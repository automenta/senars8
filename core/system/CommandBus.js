import {error, warn} from '../utils/logger.js';
import {commandBusErrorHandler as errorHandler} from '../utils/errorHandler.js';

class CommandBus {
    constructor() {
        this.handlers = new Map();
    }

    handle(requestType, handler) {
        if (this.handlers.has(requestType)) {
            warn(`[CommandBus] Overwriting existing handler for request type: ${requestType}`);
        }
        this.handlers.set(requestType, handler);
    }

    async request(requestType, data) {
        const handler = this.handlers.get(requestType);
        if (!handler) {
            error(`[CommandBus] No handler registered for request type: ${requestType}`);
            return null;
        }
        return errorHandler.execute(() => handler(data), `request: ${requestType}`, null);
    }

    clear() {
        this.handlers.clear();
    }
}

export default CommandBus;