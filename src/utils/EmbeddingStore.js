class EmbeddingStore {
    constructor() {
        this.embeddings = new Map();
        this.referenceCounts = new Map();
    }

    store(termKey, embedding) {
        if (!Array.isArray(embedding)) {
            throw new Error('Embedding must be an array');
        }

        this.embeddings.set(termKey, embedding);

        const currentCount = this.referenceCounts.get(termKey) || 0;
        this.referenceCounts.set(termKey, currentCount + 1);

        return termKey;
    }

    get(termKey) {
        return this.embeddings.get(termKey) || null;
    }

    release(termKey) {
        const currentCount = this.referenceCounts.get(termKey) || 0;
        if (currentCount > 1) {
            this.referenceCounts.set(termKey, currentCount - 1);
        } else {
            this.referenceCounts.delete(termKey);
            this.embeddings.delete(termKey);
        }
    }

    has(termKey) {
        return this.embeddings.has(termKey);
    }

    size() {
        return this.embeddings.size;
    }

    clear() {
        this.embeddings.clear();
        this.referenceCounts.clear();
    }
}

export default new EmbeddingStore();