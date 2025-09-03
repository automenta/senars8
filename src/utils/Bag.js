/**
 * A Bag data structure that allows for priority-based sampling.
 * Items with higher priority are more likely to be sampled.
 */
class Bag {
    constructor() {
        this.items = [];
        this.totalPriority = 0;
    }

    /**
     * Adds an item to the bag with a given priority.
     * @param {*} item - The item to add.
     * @param {number} priority - The priority of the item (must be > 0).
     */
    add(item, priority) {
        if (typeof priority !== 'number' || priority <= 0) {
            // Priority must be positive for the sampling algorithm to work correctly.
            // Silently ignore items with invalid priority.
            return;
        }
        this.items.push({item, priority});
        this.totalPriority += priority;
    }

    /**
     * Samples an item from the bag based on priority.
     * Does not remove the item from the bag.
     * @returns {*|null} The sampled item, or null if the bag is empty.
     */
    sample() {
        if (this.items.length === 0) {
            return null;
        }

        let random = Math.random() * this.totalPriority;

        for (const entry of this.items) {
            random -= entry.priority;
            if (random <= 0) {
                return entry.item;
            }
        }

        // Should not be reached if totalPriority is correct, but as a fallback:
        return this.items[this.items.length - 1].item;
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
