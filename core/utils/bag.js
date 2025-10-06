class Bag {
    constructor(capacity = Infinity) {
        this.capacity = capacity;
        this.items = [];
        this.isDirty = true;
        this.cumulativePriorities = [];
        this.totalPriority = 0;
    }

    put(item, priority) {
        // Handle invalid or zero priorities by assigning a default minimum priority
        if (typeof priority !== 'number' || priority <= 0) {
            priority = 0.001; // Small default priority to ensure tasks are included
        }

        // Handle zero or negative capacity case - don't store anything
        if (this.capacity <= 0) {
            return;
        }

        // Check capacity before adding
        if (this.items.length >= this.capacity) {
            // If at capacity, only add if this item has higher priority than the lowest
            if (this.items.length === 0) return; // Safety check

            // Sort to find minimum priority
            const sortedItems = [...this.items].sort((a, b) => a.priority - b.priority);
            const currentMinPriority = sortedItems[0].priority;

            if (priority <= currentMinPriority) {
                return; // Don't add lower or equal priority items when at capacity
            }

            // Remove lowest priority item to make room
            this.items = sortedItems.slice(1);
        }

        this.items.push({item, priority});
        this.isDirty = true;
    }


    commit() {
        // Early return if already committed
        if (!this.isDirty) return;

        // Sort items by priority (descending)
        this.items.sort((a, b) => b.priority - a.priority);

        // Truncate to capacity if needed
        if (this.items.length > this.capacity) {
            this.items.length = this.capacity;
        }

        // Pre-allocate arrays for better performance
        const length = this.items.length;
        this.totalPriority = 0;
        this.cumulativePriorities = new Array(length);

        // Calculate cumulative priorities in a single pass
        for (let i = 0; i < length; i++) {
            this.totalPriority += this.items[i].priority;
            this.cumulativePriorities[i] = this.totalPriority;
        }

        this.isDirty = false;
    }

    sample() {
        // Early returns for common cases
        if (this.isDirty) this.commit();
        if (this.isEmpty()) return null;

        // Use faster random number generation
        const random = Math.random() * this.totalPriority;

        // Binary search with bit shifting for faster division
        let low = 0;
        let high = this.cumulativePriorities.length - 1;

        while (low < high) {
            const mid = (low + high) >> 1; // Bit shift instead of division
            if (random > this.cumulativePriorities[mid]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        // Use optional chaining and nullish coalescing for cleaner code
        return this.items[low]?.item ?? null;
    }

    size() {
        return this.items.length;
    }

    clear() {
        // Reuse arrays when possible for better memory performance
        this.items.length = 0;
        this.cumulativePriorities.length = 0;
        this.totalPriority = 0;
        this.isDirty = true;
    }

    isEmpty() {
        return this.items.length === 0;
    }

    // Utility functions for common patterns

    /**
     * Merge another bag into this bag with priority preservation
     * @param {Bag} otherBag - Bag to merge from
     * @returns {Bag} - Returns this bag for chaining
     */
    merge(otherBag) {
        if (!otherBag || !(otherBag instanceof Bag)) return this;

        for (const {item, priority} of otherBag.items) {
            this.put(item, priority);
        }

        return this;
    }

    /**
     * Split bag into two bags based on a predicate function
     * @param {Function} predicate - Function that returns true for items to keep in this bag
     * @returns {Bag} - New bag containing items that don't match the predicate
     */
    split(predicate) {
        const otherBag = new Bag(this.capacity);
        const remainingItems = [];

        for (const {item, priority} of this.items) {
            if (predicate(item, priority)) {
                remainingItems.push({item, priority});
            } else {
                otherBag.put(item, priority);
            }
        }

        this.items = remainingItems;
        this.isDirty = true;
        return otherBag;
    }

    /**
     * Filter bag items based on a predicate function with priority preservation
     * @param {Function} predicate - Function that returns true for items to keep
     * @returns {Bag} - Returns this bag for chaining
     */
    filter(predicate) {
        this.items = this.items.filter(({item, priority}) => predicate(item, priority));
        this.isDirty = true;
        return this;
    }

    /**
     * Get items by priority range
     * @param {number} minPriority - Minimum priority (inclusive)
     * @param {number} maxPriority - Maximum priority (inclusive)
     * @returns {Array} - Array of items in the priority range
     */
    getByPriorityRange(minPriority, maxPriority) {
        if (this.isDirty) this.commit();

        return this.items
            .filter(({priority}) => priority >= minPriority && priority <= maxPriority)
            .map(({item}) => item);
    }

    /**
     * Remove items by a predicate function
     * @param {Function} predicate - Function that returns true for items to remove
     * @returns {Bag} - Returns this bag for chaining
     */
    removeByPredicate(predicate) {
        this.items = this.items.filter(({item, priority}) => !predicate(item, priority));
        this.isDirty = true;
        return this;
    }

    /**
     * Get priority statistics for the bag
     * @returns {Object} - Statistics including min, max, average priority
     */
    getPriorityStats() {
        if (this.isEmpty()) {
            return {min: 0, max: 0, average: 0, count: 0};
        }

        if (this.isDirty) this.commit();

        const priorities = this.items.map(({priority}) => priority);
        return {
            min: Math.min(...priorities),
            max: Math.max(...priorities),
            average: priorities.reduce((sum, p) => sum + p, 0) / priorities.length,
            count: priorities.length
        };
    }

    /**
     * Sample multiple items with replacement (allows duplicates)
     * @param {number} count - Number of items to sample
     * @returns {Array} - Array of sampled items (may contain duplicates)
     */
    sampleMultiple(count) {
        if (this.isEmpty() || count <= 0) return [];

        if (this.isDirty) this.commit();

        const samples = [];
        for (let i = 0; i < count; i++) {
            samples.push(this.sample());
        }

        return samples;
    }

    /**
     * Sample multiple items without replacement (no duplicates)
     * @param {number} count - Number of items to sample
     * @returns {Array} - Array of sampled items (no duplicates)
     */
    sampleMultipleUnique(count) {
        if (this.isEmpty() || count <= 0) return [];

        if (this.isDirty) this.commit();

        const samples = [];
        const usedIndexes = new Set();

        const sampleCount = Math.min(count, this.size());
        for (let i = 0; i < sampleCount; i++) {
            let attempts = 0;
            let sampleIndex;

            // Keep trying until we find an unused index (max 10 attempts to avoid infinite loop)
            do {
                const random = Math.random() * this.totalPriority;
                let low = 0;
                let high = this.cumulativePriorities.length - 1;

                while (low < high) {
                    const mid = (low + high) >> 1;
                    if (random > this.cumulativePriorities[mid]) {
                        low = mid + 1;
                    } else {
                        high = mid;
                    }
                }

                sampleIndex = low;
                attempts++;
            } while (usedIndexes.has(sampleIndex) && attempts < 10);

            if (!usedIndexes.has(sampleIndex)) {
                usedIndexes.add(sampleIndex);
                samples.push(this.items[sampleIndex].item);
            }
        }

        return samples;
    }

    /**
     * Convert bag to array of items
     * @returns {Array} - Array of all items in the bag
     */
    toArray() {
        if (this.isDirty) this.commit();
        return this.items.map(({item}) => item);
    }

    /**
     * Convert bag to array of {item, priority} objects
     * @returns {Array} - Array of {item, priority} objects
     */
    toArrayWithPriorities() {
        if (this.isDirty) this.commit();
        return [...this.items];
    }

    /**
     * Create a new bag with filtered items
     * @param {Function} predicate - Filter function
     * @returns {Bag} - New bag with filtered items
     */
    filterToNewBag(predicate) {
        const newBag = new Bag(this.capacity);
        for (const {item, priority} of this.items) {
            if (predicate(item, priority)) {
                newBag.put(item, priority);
            }
        }
        return newBag;
    }

    /**
     * Check if bag contains an item (by reference equality)
     * @param {*} item - Item to search for
     * @returns {boolean} - True if item is in the bag
     */
    contains(item) {
        return this.items.some(({item: bagItem}) => bagItem === item);
    }

    /**
     * Get the priority of a specific item
     * @param {*} item - Item to find priority for
     * @returns {number|null} - Priority of the item or null if not found
     */
    getPriority(item) {
        const found = this.items.find(({item: bagItem}) => bagItem === item);
        return found ? found.priority : null;
    }

    /**
     * Update priority of an existing item
     * @param {*} item - Item to update
     * @param {number} newPriority - New priority value
     * @returns {boolean} - True if item was found and updated
     */
    updatePriority(item, newPriority) {
        for (const entry of this.items) {
            if (entry.item === item) {
                entry.priority = newPriority;
                this.isDirty = true;
                return true;
            }
        }
        return false;
    }
}

export default Bag;
