import logger from './logger.js';

const log = logger.create('ResourceManager');

/**
 * Resource Manager for handling application resources and cleanup
 */
class ResourceManager {
    constructor() {
        this.resources = new Map();
        this.cleanupHandlers = new Map();
    }

    /**
     * Register a resource with the manager
     * @param {string} name - Unique name for the resource
     * @param {*} resource - The resource object
     * @param {string|Function} cleanupMethod - Method name to call for cleanup or cleanup function
     */
    register(name, resource, cleanupMethod = 'close') {
        if (this.resources.has(name)) {
            log.warn(`Resource ${name} already registered, overwriting`);
        }

        this.resources.set(name, resource);

        if (typeof cleanupMethod === 'string') {
            this.cleanupHandlers.set(name, () => {
                if (typeof resource[cleanupMethod] === 'function') {
                    return resource[cleanupMethod]();
                }
            });
        } else if (typeof cleanupMethod === 'function') {
            this.cleanupHandlers.set(name, cleanupMethod);
        } else {
            this.cleanupHandlers.set(name, () => {
                // Default cleanup - try to call close, stop, or destroy
                if (typeof resource.close === 'function') {
                    return resource.close();
                } else if (typeof resource.stop === 'function') {
                    return resource.stop();
                } else if (typeof resource.destroy === 'function') {
                    return resource.destroy();
                }
            });
        }

        log.debug(`Registered resource: ${name}`);
    }

    /**
     * Unregister a resource
     * @param {string} name - Name of the resource to unregister
     */
    unregister(name) {
        if (this.resources.has(name)) {
            this.resources.delete(name);
            this.cleanupHandlers.delete(name);
            log.debug(`Unregistered resource: ${name}`);
        }
    }

    /**
     * Get a resource by name
     * @param {string} name - Name of the resource
     * @returns {*} The resource object or undefined if not found
     */
    get(name) {
        return this.resources.get(name);
    }

    /**
     * Check if a resource is registered
     * @param {string} name - Name of the resource
     * @returns {boolean} True if the resource is registered
     */
    has(name) {
        return this.resources.has(name);
    }

    /**
     * Get all registered resource names
     * @returns {string[]} Array of resource names
     */
    getResourceNames() {
        return Array.from(this.resources.keys());
    }

    /**
     * Clean up a specific resource
     * @param {string} name - Name of the resource to clean up
     */
    async cleanupResource(name) {
        if (this.cleanupHandlers.has(name)) {
            try {
                const cleanupHandler = this.cleanupHandlers.get(name);
                await cleanupHandler();
                log.debug(`Cleaned up resource: ${name}`);
            } catch (error) {
                log.error(`Error cleaning up resource ${name}:`, error);
            } finally {
                this.unregister(name);
            }
        }
    }

    /**
     * Clean up all registered resources
     */
    async cleanupAll() {
        const resourceNames = this.getResourceNames();
        const cleanupPromises = resourceNames.map(name => this.cleanupResource(name));

        try {
            await Promise.all(cleanupPromises);
            log.info('All resources cleaned up successfully');
        } catch (error) {
            log.error('Error during resource cleanup:', error);
        }
    }

    /**
     * Shutdown the resource manager and clean up all resources
     */
    async shutdown() {
        log.info('Shutting down resource manager...');
        await this.cleanupAll();
        this.resources.clear();
        this.cleanupHandlers.clear();
        log.info('Resource manager shutdown complete');
    }

    /**
     * Get statistics about registered resources
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            totalResources: this.resources.size,
            resourceNames: this.getResourceNames(),
            hasResources: this.resources.size > 0,
        };
    }
}

// Create a singleton instance
const resourceManager = new ResourceManager();

export default resourceManager;