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
            this.items.push({ item, priority });
            this.isDirty = true;
        }
    }

    commit() {
        if (!this.isDirty) {
            return;
        }

        this.items.sort((a, b) => b.priority - a.priority);

        if (this.items.length > this.capacity) {
            this.items.length = this.capacity;
        }

        this.totalPriority = 0;
        this.cumulativePriorities = [];
        for (const entry of this.items) {
            this.totalPriority += entry.priority;
            this.cumulativePriorities.push(this.totalPriority);
        }

        this.isDirty = false;
    }

    sample() {
        if (this.isDirty || this.items.length === 0) {
            return null;
        }

        const random = Math.random() * this.totalPriority;
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

    size() {
        return this.items.length;
    }
}

module.exports = Bag;
