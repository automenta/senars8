/**
 * Shared event manager for both UI and TUI
 * Provides a consistent interface for event handling across interfaces
 */
class EventManager {
    constructor(eventBus = null) {
        this.eventBus = eventBus;
        this.eventListeners = new Map(); // Track listeners for cleanup
    }

    /**
     * Initialize the event manager with an event bus
     * @param {Object} eventBus - The event bus instance (like EventBus from the core)
     */
    initialize(eventBus) {
        this.eventBus = eventBus;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to execute when event occurs
     */
    subscribe(event, callback) {
        if (!this.eventBus || !this.eventBus.on) {
            console.warn(`EventManager: No event bus available for subscribing to '${event}'`);
            return;
        }

        // Store the subscription for potential cleanup
        const listenerId = `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.eventBus.on(event, callback);
        
        // Track this listener
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add({ id: listenerId, callback });

        return listenerId;
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {string|Function} listenerIdOrCallback - Listener ID or callback function
     */
    unsubscribe(event, listenerIdOrCallback) {
        if (!this.eventBus || !this.eventBus.off) {
            console.warn(`EventManager: No event bus available for unsubscribing from '${event}'`);
            return;
        }

        if (typeof listenerIdOrCallback === 'function') {
            // If a callback function is provided, find and remove it
            this.eventBus.off(event, listenerIdOrCallback);
            
            // Remove from our tracking
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                for (const listener of listeners) {
                    if (listener.callback === listenerIdOrCallback) {
                        listeners.delete(listener);
                        break;
                    }
                }
            }
        } else {
            // If a listener ID is provided, we would need to track IDs more carefully
            // For now, we'll just remove all listeners for this event
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                for (const listener of listeners) {
                    this.eventBus.off(event, listener.callback);
                }
                this.eventListeners.delete(event);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Data to pass with the event
     */
    emit(event, data) {
        if (!this.eventBus || !this.eventBus.emit) {
            console.warn(`EventManager: No event bus available for emitting '${event}'`);
            return;
        }

        this.eventBus.emit(event, data);
    }

    /**
     * Subscribe to multiple events with a single handler
     * @param {Array<string>} events - Array of event names
     * @param {Function} callback - Callback function to execute when any of the events occur
     * @returns {Array<string>} Array of listener IDs
     */
    subscribeMultiple(events, callback) {
        const listenerIds = [];
        for (const event of events) {
            const listenerId = this.subscribe(event, callback);
            if (listenerId) {
                listenerIds.push(listenerId);
            }
        }
        return listenerIds;
    }

    /**
     * Unsubscribe from all events (cleanup)
     */
    unsubscribeAll() {
        if (!this.eventBus) return;

        for (const [event, listeners] of this.eventListeners.entries()) {
            for (const listener of listeners) {
                this.eventBus.off(event, listener.callback);
            }
        }
        
        this.eventListeners.clear();
    }

    /**
     * Request data from the event bus (if supported)
     * @param {string} requestType - Request type
     * @param {*} data - Request data
     * @returns {Promise<*>} Response from the handler
     */
    async request(requestType, data) {
        if (!this.eventBus || !this.eventBus.request) {
            console.warn(`EventManager: Request not supported for '${requestType}'`);
            return null;
        }

        return this.eventBus.request(requestType, data);
    }

    /**
     * Handle requests of a specific type (if supported)
     * @param {string} requestType - Request type
     * @param {Function} handler - Handler function
     */
    handle(requestType, handler) {
        if (!this.eventBus || !this.eventBus.handle) {
            console.warn(`EventManager: Handle not supported for '${requestType}'`);
            return;
        }

        this.eventBus.handle(requestType, handler);
    }
}

// Export singleton instance
const eventManager = new EventManager();
export default eventManager;