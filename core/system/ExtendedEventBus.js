/**
 * @fileoverview Extensible EventBus with plugin support
 */

import {eventBusErrorHandler as errorHandler} from '../utils/errorHandler.js';

class EventBusPlugin {
    /**
     * Called when plugin is registered with bus
     * @param {ExtendedEventBus} bus - The event bus instance
     */
    onRegister(_bus) {
    }

    /**
     * Called before an event is emitted
     * @param {string} eventName - Name of event being emitted
     * @param {*} data - Event data
     * @returns {object} Modified event data or null to continue normally
     */
    preEmit(_eventName, _data) {
        return null;
    }

    /**
     * Called after an event is emitted
     * @param {string} eventName - Name of emitted event
     * @param {*} data - Event data
     */
    postEmit(_eventName, _data) {
    }

    /**
     * Called before a listener is registered
     * @param {string} eventName - Event name
     * @param {Function} callback - Listener callback
     * @returns {Function} Modified callback or null to continue normally
     */
    preOn(_eventName, _callback) {
        return null;
    }

    /**
     * Called after a listener is registered
     * @param {string} eventName - Event name
     * @param {Function} callback - Listener callback
     */
    postOn(_eventName, _callback) {
    }
}

class ExtendedEventBus {
    constructor() {
        this.listeners = new Map();
        this.plugins = [];
        this.middleware = [];
    }

    /**
     * Register a plugin with the event bus
     * @param {EventBusPlugin} plugin - The plugin to register
     */
    registerPlugin(plugin) {
        if (!(plugin instanceof EventBusPlugin)) {
            throw new Error('Plugin must be an instance of EventBusPlugin');
        }
        this.plugins.push(plugin);
        plugin.onRegister(this);
    }

    /**
     * Register middleware function that processes all events
     * @param {Function} middlewareFn - Function to process events
     */
    use(middlewareFn) {
        this.middleware.push(middlewareFn);
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - The event name
     * @param {Function} callback - The callback function
     */
    on(eventName, callback) {
        // Let plugins modify the callback if needed
        for (const plugin of this.plugins) {
            const modifiedCallback = plugin.preOn(eventName, callback);
            if (modifiedCallback) {
                callback = modifiedCallback;
            }
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);

        // Notify plugins that listener was registered
        for (const plugin of this.plugins) {
            plugin.postOn(eventName, callback);
        }
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - The event name
     * @param {Function} callback - The callback function to remove
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            const eventListeners = this.listeners.get(eventName);
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - The event name
     * @param {...any} data - The event data
     */
    emit(eventName, ...data) {
        // Let plugins modify the event data if needed
        for (const plugin of this.plugins) {
            const modifiedData = plugin.preEmit(eventName, data);
            if (modifiedData) {
                data = modifiedData;
            }
        }

        // Apply middleware
        for (const middlewareFn of this.middleware) {
            try {
                middlewareFn(eventName, data);
            } catch (error) {
                errorHandler.handleWithDefault(error, `middleware-${eventName}`);
            }
        }

        if (this.listeners.has(eventName)) {
            const eventListeners = this.listeners.get(eventName);
            for (const listener of eventListeners) {
                try {
                    listener(...data);
                } catch (error) {
                    errorHandler.handleWithDefault(error, `event-${eventName}`);
                }
            }
        }

        // Notify plugins that event was emitted
        for (const plugin of this.plugins) {
            plugin.postEmit(eventName, data);
        }
    }

    /**
     * Get all registered event names
     * @returns {string[]} Array of event names
     */
    getEventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - The event name
     */
    removeAllListeners(eventName) {
        if (this.listeners.has(eventName)) {
            this.listeners.delete(eventName);
        }
    }

    /**
     * Get count of listeners for an event
     * @param {string} eventName - The event name
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        return this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0;
    }
}

// Export a singleton instance as default for backward compatibility
export default new ExtendedEventBus();