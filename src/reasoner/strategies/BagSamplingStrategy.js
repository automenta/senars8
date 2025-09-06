const Bag = require('../../utils/Bag');

/**
 * A strategy that uses a Bag data structure to sample premises based on priority.
 * This is much more efficient than the brute-force approach for large focus sets.
 */
class BagSamplingStrategy {
    constructor(samplingFactor = 2) {
        this.samplingFactor = samplingFactor;
    }

    /**
     * A generator that yields combinations of tasks sampled from a Bag.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @param {number} arity - The size of the combinations to generate.
     * @yields {Task[]} An array containing a combination of tasks.
     */
    * selectCombinations(focusSet, arity) {
        if (focusSet.length < arity) return;

        const bag = new Bag(focusSet.length); // Set capacity for the bag
        for (const task of focusSet) {
            bag.put(task, task.state.priority); // Use the new 'put' method
        }

        bag.commit(); // Commit the bag to prepare for efficient sampling

        if (bag.size() < arity) return;

        const numSamples = Math.ceil(focusSet.length * this.samplingFactor);

        for (let i = 0; i < numSamples; i++) {
            const combination = [];
            const ids = new Set();

            // Try to get a unique set of tasks of size 'arity'
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
}

module.exports = BagSamplingStrategy;
