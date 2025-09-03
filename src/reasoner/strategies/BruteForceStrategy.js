/**
 * A strategy that iterates through all possible combinations of premises.
 * This is simple but computationally expensive.
 */
class BruteForceStrategy {
    /**
     * A generator that yields all possible pairs of tasks from the focus set.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @yields {Task[]} An array containing a pair of tasks.
     */
    *selectPairs(focusSet) {
        for (let i = 0; i < focusSet.length; i++) {
            for (let j = 0; j < focusSet.length; j++) {
                if (i === j) continue;
                yield [focusSet[i], focusSet[j]];
            }
        }
    }

    /**
     * A generator that yields all possible triplets of tasks from the focus set.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @yields {Task[]} An array containing a triplet of tasks.
     */
    *selectTriplets(focusSet) {
        for (let i = 0; i < focusSet.length; i++) {
            for (let j = 0; j < focusSet.length; j++) {
                if (i === j) continue;
                for (let k = 0; k < focusSet.length; k++) {
                    if (k === i || k === j) continue;
                    yield [focusSet[i], focusSet[j], focusSet[k]];
                }
            }
        }
    }
}

module.exports = BruteForceStrategy;
