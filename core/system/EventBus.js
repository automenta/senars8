import {error, warn} from '../utils/logger.js';
import {eventBusErrorHandler as errorHandler} from '../utils/errorHandler.js';

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.handlers = new Map();
    }

    on(event, callback) {
        let listeners = this.listeners.get(event);
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(event, listeners);
        }
        listeners.add(callback);
    }

    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    async emit(event, data) {
        const listeners = this.listeners.get(event);
        if (!listeners) {
            return;
        }

        const listenerPromises = [];
        for (const listener of listeners) {
            // Wrap in Promise.resolve to handle both sync and async listeners
            listenerPromises.push(Promise.resolve(listener(data)));
        }

        await Promise.all(listenerPromises);
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
        return errorHandler.execute(() => handler(data), `request: ${requestType}`, null);
    }

    clear() {
        this.listeners.clear();
        this.handlers.clear();
    }
}

export default EventBus;