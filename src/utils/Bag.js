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
            this.items.push({
                item,
                priority
            });
            this.isDirty = true;
        }
    }

    commit() {
        if (!this.isDirty) return;

        this.items.sort((a, b) => b.priority - a.priority);
        if (this.items.length > this.capacity) {
            this.items.length = this.capacity;
        }

        this.totalPriority = 0;
        this.cumulativePriorities = new Array(this.items.length);
        for (let i = 0; i < this.items.length; i++) {
            this.totalPriority += this.items[i].priority;
            this.cumulativePriorities[i] = this.totalPriority;
        }

        this.isDirty = false;
    }

    sample() {
        if (this.isDirty || this.isEmpty()) return null;

        const random = Math.random() * this.totalPriority;
        let low = 0,
            high = this.cumulativePriorities.length - 1;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (random > this.cumulativePriorities[mid]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return this.items[low]?.item ?? null;
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
        this.cumulativePriorities = [];
        this.totalPriority = 0;
        this.isDirty = true;
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

export default Bag;
