/**
 * Bag data structure for statistical priority-based sampling
 * Provides fair priority sampling with capacity management
 */
class Bag {
    /**
     * Create a new Bag with specified capacity
     * @param {number} capacity - Maximum number of items (Infinity for unlimited)
     */
    constructor(capacity = Infinity) {
        this.capacity = this._validateCapacity(capacity);
        this.items = [];
        this.isDirty = true;
        this.cumulativePriorities = [];
        this.totalPriority = 0;
        this.stats = {
            totalPuts: 0,
            totalSamples: 0,
            evictions: 0,
            lastAccess: Date.now()
        };
    }

    /**
     * Add item with priority to the bag
     * @param {*} item - Item to add (can be any type)
     * @param {number} priority - Priority value (must be positive number)
     * @returns {boolean} - True if item was added, false if rejected
     */
    put(item, priority) {
        // Validate inputs
        if (!this._isValidItem(item)) {
            throw new Error('Bag.put: Invalid item provided');
        }

        priority = this._validatePriority(priority);

        // Handle zero or negative capacity case
        if (this.capacity <= 0) {
            this.stats.evictions++;
            return false;
        }

        // Check if we need to evict lower priority items
        if (this.items.length >= this.capacity) {
            if (!this._shouldEvictForPriority(priority)) {
                return false; // Don't add lower or equal priority items when at capacity
            }
            this._evictLowestPriorityItem();
        }

        this.items.push({item, priority, id: this._generateItemId()});
        this.isDirty = true;
        this.stats.totalPuts++;

        return true;
    }


    /**
     * Commit pending changes and update internal data structures
     * Called automatically before sampling operations
     */
    commit() {
        if (!this.isDirty) return;

        try {
            // Sort items by priority (descending) for efficient sampling
            this.items.sort((a, b) => b.priority - a.priority);

            // Enforce capacity limit
            if (this.items.length > this.capacity) {
                this.items = this.items.slice(0, this.capacity);
            }

            // Update cumulative priorities for O(log n) sampling
            this._updateCumulativePriorities();

            this.isDirty = false;
        } catch (error) {
            throw new Error(`Bag.commit: Failed to commit changes - ${error.message}`);
        }
    }

    /**
     * Sample single item based on priority distribution
     * @returns {*} - Randomly sampled item or null if empty
     */
    sample() {
        if (this.isEmpty()) return null;

        this.stats.lastAccess = Date.now();
        this.stats.totalSamples++;

        try {
            this.commit(); // Ensure we're up to date

            if (this.totalPriority <= 0) {
                // Fallback to uniform sampling if all priorities are invalid
                const randomIndex = Math.floor(Math.random() * this.items.length);
                return this.items[randomIndex]?.item ?? null;
            }

            const random = Math.random() * this.totalPriority;

            // Binary search for efficient sampling
            let low = 0;
            let high = this.cumulativePriorities.length - 1;

            while (low < high) {
                const mid = (low + high) >> 1; // Bit shift for performance
                if (random > this.cumulativePriorities[mid]) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }

            return this.items[low]?.item ?? null;
        } catch (error) {
            throw new Error(`Bag.sample: Sampling failed - ${error.message}`);
        }
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

    /**
     * Get current size of the bag
     * @returns {number} - Number of items in the bag
     */
    size() {
        return this.items.length;
    }

    /**
     * Check if bag is empty
     * @returns {boolean} - True if bag contains no items
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Clear all items from the bag
     */
    clear() {
        this.items.length = 0;
        this.cumulativePriorities.length = 0;
        this.totalPriority = 0;
        this.isDirty = true;
        this.stats.lastAccess = Date.now();
    }

    /**
     * Get comprehensive statistics about the bag
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            size: this.size(),
            capacity: this.capacity,
            isEmpty: this.isEmpty(),
            isDirty: this.isDirty,
            totalPriority: this.totalPriority,
            ...this.stats,
            memoryUsage: this._estimateMemoryUsage()
        };
    }

    // Private validation and utility methods

    /**
     * Validate capacity parameter
     * @private
     * @param {*} capacity - Capacity value to validate
     * @returns {number} - Validated capacity
     */
    _validateCapacity(capacity) {
        if (typeof capacity !== 'number' || !isFinite(capacity)) {
            throw new Error('Bag: Capacity must be a finite number');
        }
        if (capacity < 0) {
            throw new Error('Bag: Capacity cannot be negative');
        }
        return capacity;
    }

    /**
     * Validate priority parameter
     * @private
     * @param {*} priority - Priority value to validate
     * @returns {number} - Validated priority
     */
    _validatePriority(priority) {
        if (typeof priority !== 'number' || !isFinite(priority)) {
            return 0.001; // Default minimum priority
        }
        return Math.max(0.001, priority); // Ensure positive priority
    }

    /**
     * Validate item parameter
     * @private
     * @param {*} item - Item to validate
     * @returns {boolean} - True if item is valid
     */
    _isValidItem(item) {
        return item !== null && item !== undefined;
    }

    /**
     * Check if we should evict items for the given priority
     * @private
     * @param {number} newPriority - Priority of item being added
     * @returns {boolean} - True if eviction should occur
     */
    _shouldEvictForPriority(newPriority) {
        if (this.items.length === 0) return true;

        try {
            const stats = this.getPriorityStats();
            return newPriority > stats.min;
        } catch (error) {
            // If we can't get stats, assume we should evict
            return true;
        }
    }

    /**
     * Evict the lowest priority item
     * @private
     */
    _evictLowestPriorityItem() {
        if (this.items.length === 0) return;

        // Sort by priority and remove lowest
        const sortedItems = [...this.items].sort((a, b) => a.priority - b.priority);
        this.items = sortedItems.slice(1);
        this.stats.evictions++;
    }

    /**
     * Update cumulative priorities for efficient sampling
     * @private
     */
    _updateCumulativePriorities() {
        const length = this.items.length;
        this.totalPriority = 0;
        this.cumulativePriorities = new Array(length);

        for (let i = 0; i < length; i++) {
            this.totalPriority += this.items[i].priority;
            this.cumulativePriorities[i] = this.totalPriority;
        }
    }

    /**
     * Generate unique ID for bag item
     * @private
     * @returns {string} - Unique item identifier
     */
    _generateItemId() {
        return `bag_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Estimate memory usage of the bag
     * @private
     * @returns {Object} - Memory usage estimates
     */
    _estimateMemoryUsage() {
        const itemSize = this.items.length * 50; // Rough estimate per item
        const arraySize = this.cumulativePriorities.length * 8; // Float64 array
        const overhead = 100; // Object overhead

        return {
            items: itemSize,
            arrays: arraySize,
            overhead: overhead,
            total: itemSize + arraySize + overhead
        };
    }

    // Utility functions for common patterns

    /**
     * Merge another bag into this bag with priority preservation
     * @param {Bag} otherBag - Bag to merge from
     * @param {Object} options - Merge options
     * @param {boolean} options.preserveCapacity - Whether to respect capacity limits during merge
     * @returns {Bag} - Returns this bag for chaining
     */
    merge(otherBag, options = {}) {
        if (!otherBag || !(otherBag instanceof Bag)) {
            throw new Error('Bag.merge: Invalid bag provided for merging');
        }

        if (otherBag.isEmpty()) return this;

        const {preserveCapacity = true} = options;
        const originalCapacity = preserveCapacity ? this.capacity : Infinity;

        try {
            // Temporarily set capacity to infinity if not preserving
            if (!preserveCapacity) {
                this.capacity = Infinity;
            }

            for (const {item, priority} of otherBag.items) {
                this.put(item, priority);
            }

            return this;
        } finally {
            // Restore original capacity if needed
            if (!preserveCapacity) {
                this.capacity = originalCapacity;
            }
        }
    }

    /**
     * Split bag into two bags based on a predicate function
     * @param {Function} predicate - Function that returns true for items to keep in this bag
     * @param {Object} options - Split options
     * @param {number} options.otherCapacity - Capacity for the other bag
     * @returns {Bag} - New bag containing items that don't match the predicate
     */
    split(predicate, options = {}) {
        if (typeof predicate !== 'function') {
            throw new Error('Bag.split: Predicate must be a function');
        }

        const {otherCapacity = this.capacity} = options;
        const otherBag = new Bag(otherCapacity);
        const remainingItems = [];

        try {
            for (const {item, priority} of this.items) {
                try {
                    if (predicate(item, priority)) {
                        remainingItems.push({item, priority});
                    } else {
                        otherBag.put(item, priority);
                    }
                } catch (error) {
                    // If predicate throws, keep item in original bag
                    remainingItems.push({item, priority});
                }
            }

            this.items = remainingItems;
            this.isDirty = true;
            return otherBag;
        } catch (error) {
            throw new Error(`Bag.split: Split operation failed - ${error.message}`);
        }
    }

    /**
     * Filter bag items based on a predicate function with priority preservation
     * @param {Function} predicate - Function that returns true for items to keep
     * @returns {Bag} - Returns this bag for chaining
     */
    filter(predicate) {
        if (typeof predicate !== 'function') {
            throw new Error('Bag.filter: Predicate must be a function');
        }

        try {
            const originalLength = this.items.length;
            this.items = this.items.filter(({item, priority}) => {
                try {
                    return predicate(item, priority);
                } catch (error) {
                    // If predicate throws, exclude the item
                    return false;
                }
            });

            if (this.items.length !== originalLength) {
                this.isDirty = true;
            }

            return this;
        } catch (error) {
            throw new Error(`Bag.filter: Filter operation failed - ${error.message}`);
        }
    }

    /**
     * Get items by priority range
     * @param {number} minPriority - Minimum priority (inclusive)
     * @param {number} maxPriority - Maximum priority (inclusive)
     * @returns {Array} - Array of items in the priority range
     */
    getByPriorityRange(minPriority, maxPriority) {
        if (typeof minPriority !== 'number' || typeof maxPriority !== 'number') {
            throw new Error('Bag.getByPriorityRange: minPriority and maxPriority must be numbers');
        }

        if (minPriority > maxPriority) {
            throw new Error('Bag.getByPriorityRange: minPriority cannot be greater than maxPriority');
        }

        try {
            this.commit();

            return this.items
                .filter(({priority}) => priority >= minPriority && priority <= maxPriority)
                .map(({item}) => item);
        } catch (error) {
            throw new Error(`Bag.getByPriorityRange: Range query failed - ${error.message}`);
        }
    }

    /**
     * Remove items by a predicate function
     * @param {Function} predicate - Function that returns true for items to remove
     * @returns {Bag} - Returns this bag for chaining
     */
    removeByPredicate(predicate) {
        if (typeof predicate !== 'function') {
            throw new Error('Bag.removeByPredicate: Predicate must be a function');
        }

        try {
            const originalLength = this.items.length;
            this.items = this.items.filter(({item, priority}) => {
                try {
                    return !predicate(item, priority);
                } catch (error) {
                    // If predicate throws, keep the item
                    return true;
                }
            });

            if (this.items.length !== originalLength) {
                this.isDirty = true;
            }

            return this;
        } catch (error) {
            throw new Error(`Bag.removeByPredicate: Remove operation failed - ${error.message}`);
        }
    }

    /**
     * Get priority statistics for the bag
     * @returns {Object} - Statistics including min, max, average priority
     */
    getPriorityStats() {
        try {
            if (this.isEmpty()) {
                return {min: 0, max: 0, average: 0, count: 0, total: 0};
            }

            this.commit();

            if (this.items.length === 0) {
                return {min: 0, max: 0, average: 0, count: 0, total: 0};
            }

            const priorities = this.items.map(({priority}) => priority);
            const min = Math.min(...priorities);
            const max = Math.max(...priorities);
            const total = priorities.reduce((sum, p) => sum + p, 0);
            const average = total / priorities.length;

            return {
                min,
                max,
                average,
                count: priorities.length,
                total,
                range: max - min
            };
        } catch (error) {
            throw new Error(`Bag.getPriorityStats: Statistics calculation failed - ${error.message}`);
        }
    }

    /**
     * Sample multiple items with replacement (allows duplicates)
     * @param {number} count - Number of items to sample
     * @returns {Array} - Array of sampled items (may contain duplicates)
     */
    sampleMultiple(count) {
        if (!this._isValidCount(count)) {
            return [];
        }

        if (this.isEmpty()) return [];

        const samples = [];
        try {
            for (let i = 0; i < count; i++) {
                const sample = this.sample();
                if (sample !== null) {
                    samples.push(sample);
                }
            }
        } catch (error) {
            throw new Error(`Bag.sampleMultiple: Sampling failed - ${error.message}`);
        }

        return samples;
    }

    /**
     * Sample multiple items without replacement (no duplicates)
     * @param {number} count - Number of items to sample
     * @returns {Array} - Array of sampled items (no duplicates)
     */
    sampleMultipleUnique(count) {
        if (!this._isValidCount(count)) {
            return [];
        }

        if (this.isEmpty()) return [];

        try {
            this.commit();
            const samples = [];
            const usedIndexes = new Set();
            const sampleCount = Math.min(count, this.size());

            for (let i = 0; i < sampleCount; i++) {
                const sampleIndex = this._sampleUniqueIndex(usedIndexes);
                if (sampleIndex !== null) {
                    usedIndexes.add(sampleIndex);
                    samples.push(this.items[sampleIndex].item);
                }
            }

            return samples;
        } catch (error) {
            throw new Error(`Bag.sampleMultipleUnique: Unique sampling failed - ${error.message}`);
        }
    }

    /**
     * Sample single unique index avoiding previously used indexes
     * @private
     * @param {Set} usedIndexes - Set of already used indexes
     * @param {number} maxAttempts - Maximum sampling attempts
     * @returns {number|null} - Sampled index or null if failed
     */
    _sampleUniqueIndex(usedIndexes, maxAttempts = 50) {
        if (this.totalPriority <= 0 || this.cumulativePriorities.length === 0) {
            return null;
        }

        for (let attempts = 0; attempts < maxAttempts; attempts++) {
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

            if (!usedIndexes.has(low)) {
                return low;
            }
        }

        return null; // Failed to find unique index
    }

    /**
     * Validate count parameter for sampling operations
     * @private
     * @param {number} count - Count to validate
     * @returns {boolean} - True if count is valid
     */
    _isValidCount(count) {
        return typeof count === 'number' && isFinite(count) && count > 0;
    }

    /**
     * Convert bag to array of items
     * @returns {Array} - Array of all items in the bag
     */
    toArray() {
        try {
            this.commit();
            return this.items.map(({item}) => item);
        } catch (error) {
            throw new Error(`Bag.toArray: Array conversion failed - ${error.message}`);
        }
    }

    /**
     * Convert bag to array of {item, priority} objects
     * @returns {Array} - Array of {item, priority} objects
     */
    toArrayWithPriorities() {
        try {
            this.commit();
            return [...this.items];
        } catch (error) {
            throw new Error(`Bag.toArrayWithPriorities: Array conversion failed - ${error.message}`);
        }
    }

    /**
     * Create a new bag with filtered items
     * @param {Function} predicate - Filter function
     * @param {Object} options - Options for the new bag
     * @param {number} options.capacity - Capacity for the new bag
     * @returns {Bag} - New bag with filtered items
     */
    filterToNewBag(predicate, options = {}) {
        if (typeof predicate !== 'function') {
            throw new Error('Bag.filterToNewBag: Predicate must be a function');
        }

        const {capacity = this.capacity} = options;
        const newBag = new Bag(capacity);

        try {
            for (const {item, priority} of this.items) {
                try {
                    if (predicate(item, priority)) {
                        newBag.put(item, priority);
                    }
                } catch (error) {
                    // Skip items that cause errors in predicate
                }
            }
            return newBag;
        } catch (error) {
            throw new Error(`Bag.filterToNewBag: Filter operation failed - ${error.message}`);
        }
    }

    /**
     * Check if bag contains an item (by reference equality)
     * @param {*} item - Item to search for
     * @returns {boolean} - True if item is in the bag
     */
    contains(item) {
        try {
            return this.items.some(({item: bagItem}) => bagItem === item);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the priority of a specific item
     * @param {*} item - Item to find priority for
     * @returns {number|null} - Priority of the item or null if not found
     */
    getPriority(item) {
        try {
            const found = this.items.find(({item: bagItem}) => bagItem === item);
            return found ? found.priority : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Update priority of an existing item
     * @param {*} item - Item to update
     * @param {number} newPriority - New priority value
     * @returns {boolean} - True if item was found and updated
     */
    updatePriority(item, newPriority) {
        if (!this._isValidItem(item)) {
            return false;
        }

        newPriority = this._validatePriority(newPriority);

        try {
            for (const entry of this.items) {
                if (entry.item === item) {
                    entry.priority = newPriority;
                    this.isDirty = true;
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}

export default Bag;
