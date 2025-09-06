/**
 * A Bag data structure that allows for efficient, priority-based sampling.
 * It uses a commit-based approach to balance performance between writes and reads.
 * 'put' operations are fast, and 'sample' operations are fast after a 'commit'.
 */
class Bag {
    /**
     * @param {number} capacity - The maximum number of items the bag can hold.
     */
    constructor(capacity = Infinity) {
        this.capacity = capacity;
        this.items = []; // Array of {item, priority}
        this.isDirty = true;

        // For sampling
        this.cumulativePriorities = [];
        this.totalPriority = 0;
    }

    /**
     * Adds an item to the bag. This is a fast operation.
     * The bag becomes "dirty" and needs a 'commit' before sampling.
     * @param {*} item - The item to add.
     * @param {number} priority - The priority of the item (must be > 0).
     */
    put(item, priority) {
        if (typeof priority !== 'number' || priority <= 0) {
            return;
        }
        this.items.push({ item, priority });
        this.isDirty = true;
    }

    /**
     * Prepares the bag for sampling. This can be an expensive operation.
     * It sorts the items by priority, enforces capacity, and calculates
     * data structures needed for efficient sampling.
     */
    commit() {
        if (!this.isDirty) return;

        // Sort by priority, descending
        this.items.sort((a, b) => b.priority - a.priority);

        // Enforce capacity
        if (this.items.length > this.capacity) {
            this.items.length = this.capacity;
        }

        // Calculate cumulative priorities for sampling
        this.totalPriority = 0;
        this.cumulativePriorities = [];
        for (const entry of this.items) {
            this.totalPriority += entry.priority;
            this.cumulativePriorities.push(this.totalPriority);
        }

        this.isDirty = false;
    }

    /**
     * Samples an item from the bag based on priority.
     * This is a fast operation, but requires the bag to be "committed".
     * @returns {*|null} The sampled item, or null if the bag is empty.
     */
    sample() {
        if (this.isDirty) {
            // This warning is helpful for developers using the Bag class directly.
            console.warn("Bag is dirty. Sampling may be incorrect. Call commit() first.");
            // Fallback to a simple linear scan for robustness, though it's slow.
            if (this.items.length === 0) return null;
            const totalPriority = this.items.reduce((sum, i) => sum + i.priority, 0);
            let random = Math.random() * totalPriority;
            for (const entry of this.items) {
                random -= entry.priority;
                if (random <= 0) {
                    return entry.item;
                }
            }
            return this.items[this.items.length - 1].item;
        }

        if (this.items.length === 0) {
            return null;
        }

        const random = Math.random() * this.totalPriority;

        // Binary search on cumulativePriorities to find the item.
        // This finds the index of the first element whose cumulative priority is >= random.
        let low = 0, high = this.cumulativePriorities.length - 1;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (random > this.cumulativePriorities[mid]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return this.items[low].item;
    }

    /**
     * Returns the number of items in the bag.
     * @returns {number}
     */
    size() {
        return this.items.length;
    }
}

module.exports = Bag;
