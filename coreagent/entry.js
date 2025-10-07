/**
 * Main entry point for the CoreAgent system
 * Provides a simple interface for starting and using the system
 */

import {System} from './System.js';
import {createCore} from './createCore.js';
import logger from './utils/logger.js';
import applicationConfig from './applicationConfig.js';
import {handleUncaughtError, setupGracefulShutdown} from './utils/system.js';
import resourceManager from './utils/ResourceManager.js';

const log = logger.create('Entry');

/**
 * CoreAgent application entry point
 */
class CoreAgentEntry {
    constructor(config = {}) {
        this.config = {...applicationConfig.getAll(), ...config};
        this.system = null;
        this.started = false;
    }

    /**
     * Initialize the CoreAgent system
     * @param {Object} options - Initialization options
     * @returns {Promise<System>} The initialized system
     */
    async initialize(options = {}) {
        try {
            log.info('Initializing CoreAgent system...');

            // Create the system with merged configuration
            this.system = new System(this.config);

            // Register with resource manager for cleanup
            resourceManager.register('coreagent-system', this.system, 'stop');

            // Initialize the system
            await this.system.initialize();

            log.info('CoreAgent system initialized successfully');
            return this.system;
        } catch (error) {
            log.error('Failed to initialize CoreAgent system:', error);
            throw error;
        }
    }

    /**
     * Start the CoreAgent system
     * @param {Object} options - Start options
     * @returns {Promise<System>} The started system
     */
    async start(options = {}) {
        if (!this.system) {
            await this.initialize(options);
        }

        try {
            log.info('Starting CoreAgent system...');

            await this.system.start();
            this.started = true;

            log.info('CoreAgent system started successfully');
            return this.system;
        } catch (error) {
            log.error('Failed to start CoreAgent system:', error);
            throw error;
        }
    }

    /**
     * Stop the CoreAgent system
     * @returns {Promise<void>}
     */
    async stop() {
        if (this.system && this.started) {
            try {
                log.info('Stopping CoreAgent system...');
                await this.system.stop();
                this.started = false;
                log.info('CoreAgent system stopped successfully');
            } catch (error) {
                log.error('Error stopping CoreAgent system:', error);
                throw error;
            }
        }
    }

    /**
     * Get the current system instance
     * @returns {System|null} The system instance or null if not initialized
     */
    getSystem() {
        return this.system;
    }

    /**
     * Check if the system is running
     * @returns {boolean} True if the system is running
     */
    isRunning() {
        return this.started && this.system?.lifecycle?.started;
    }

    /**
     * Get system status
     * @returns {Object} System status information
     */
    getStatus() {
        if (!this.system) {
            return {initialized: false, started: false};
        }

        return {
            initialized: this.system.lifecycle?.initialized || false,
            started: this.system.lifecycle?.started || false,
            components: this.system.core?.components ?
                Array.from(this.system.core.components.keys()) : [],
            stats: this.system.getStatus?.() || {}
        };
    }
}

/**
 * Create and start a CoreAgent system with default configuration
 * @param {Object} config - System configuration
 * @param {Object} options - Start options
 * @returns {Promise<CoreAgentEntry>} The running CoreAgent entry instance
 */
export async function createCoreAgent(config = {}, options = {}) {
    const entry = new CoreAgentEntry(config);

    // Set up graceful shutdown
    setupGracefulShutdown(log, async () => {
        await entry.stop();
    });

    // Start the system
    await entry.start(options);

    return entry;
}

/**
 * Quick start function for development and testing
 * @param {Object} config - System configuration
 * @returns {Promise<System>} The started system
 */
export async function quickStart(config = {}) {
    const entry = await createCoreAgent(config);
    return entry.getSystem();
}

/**
 * Create a minimal CoreAgent system for testing
 * @param {Object} config - System configuration
 * @returns {Promise<System>} The system instance
 */
export async function createTestSystem(config = {}) {
    const system = new System({
        agent: {
            focusSetSize: 5,
            actionableGoalPriorityThreshold: 0.01,
            cycleIntervalMs: 1000,
            memoryCapacity: 100,
            debugLogging: true,
        },
        system: {
            logLevel: 'error',
            enableMetrics: false,
            enableHealthCheck: false,
        },
        ...config
    });

    await system.initialize();
    return system;
}

// Export the main entry class
export {CoreAgentEntry};
export default {createCoreAgent, quickStart, createTestSystem, CoreAgentEntry};