class Bag {
    constructor(capacity = Infinity) {
        this.capacity = capacity;
        this.items = [];
        this.isDirty = true;
        this.cumulativePriorities = [];
        this.totalPriority = 0;
    }

    put(item, priority) {
        if (typeof priority === 'number' && priority > 0) {
            this.items.push({item, priority});
            this.isDirty = true;
        }
    }

    commit() {
        if (!this.isDirty) {
            return;
        }

        // Sort in descending order of priority
        this.items.sort((a, b) => b.priority - a.priority);

        // Trim to capacity if needed
        if (this.items.length > this.capacity) {
            this.items.length = this.capacity;
        }

        // Recalculate cumulative priorities and total
        this.totalPriority = 0;
        this.cumulativePriorities = [];

        for (let i = 0; i < this.items.length; i++) {
            this.totalPriority += this.items[i].priority;
            this.cumulativePriorities[i] = this.totalPriority;
        }

        this.isDirty = false;
    }

    sample() {
        if (this.isDirty || this.items.length === 0) {
            return null;
        }

        const random = Math.random() * this.totalPriority;

        // Binary search for the item
        let low = 0;
        let high = this.cumulativePriorities.length - 1;

        while (low < high) {
            const mid = (low + high) >>> 1; // Unsigned right shift for faster integer division
            if (random > this.cumulativePriorities[mid]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return this.items[low].item;
    }

    size() {
        return this.items.length;
    }
}

export default Bag;
