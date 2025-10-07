/**
 * Resource Manager for handling application-level resources with consistent lifecycle management
 * Implements the DRY principle by centralizing resource management logic
 */

class ResourceManager {
    constructor() {
        this._resources = new Map();
        this.logger = null;
    }

    setLogger(logger) {
        this.logger = logger;
    }

    /**
     * Register a resource for lifecycle management
     * @param {string} name - Resource identifier
     * @param {Object} resource - Resource object with optional stop/close method
     * @param {string} method - Method name to call on resource (default: 'stop')
     */
    register(name, resource, method = 'stop') {
        this._resources.set(name, {resource, method});
        if (this.logger) {
            this.logger.debug(`Registered resource: ${name}`);
        }
    }

    /**
     * Unregister a resource
     * @param {string} name - Resource identifier
     */
    unregister(name) {
        const result = this._resources.delete(name);
        if (this.logger && result) {
            this.logger.debug(`Unregistered resource: ${name}`);
        }
        return result;
    }

    /**
     * Get a registered resource
     * @param {string} name - Resource identifier
     */
    get(name) {
        const entry = this._resources.get(name);
        return entry ? entry.resource : null;
    }

    /**
     * Execute shutdown sequence for all registered resources
     */
    async shutdown() {
        if (this.logger) {
            this.logger.info('Starting resource shutdown sequence...');
        }

        const promises = [];
        for (const [name, {resource, method}] of this._resources.entries()) {
            if (resource && typeof resource[method] === 'function') {
                promises.push(this._shutdownResource(name, resource, method));
            }
        }

        await Promise.allSettled(promises);

        // Clear resources after shutdown attempts
        this._resources.clear();

        if (this.logger) {
            this.logger.info('Resource shutdown sequence completed');
        }
    }

    /**
     * Internal method to shutdown a single resource
     * @param {string} name - Resource name
     * @param {Object} resource - Resource object
     * @param {string} method - Shutdown method name
     * @private
     */
    async _shutdownResource(name, resource, method) {
        if (this.logger) {
            this.logger.debug(`Shutting down resource: ${name}`);
        }

        try {
            if (method === 'kill') {
                // Special handling for process-like resources
                resource.kill('SIGTERM');
            } else if (method === 'close') {
                // Special handling for server-like resources
                await resource.close();
            } else {
                // Standard resource stop method
                await resource[method]();
            }

            if (this.logger) {
                this.logger.info(`Successfully shut down resource: ${name}`);
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error(`Error shutting down resource ${name}:`, error);
            }
            // Don't throw, as we want to attempt shutdown of all resources
        }
    }

    /**
     * Get all registered resource names
     */
    getResourceNames() {
        return Array.from(this._resources.keys());
    }

    /**
     * Check if a resource is registered
     * @param {string} name - Resource identifier
     */
    has(name) {
        return this._resources.has(name);
    }

    /**
     * Get count of registered resources
     */
    getCount() {
        return this._resources.size;
    }
}

// Singleton instance
const resourceManager = new ResourceManager();

export default resourceManager;
export {ResourceManager};