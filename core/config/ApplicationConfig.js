import ConfigManager from './ConfigManager.js';
import defaultConfig from './default-config.js';

/**
 * Application-level configuration that includes both core and UI settings
 */
class ApplicationConfig {
    constructor(userConfig = {}) {
        // Extend default config with application-specific settings
        const extendedDefaultConfig = {
            ...defaultConfig,
            app: {
                // UI and WebSocket ports with environment variable overrides
                uiPort: parseInt(process.env.SENARS_UI_PORT || '3000'),
                wsPort: parseInt(process.env.SENARS_WS_PORT || '8081'),

                // Development-specific settings
                devMode: process.env.SENARS_DEV_MODE !== 'false',
                logLevel: process.env.SENARS_LOG_LEVEL || 'info',
                hotReload: process.env.SENARS_HOT_RELOAD !== 'false',
                debugMode: process.env.SENARS_DEBUG_MODE !== 'false',
                verboseLogging: process.env.SENARS_VERBOSE_LOGGING !== 'false',
                componentReload: process.env.SENARS_COMPONENT_RELOAD !== 'false',

                // Server settings
                server: {
                    strictPort: true, // Fail if port is busy
                    clearScreen: false,
                    host: '0.0.0.0', // Allow external connections
                }
            }
        };

        // Merge user config with extended defaults
        this.configManager = new ConfigManager({...extendedDefaultConfig, ...userConfig});
    }

    /**
     * Get a configuration value
     * @param {string} path - Configuration path (e.g. 'app.uiPort', 'planner.strategy')
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value
     */
    get(path, defaultValue = undefined) {
        return this.configManager.get(path, defaultValue);
    }

    /**
     * Get a configuration number
     * @param {string} path - Configuration path
     * @param {number} defaultValue - Default value
     * @returns {number} Configuration value
     */
    getNumber(path, defaultValue = 0) {
        return this.configManager.getNumber(path, defaultValue);
    }

    /**
     * Get a configuration string
     * @param {string} path - Configuration path
     * @param {string} defaultValue - Default value
     * @returns {string} Configuration value
     */
    getString(path, defaultValue = '') {
        return this.configManager.getString(path, defaultValue);
    }

    /**
     * Get a configuration boolean
     * @param {string} path - Configuration path
     * @param {boolean} defaultValue - Default value
     * @returns {boolean} Configuration value
     */
    getBoolean(path, defaultValue = false) {
        return this.configManager.getBoolean(path, defaultValue);
    }

    /**
     * Get UI port
     * @returns {number} UI port number
     */
    getUiPort() {
        return this.getNumber('app.uiPort', 3000);
    }

    /**
     * Get WebSocket port
     * @returns {number} WebSocket port number
     */
    getWsPort() {
        return this.getNumber('app.wsPort', 8081);
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        return this.configManager.getAll();
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration to merge
     */
    update(newConfig) {
        this.configManager.update(newConfig);
    }
}

// Create singleton instance
const applicationConfig = new ApplicationConfig();
export default applicationConfig;

// Export class for direct instantiation if needed
export {ApplicationConfig};