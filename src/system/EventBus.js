import {warn, error} from '../utils/logger.js';

/**
 * EventBus provides a centralized event handling system for decoupled communication
 * between different components of the system.
 * 
 * Events can be emitted with data, and listeners can be registered to handle specific events.
 * Additionally, request-response patterns are supported for synchronous communication.
 */
class EventBus {
    constructor() {
        /**
         * Map of event names to arrays of listener functions
         * @type {Object.<string, Function[]>}
         */
        this.listeners = {};
        
        /**
         * Map of request types to handler functions
         * @type {Object.<string, Function>}
         */
        this.handlers = {};
    }

    /**
     * Register a listener for a specific event
     * @param {string} event - The event name to listen for
     * @param {Function} callback - The function to call when the event is emitted
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Remove a listener for a specific event
     * @param {string} event - The event name
     * @param {Function} callback - The function to remove
     */
    off(event, callback) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== callback
        );
    }

    /**
     * Emit an event with optional data
     * @param {string} event - The event name to emit
     * @param {*} [data] - Optional data to pass to listeners
     */
    emit(event, data) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event].forEach((listener) => listener(data));
    }

    /**
     * Register a handler for a specific request type
     * @param {string} requestType - The request type to handle
     * @param {Function} handler - The function to call when the request is made
     */
    handle(requestType, handler) {
        if (this.handlers[requestType]) {
            warn(`[EventBus] Overwriting existing handler for request type: ${requestType}`);
        }
        this.handlers[requestType] = handler;
    }

    /**
     * Make a request and wait for a response
     * @param {string} requestType - The type of request to make
     * @param {*} [data] - Optional data to pass to the handler
     * @returns {Promise<*>} The response from the handler, or null if no handler is registered
     */
    async request(requestType, data) {
        const handler = this.handlers[requestType];
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
}

export default new EventBus();
