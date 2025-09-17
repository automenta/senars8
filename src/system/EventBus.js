import {error, warn} from '../utils/logger.js';

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.handlers = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            if (this.listeners.get(event).size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(listener => listener(data));
        }
    }

    handle(requestType, handler) {
        if (this.handlers.has(requestType)) {
            warn(`[EventBus] Overwriting existing handler for request type: ${requestType}`);
        }
        this.handlers.set(requestType, handler);
    }

    async request(requestType, data) {
        const handler = this.handlers.get(requestType);
        if (!handler) {
            error(`[EventBus] No handler registered for request type: ${requestType}`);
            return null;
        }
        try {
            return await handler(data);
        } catch (err) {
            error(`[EventBus] Handler for ${requestType} threw an error:`, err);
            return null;
        }
    }

    clear() {
        this.listeners.clear();
        this.handlers.clear();
    }
}

export default new EventBus();
