/**
 * A simple in-memory store for embeddings.
 */
class EmbeddingStore {
    constructor() {
        this.embeddings = new Map();
    }

    store(key, embedding) {
        this.embeddings.set(key, embedding);
        return key;
    }

    get(key) {
        return this.embeddings.get(key);
    }

    has(key) {
        return this.embeddings.has(key);
    }

    release(key) {
        return this.embeddings.delete(key);
    }

    clear() {
        this.embeddings.clear();
    }

    size() {
        return this.embeddings.size;
    }
}

export default new EmbeddingStore();
