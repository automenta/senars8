/**
 * Example Plugin for SeNARS
 * Demonstrates how to create a plugin for the system
 */

import {info} from '../core/utils/logger.js';

class ExamplePlugin {
    constructor(options = {}) {
        this.options = options;
        this.name = 'ExamplePlugin';
    }

    /**
     * Called when the plugin is registered with the system
     */
    registerComponents(container) {
        // Register any new services with the DI container
        // Example: container.register('myService', MyService, ['dependency1', 'dependency2']);
        info('ExamplePlugin: Registering components');
    }

    /**
     * Called when the system is initializing
     */
    async initialize(container) {
        info('ExamplePlugin: Initializing');
        
        // Access system components through the container
        const system = container.get('system');
        const memory = container.get('memory');
        
        // Perform initialization logic here
        info('ExamplePlugin: Initialized successfully');
    }

    /**
     * Called when the system is shutting down
     */
    async shutdown() {
        info('ExamplePlugin: Shutting down');
        // Perform cleanup logic here
    }
}

// Export the plugin class as default
export default new ExamplePlugin();