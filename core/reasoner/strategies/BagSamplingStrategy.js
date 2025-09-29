import Bag from '../../utils/bag.js';
import BaseStrategy from './BaseStrategy.js';

class BagSamplingStrategy extends BaseStrategy {
    static name = 'BagSampling';
    #bagCache = new Map();
    #cacheSizeLimit = 100;

    constructor(samplingFactor = 2, cacheSizeLimit = 100) {
        super();
        this.samplingFactor = samplingFactor;
        this.#cacheSizeLimit = cacheSizeLimit;
    }

    #getOrCreateBag(focusSet) {
        const focusSetIds = focusSet.map(task => task.id).sort().join(',');
        if (this.#bagCache.has(focusSetIds)) {
            return this.#bagCache.get(focusSetIds);
        }

        const bag = new Bag(focusSet.length);
        for (const task of focusSet) {
            bag.put(task, task.state.priority);
        }
        bag.commit();

        if (this.#bagCache.size < this.#cacheSizeLimit) {
            this.#bagCache.set(focusSetIds, bag);
        }

        return bag;
    }

    * #sampleUniqueCombination(bag, arity) {
        const combination = [];
        const selectedIds = new Set();
        const maxAttempts = arity * 2;

        for (let attempts = 0; combination.length < arity && attempts < maxAttempts; attempts++) {
            const task = bag.sample();
            if (task && !selectedIds.has(task.id)) {
                combination.push(task);
                selectedIds.add(task.id);
            }
        }

        if (combination.length === arity) {
            yield combination;
        }
    }

    * selectCombinations(focusSet, arity) {
        if (!Array.isArray(focusSet) || focusSet.length < arity) {
            return;
        }

        const bag = this.#getOrCreateBag(focusSet);
        if (bag.size() < arity) {
            return;
        }

        const numSamples = Math.ceil(focusSet.length * this.samplingFactor);
        for (let i = 0; i < numSamples; i++) {
            yield* this.#sampleUniqueCombination(bag, arity);
        }
    }

    clearCache() {
        this.#bagCache.clear();
    }
}

export default BagSamplingStrategy;
