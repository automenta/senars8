import {eventBusErrorHandler as errorHandler} from '../utils/errorHandler.js';

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
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

    emit(event, data) {
        this.listeners.get(event)?.forEach(listener => {
            try {
                listener(data);
            } catch (err) {
                errorHandler.handleWithDefault(err, `emit:${event}`);
            }
        });
    }

    async emitAsync(event, data) {
        const listeners = this.listeners.get(event);
        if (!listeners) return;

        const promises = [...listeners].map(listener =>
            errorHandler.execute(() => listener(data), `emitAsync:${event}`)
        );

        await Promise.all(promises);
    }

    clear() {
        this.listeners.clear();
    }
}

export default EventBus;