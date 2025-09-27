import SharedAPI from '../../common/services/SharedAPI.js';
import configProvider from '../../common/services/ConfigProvider.js';
import eventManager from '../../common/services/EventManager.js';

/**
 * API module for the WebUI that handles all API endpoints
 * Extends the SharedAPI to provide web-specific functionality
 */
class WebUIAPI extends SharedAPI {
    constructor(agent) {
        super(agent);
        this.configProvider = configProvider;
        this.eventManager = eventManager;
        this.agent = agent;
    }

    /**
     * Initialize the WebUI API with additional services
     */
    async initialize() {
        // Initialize with agent's configuration if available
        if (this.agent?.system?.config) {
            this.configProvider.initialize(this.agent.system.config);
        }

        // Initialize event manager with the agent's event bus
        if (this.agent?.system?.eventBus) {
            this.eventManager.initialize(this.agent.system.eventBus);
        }
    }

    /**
     * Get system configuration
     */
    getSystemConfig() {
        return this.configProvider.getAll();
    }

    /**
     * Get a specific configuration value
     */
    getConfig(path, defaultValue) {
        return this.configProvider.get(path, defaultValue);
    }

    /**
     * Subscribe to system events
     */
    subscribeToEvent(event, callback) {
        return this.eventManager.subscribe(event, callback);
    }

    /**
     * Unsubscribe from system events
     */
    unsubscribeFromEvent(event, listenerId) {
        this.eventManager.unsubscribe(event, listenerId);
    }
}

export default WebUIAPI;