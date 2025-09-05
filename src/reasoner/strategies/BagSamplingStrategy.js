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
     * A generator that yields pairs of tasks sampled from a Bag.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @yields {Task[]} An array containing a pair of tasks.
     */
    * selectPairs(focusSet) {
        if (focusSet.length < 2) return;

        const bag = new Bag();
        for (const task of focusSet) {
            bag.add(task, task.state.priority);
        }

        if (bag.size() < 2) return;

        const numSamples = Math.ceil(focusSet.length * this.samplingFactor);

        for (let i = 0; i < numSamples; i++) {
            const task1 = bag.sample();
            const task2 = bag.sample();
            if (task1 && task2 && task1.id !== task2.id) {
                yield [task1, task2];
            }
        }
    }

    /**
     * A generator that yields triplets of tasks sampled from a Bag.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @yields {Task[]} An array containing a triplet of tasks.
     */
    * selectTriplets(focusSet) {
        if (focusSet.length < 3) return;

        const bag = new Bag();
        for (const task of focusSet) {
            bag.add(task, task.state.priority);
        }

        if (bag.size() < 3) return;

        const numSamples = Math.ceil(focusSet.length * this.samplingFactor);

        for (let i = 0; i < numSamples; i++) {
            const task1 = bag.sample();
            const task2 = bag.sample();
            const task3 = bag.sample();
            if (task1 && task2 && task3 && task1.id !== task2.id && task1.id !== task3.id && task2.id !== task3.id) {
                yield [task1, task2, task3];
            }
        }
    }
}

module.exports = BagSamplingStrategy;
