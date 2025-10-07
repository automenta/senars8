/**
 * Integration utilities for the CoreAgent system
 * Provides seamless integration with existing systems and external services
 */

import {System} from './System.js';
import {createCore} from './createCore.js';
import logger from './utils/logger.js';
import {createUnifiedErrorHandler} from './utils/errorHandler.js';

const log = logger.create('Integration');
const errorHandler = createUnifiedErrorHandler('Integration');

/**
 * Integration manager for handling system integrations
 */
class IntegrationManager {
    constructor() {
        this.integrations = new Map();
        this.adapters = new Map();
        this.config = {};
    }

    /**
     * Register an integration adapter
     * @param {string} name - Integration name
     * @param {Object} adapter - Integration adapter with connect/disconnect methods
     * @param {Object} config - Integration configuration
     */
    registerIntegration(name, adapter, config = {}) {
        this.integrations.set(name, adapter);
        this.adapters.set(name, {
            connected: false,
            config,
            instance: null
        });

        log.info(`Registered integration: ${name}`);
    }

    /**
     * Connect to a registered integration
     * @param {string} name - Integration name
     * @param {Object} options - Connection options
     * @returns {Promise} Connection result
     */
    async connectIntegration(name, options = {}) {
        const adapter = this.integrations.get(name);
        const adapterInfo = this.adapters.get(name);

        if (!adapter) {
            throw new Error(`Integration '${name}' not found`);
        }

        if (adapterInfo.connected) {
            log.warn(`Integration '${name}' already connected`);
            return adapterInfo.instance;
        }

        try {
            const instance = await adapter.connect({
                ...adapterInfo.config,
                ...options
            });

            adapterInfo.connected = true;
            adapterInfo.instance = instance;

            log.info(`Connected to integration: ${name}`);
            return instance;
        } catch (error) {
            log.error(`Failed to connect to integration '${name}':`, error);
            throw error;
        }
    }

    /**
     * Disconnect from a registered integration
     * @param {string} name - Integration name
     * @returns {Promise} Disconnection result
     */
    async disconnectIntegration(name) {
        const adapter = this.integrations.get(name);
        const adapterInfo = this.adapters.get(name);

        if (!adapter || !adapterInfo.connected) {
            log.warn(`Integration '${name}' not connected`);
            return;
        }

        try {
            await adapter.disconnect(adapterInfo.instance);
            adapterInfo.connected = false;
            adapterInfo.instance = null;

            log.info(`Disconnected from integration: ${name}`);
        } catch (error) {
            log.error(`Failed to disconnect from integration '${name}':`, error);
            throw error;
        }
    }

    /**
     * Get integration status
     * @param {string} name - Integration name
     * @returns {Object} Integration status
     */
    getIntegrationStatus(name) {
        const adapterInfo = this.adapters.get(name);
        if (!adapterInfo) {
            return {registered: false};
        }

        return {
            registered: true,
            connected: adapterInfo.connected,
            config: adapterInfo.config
        };
    }

    /**
     * Get all integration statuses
     * @returns {Object} All integration statuses
     */
    getAllIntegrationStatuses() {
        const statuses = {};
        for (const [name] of this.integrations) {
            statuses[name] = this.getIntegrationStatus(name);
        }
        return statuses;
    }
}

/**
 * Create a CoreAgent system with integration capabilities
 * @param {Object} config - System configuration
 * @param {Object} integrations - Integration configurations
 * @returns {System} Configured system instance
 */
export function createIntegratedSystem(config = {}, integrations = {}) {
    const system = new System(config);
    const integrationManager = new IntegrationManager();

    // Register common integrations
    if (integrations.fileSystem) {
        integrationManager.registerIntegration('fileSystem', {
            async connect(options) {
                // File system integration is always available
                return {type: 'fileSystem', root: options.root || process.cwd()};
            },
            async disconnect(instance) {
                // File system doesn't need explicit disconnection
            }
        }, integrations.fileSystem);
    }

    if (integrations.network) {
        integrationManager.registerIntegration('network', {
            async connect(options) {
                return {
                    type: 'network',
                    baseUrl: options.baseUrl,
                    timeout: options.timeout || 30000
                };
            },
            async disconnect(instance) {
                // Network connections are handled per-request
            }
        }, integrations.network);
    }

    if (integrations.database) {
        integrationManager.registerIntegration('database', {
            async connect(options) {
                // Database connection logic would go here
                return {type: 'database', connection: 'mock'};
            },
            async disconnect(instance) {
                // Database disconnection logic would go here
            }
        }, integrations.database);
    }

    // Add integration manager to system
    system.integrationManager = integrationManager;

    // Add convenience methods to system
    system.connectIntegration = (name, options) =>
        integrationManager.connectIntegration(name, options);
    system.disconnectIntegration = (name) =>
        integrationManager.disconnectIntegration(name);
    system.getIntegrationStatus = (name) =>
        integrationManager.getIntegrationStatus(name);

    return system;
}

/**
 * Integration utilities
 */
export const IntegrationUtils = {
    /**
     * Create a standard integration adapter
     * @param {Object} methods - Adapter methods (connect, disconnect, etc.)
     * @returns {Object} Integration adapter
     */
    createAdapter(methods) {
        return {
            connect: methods.connect || (async () => ({})),
            disconnect: methods.disconnect || (async () => {}),
            ...methods
        };
    },

    /**
     * Create a retry-enabled integration adapter
     * @param {Object} adapter - Base adapter
     * @param {Object} options - Retry options
     * @returns {Object} Retry-enabled adapter
     */
    withRetry(adapter, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const delay = options.delay || 1000;

        return {
            ...adapter,
            connect: async (config) => {
                let lastError;

                for (let i = 0; i <= maxRetries; i++) {
                    try {
                        return await adapter.connect(config);
                    } catch (error) {
                        lastError = error;

                        if (i < maxRetries) {
                            log.warn(`Connection attempt ${i + 1} failed, retrying...`);
                            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                        }
                    }
                }

                throw lastError;
            }
        };
    },

    /**
     * Create a logging integration adapter
     * @param {Object} adapter - Base adapter
     * @param {string} name - Integration name for logging
     * @returns {Object} Logging-enabled adapter
     */
    withLogging(adapter, name) {
        return {
            ...adapter,
            connect: async (config) => {
                log.info(`Connecting to ${name} integration...`);
                const result = await adapter.connect(config);
                log.info(`Successfully connected to ${name} integration`);
                return result;
            },
            disconnect: async (instance) => {
                log.info(`Disconnecting from ${name} integration...`);
                await adapter.disconnect(instance);
                log.info(`Successfully disconnected from ${name} integration`);
            }
        };
    }
};

// Create a singleton integration manager
const integrationManager = new IntegrationManager();

export {integrationManager};
export default {createIntegratedSystem, IntegrationUtils, IntegrationManager};