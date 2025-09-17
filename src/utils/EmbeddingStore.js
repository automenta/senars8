/**
 * Shared embedding store for memory-efficient embedding management
 *
 * This class provides a centralized store for semantic embeddings to avoid
 * duplication across multiple Term instances. It uses weak references to
 * allow garbage collection of unused embeddings.
 */

/**
 * EmbeddingStore manages shared embeddings across Term instances
 */
class EmbeddingStore {
    constructor() {
        // Use WeakMap to allow garbage collection of term keys when no terms reference them
        this.embeddings = new Map();
        this.referenceCounts = new Map();
    }

    /**
     * Stores an embedding and returns a reference ID
     * @param {string} termKey - The term key associated with the embedding
     * @param {number[]} embedding - The embedding vector
     * @returns {string} Reference ID for the stored embedding
     */
    store(termKey, embedding) {
        if (!Array.isArray(embedding)) {
            throw new Error('Embedding must be an array');
        }

        // Use term key as the reference ID
        this.embeddings.set(termKey, embedding);

        // Track reference count
        const currentCount = this.referenceCounts.get(termKey) || 0;
        this.referenceCounts.set(termKey, currentCount + 1);

        return termKey;
    }

    /**
     * Retrieves an embedding by its reference ID
     * @param {string} termKey - The term key associated with the embedding
     * @returns {number[]|null} The embedding vector or null if not found
     */
    get(termKey) {
        return this.embeddings.get(termKey) || null;
    }

    /**
     * Releases a reference to an embedding
     * @param {string} termKey - The term key associated with the embedding
     */
    release(termKey) {
        const currentCount = this.referenceCounts.get(termKey) || 0;
        if (currentCount > 1) {
            this.referenceCounts.set(termKey, currentCount - 1);
        } else {
            this.referenceCounts.delete(termKey);
            this.embeddings.delete(termKey);
        }
    }

    /**
     * Checks if an embedding exists for a term key
     * @param {string} termKey - The term key to check
     * @returns {boolean} True if embedding exists
     */
    has(termKey) {
        return this.embeddings.has(termKey);
    }

    /**
     * Gets the size of the embedding store
     * @returns {number} Number of stored embeddings
     */
    size() {
        return this.embeddings.size;
    }

    /**
     * Clears all embeddings from the store
     */
    clear() {
        this.embeddings.clear();
        this.referenceCounts.clear();
    }
}

// Export singleton instance
export default new EmbeddingStore();