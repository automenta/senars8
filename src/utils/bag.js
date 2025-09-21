/**
 * A simple Bag data structure for weighted random sampling.
 */
class Bag {
    constructor() {
        this.items = [];
        this.weights = [];
        this.totalWeight = 0;
    }

    put(item, weight = 1) {
        this.items.push(item);
        this.weights.push(weight);
        this.totalWeight += weight;
    }

    commit() {
        // No-op in this simple implementation
    }

    sample() {
        if (this.items.length === 0) {
            return undefined;
        }

        let random = Math.random() * this.totalWeight;
        for (let i = 0; i < this.items.length; i++) {
            if (random < this.weights[i]) {
                return this.items[i];
            }
            random -= this.weights[i];
        }
        return this.items[this.items.length - 1];
    }

    size() {
        return this.items.length;
    }
}

export default Bag;
