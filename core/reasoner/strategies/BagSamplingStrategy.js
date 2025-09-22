import Bag from '../../utils/bag.js';

class BagSamplingStrategy {
    constructor(samplingFactor = 2) {
        this.samplingFactor = samplingFactor;
        this._bagCache = new Map();
    }

    * selectCombinations(focusSet, arity) {
        if (!Array.isArray(focusSet) || focusSet.length < arity) {
            return;
        }

        const focusSetIds = focusSet.map(task => task.id).sort().join(',');
        const cacheKey = `${focusSetIds}:${arity}`;

        let bag;
        if (this._bagCache.has(cacheKey)) {
            bag = this._bagCache.get(cacheKey);
        } else {
            bag = new Bag(focusSet.length);
            for (const task of focusSet) {
                bag.put(task, task.state.priority);
            }
            bag.commit();

            if (this._bagCache.size < 100) {
                this._bagCache.set(cacheKey, bag);
            }
        }

        if (bag.size() < arity) {
            return;
        }

        const numSamples = Math.ceil(focusSet.length * this.samplingFactor);

        for (let i = 0; i < numSamples; i++) {
            const combination = [];
            const ids = new Set();

            let attempts = 0;
            while (combination.length < arity && attempts < arity * 2) {
                const task = bag.sample();
                if (task && !ids.has(task.id)) {
                    combination.push(task);
                    ids.add(task.id);
                }
                attempts++;
            }

            if (combination.length === arity) {
                yield combination;
            }
        }
    }

    clearCache() {
        this._bagCache.clear();
    }
}

export default BagSamplingStrategy;
