class Bag {
    constructor(capacity = Infinity) {
        this.capacity = capacity;
        this.items = [];
        this.isDirty = true;
        this.cumulativePriorities = [];
        this.totalPriority = 0;
    }

    /**
     * Adds an item with its priority to the bag
     * @param {*} item - The item to add
     * @param {number} priority - The priority of the item (must be > 0)
     */
    put(item, priority) {
        if (typeof priority === 'number' && priority > 0) {
            this.items.push({item, priority});
            this.isDirty = true;
        }
    }

    /**
     * Commits changes and prepares the bag for sampling
     * Sorts items by priority and calculates cumulative priorities
     */
    commit() {
        // Early return if no changes
        if (!this.isDirty) {
            return;
        }

        // Sort in descending order of priority (higher priority first)
        this.items.sort((a, b) => b.priority - a.priority);

        // Trim to capacity if needed
        if (this.items.length > this.capacity) {
            this.items.length = this.capacity;
        }

        // Recalculate cumulative priorities and total using a more efficient approach
        this.totalPriority = 0;
        this.cumulativePriorities = new Array(this.items.length);

        for (let i = 0; i < this.items.length; i++) {
            this.totalPriority += this.items[i].priority;
            this.cumulativePriorities[i] = this.totalPriority;
        }

        this.isDirty = false;
    }

    /**
     * Samples an item based on its priority (higher priority items are more likely to be selected)
     * @returns {*} The sampled item or null if no items available
     */
    sample() {
        // Ensure bag is committed before sampling
        if (this.isDirty || this.items.length === 0) {
            return null;
        }

        const random = Math.random() * this.totalPriority;

        // Binary search for the item using a more readable approach
        let low = 0;
        let high = this.cumulativePriorities.length - 1;

        // Handle edge case where random is 0
        if (random === 0) {
            return this.items[0].item;
        }

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
     * Returns the number of items in the bag
     * @returns {number} The number of items
     */
    size() {
        return this.items.length;
    }

    /**
     * Clears all items from the bag
     */
    clear() {
        this.items = [];
        this.cumulativePriorities = [];
        this.totalPriority = 0;
        this.isDirty = true;
    }

    /**
     * Checks if the bag is empty
     * @returns {boolean} True if the bag is empty
     */
    isEmpty() {
        return this.items.length === 0;
    }
}

export default Bag;
