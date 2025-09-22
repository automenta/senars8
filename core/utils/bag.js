class Bag {
    constructor(capacity = Infinity) {
        this.capacity = capacity;
        this.items = [];
        this.isDirty = true;
        this.cumulativePriorities = [];
        this.totalPriority = 0;
    }

    put(item, priority) {
        // Early return for invalid priorities
        if (typeof priority !== 'number' || priority <= 0) return;

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
}

export default Bag;
