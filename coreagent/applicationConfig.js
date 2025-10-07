import Config from './Config.js';

/**
 * Application configuration with default values
 */
class ApplicationConfig {
    constructor() {
        this.config = new Config({
            // UI Configuration
            ui: {
                port: 3000,
                host: 'localhost',
                title: 'CoreAgent System',
            },

            // Agent Configuration
            agent: {
                focusSetSize: 20,
                actionableGoalPriorityThreshold: 0.1,
                cycleIntervalMs: 100,
                memoryCapacity: 1000,
                debugLogging: false,
            },

            // System Configuration
            system: {
                logLevel: 'info',
                enableMetrics: true,
                enableHealthCheck: true,
                gracefulShutdownTimeout: 5000,
            },

            // Development Configuration
            development: {
                hotReload: false,
                verboseLogging: false,
                enableDebugEndpoints: false,
            },
        });
    }

    /**
     * Get UI port from configuration
     * @returns {number} The UI port
     */
    getUiPort() {
        return this.config.getNumber('ui.port', 3000);
    }

    /**
     * Get UI host from configuration
     * @returns {string} The UI host
     */
    getUiHost() {
        return this.config.getString('ui.host', 'localhost');
    }

    /**
     * Get agent configuration
     * @returns {Object} Agent configuration object
     */
    getAgentConfig() {
        return {
            focusSetSize: this.config.getNumber('agent.focusSetSize', 20),
            actionableGoalPriorityThreshold: this.config.getNumber('agent.actionableGoalPriorityThreshold', 0.1),
            cycleIntervalMs: this.config.getNumber('agent.cycleIntervalMs', 100),
            memoryCapacity: this.config.getNumber('agent.memoryCapacity', 1000),
            debugLogging: this.config.getBoolean('agent.debugLogging', false),
        };
    }

    /**
     * Get system configuration
     * @returns {Object} System configuration object
     */
    getSystemConfig() {
        return {
            logLevel: this.config.getString('system.logLevel', 'info'),
            enableMetrics: this.config.getBoolean('system.enableMetrics', true),
            enableHealthCheck: this.config.getBoolean('system.enableHealthCheck', true),
            gracefulShutdownTimeout: this.config.getNumber('system.gracefulShutdownTimeout', 5000),
        };
    }

    /**
     * Get development configuration
     * @returns {Object} Development configuration object
     */
    getDevelopmentConfig() {
        return {
            hotReload: this.config.getBoolean('development.hotReload', false),
            verboseLogging: this.config.getBoolean('development.verboseLogging', false),
            enableDebugEndpoints: this.config.getBoolean('development.enableDebugEndpoints', false),
        };
    }

    /**
     * Update configuration with new values
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        this.config.update(newConfig);
    }

    /**
     * Get a specific configuration value
     * @param {string} path - Dot notation path to the configuration value
     * @param {*} defaultValue - Default value if path is not found
     * @returns {*} The configuration value
     */
    get(path, defaultValue) {
        return this.config.get(path, defaultValue);
    }

    /**
     * Set a specific configuration value
     * @param {string} path - Dot notation path to the configuration value
     * @param {*} value - Value to set
     */
    set(path, value) {
        this.config.set(path, value);
    }

    /**
     * Get all configuration as a plain object
     * @returns {Object} All configuration values
     */
    getAll() {
        return this.config._data;
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = new Config({
            ui: {
                port: 3000,
                host: 'localhost',
                title: 'CoreAgent System',
            },
            agent: {
                focusSetSize: 20,
                actionableGoalPriorityThreshold: 0.1,
                cycleIntervalMs: 100,
                memoryCapacity: 1000,
                debugLogging: false,
            },
            system: {
                logLevel: 'info',
                enableMetrics: true,
                enableHealthCheck: true,
                gracefulShutdownTimeout: 5000,
            },
            development: {
                hotReload: false,
                verboseLogging: false,
                enableDebugEndpoints: false,
            },
        });
    }
}

// Create a singleton instance
const applicationConfig = new ApplicationConfig();

export default applicationConfig;