/**
 * Manages the caching and retrieval of object instances to promote reuse.
 * This is used for interning Term and Task objects to reduce memory usage.
 */
class InstanceManager {
    #cache = new Map();

    /**
     * Returns the number of items in the cache.
     * @returns {number}
     */
    get size() {
        return this.#cache.size;
    }

    /**
     * Retrieves an instance from the cache.
     * @param {string} key - The unique key for the instance.
     * @returns {any|undefined} The cached instance or undefined if not found.
     */
    get(key) {
        return this.#cache.get(key);
    }

    /**
     * Adds an instance to the cache.
     * @param {string} key - The unique key for the instance.
     * @param {any} instance - The instance to cache.
     */
    add(key, instance) {
        if (!this.#cache.has(key)) {
            this.#cache.set(key, instance);
        }
    }

    /**
     * Checks if an instance is in the cache.
     * @param {string} key - The unique key for the instance.
     * @returns {boolean} True if the instance is cached, false otherwise.
     */
    has(key) {
        return this.#cache.has(key);
    }

    /**
     * Clears the entire instance cache.
     */
    clear() {
        this.#cache.clear();
    }
}

// Export a singleton instance to be used across the application.
export default new InstanceManager();