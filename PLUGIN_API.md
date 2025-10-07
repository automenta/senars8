/**

* SeNARS Plugin API Documentation
*
* This document describes the API for creating plugins for the SeNARS system.
  */

/**

* Plugin Interface
*
* All plugins must implement this interface to be compatible with the system.
  */
  class PluginInterface {
  /**
    * Constructor - called when the plugin is instantiated
    * @param {Object} options - Configuration options for the plugin
      */
      constructor(options = {}) {
      // Initialize plugin with options
      }

  /**
    * Register components with the DI container
    * Called during system setup, before system initialization
    *
    * @param {DIContainer} container - The dependency injection container
      */
      registerComponents(container) {
      // Register services with the container
      // container.register('serviceName', ServiceClass, ['dependency1', 'dependency2']);
      }

  /**
    * Initialize the plugin
    * Called after the system is created but before it starts running
    *
    * @param {DIContainer} container - The dependency injection container
    * @returns {Promise<void>} - Promise that resolves when initialization is complete
      */
      async initialize(container) {
      // Initialize plugin, access system components via container
      // const system = container.get('system');
      // const memory = container.get('memory');
      }

  /**
    * Shutdown the plugin
    * Called when the system is shutting down
    *
    * @returns {Promise<void>} - Promise that resolves when shutdown is complete
      */
      async shutdown() {
      // Clean up resources, save state, etc.
      }
      }

/**

* Available System Components
*
* These are the main system components available through the DI container:
*
*
    - 'system' - The main system instance
*
    - 'memory' - The memory system
*
    - 'reasoner' - The reasoning engine
*
    - 'lm' - The language model interface
*
    - 'actionExecutor' - The action execution system
*
    - 'planner' - The planning system
*
    - 'metaCognition' - The meta-cognition system
*
    - 'perception' - The perception system
*
    - 'cycle' - The cognitive cycle
*
    - 'configManager' - The configuration manager
*
    - 'eventBus' - The event bus for system events
*
    - 'commandBus' - The command bus for system commands
*
    - 'pluginManager' - The plugin manager itself
      */

/**

* Plugin Examples
  */

// Example: A simple monitoring plugin
class MonitoringPlugin {
constructor(options = {}) {
this.options = {...{interval: 5000}, ...options};
this.intervalId = null;
}

    registerComponents(container) {
        // Register any monitoring services
    }

    async initialize(container) {
        const system = container.get('system');
        const memory = container.get('memory');
        
        this.intervalId = setInterval(() => {
            // Monitor system state
            const stats = {
                memorySize: memory.size,
                cycleCount: system.cycleCount || 0,
                timestamp: Date.now()
            };
            
            console.log('System Stats:', stats);
        }, this.options.interval);
    }

    async shutdown() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

}

// Example: A custom reasoning strategy plugin
class CustomStrategyPlugin {
constructor(options = {}) {
this.options = options;
}

    registerComponents(container) {
        // Register the custom strategy
        // container.register('customStrategy', CustomStrategy, ['dependency1']);
    }

    async initialize(container) {
        const strategyRegistry = container.get('strategyRegistry');
        
        // Add custom strategy to registry
        // strategyRegistry.registerStrategy(CustomStrategy);
    }

    async shutdown() {
        // No specific cleanup needed
    }

}

export {
PluginInterface,
MonitoringPlugin,
CustomStrategyPlugin
};