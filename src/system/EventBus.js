class EventBus {
    constructor() {
        this.listeners = {};
        this.handlers = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== callback
        );
    }

    emit(event, data) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event].forEach((listener) => listener(data));
    }

    handle(requestType, handler) {
        if (this.handlers[requestType]) {
            console.warn(`[EventBus] Overwriting existing handler for request type: ${requestType}`);
        }
        this.handlers[requestType] = handler;
    }

    async request(requestType, data) {
        const handler = this.handlers[requestType];
        if (!handler) {
            console.error(`[EventBus] No handler registered for request type: ${requestType}`);
            return null;
        }
        try {
            return await handler(data);
        } catch (error) {
            console.error(`[EventBus] Handler for ${requestType} threw an error:`, error);
            return null;
        }
    }
}

export default new EventBus();
