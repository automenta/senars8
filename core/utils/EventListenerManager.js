/**
 * Abstract Event Listener Manager
 * Provides a consistent pattern for setting up and tearing down event listeners
 * that broadcast to UI components
 */

class EventListenerManager {
    constructor() {
        this._eventConfig = null;
        this._system = null;
        this._broadcast = null;
        this.logger = null;
    }

    /**
     * Initialize the event listener manager
     * @param {Object} system - The system with an eventBus
     * @param {Function} broadcast - The broadcast function to send messages
     * @param {Object} eventConfig - Configuration for event mapping
     * @param {Object} logger - Optional logger
     */
    initialize(system, broadcast, eventConfig, logger = null) {
        this._system = system;
        this._broadcast = broadcast;
        this._eventConfig = eventConfig;
        this.logger = logger;
    }

    /**
     * Setup all event listeners based on the configuration
     */
    setupEventListeners() {
        if (!this._system?.eventBus) {
            if (this.logger) {
                this.logger.warn('System event bus not available. UI will not receive real-time updates.');
            }
            return;
        }

        this.cleanupEventListeners();

        // Create and register listeners efficiently
        for (const [event, formatter] of Object.entries(this._eventConfig)) {
            const listenerName = this._getListenerName(event);
            this[listenerName] = this._createListener(formatter);
            this._system.eventBus.on(event, this[listenerName]);
        }
    }

    /**
     * Clean up all registered event listeners
     */
    cleanupEventListeners() {
        if (!this._system?.eventBus || !this._eventConfig) return;

        // Use the same configuration for cleanup
        for (const event of Object.keys(this._eventConfig)) {
            const listenerName = this._getListenerName(event);
            if (this[listenerName]) {
                this._system.eventBus.off(event, this[listenerName]);
                this[listenerName] = null;
            }
        }
    }

    /**
     * Helper to generate consistent listener names
     * @private
     */
    _getListenerName(event) {
        return `_${event.replace(':', '_')}Listener`;
    }

    /**
     * Helper to create listeners with consistent behavior
     * @private
     */
    _createListener(formatter) {
        return (...args) => {
            try {
                const messages = Array.isArray(formatter(...args)) ? formatter(...args) : [formatter(...args)];
                for (const msg of messages) {
                    this._broadcast(msg);
                }
            } catch (error) {
                if (this.logger) {
                    this.logger.error(`Error in listener for event:`, error);
                }
            }
        };
    }

    /**
     * Get current system
     */
    getSystem() {
        return this._system;
    }

    /**
     * Get current broadcast function
     */
    getBroadcast() {
        return this._broadcast;
    }

    /**
     * Get current event configuration
     */
    getEventConfig() {
        return this._eventConfig;
    }
}

export default EventListenerManager;