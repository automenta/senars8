/**
 * A strategy that iterates through all possible ordered permutations of premises.
 * This is simple but computationally expensive. Order matters for some rules.
 */
class BruteForceStrategy {
    /**
     * A generator that yields all possible ordered permutations of a given arity from the focus set.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @param {number} arity - The size of the permutations to generate.
     * @yields {Task[]} An array containing a permutation of tasks.
     */
    * selectCombinations(focusSet, arity) {
        if (arity <= 0 || focusSet.length < arity) {
            return;
        }

        // This is a simple implementation for arity 1, 2, 3.
        // A more general recursive solution could be used for higher arities.
        if (arity === 1) {
            for (const task of focusSet) {
                yield [task];
            }
            return;
        }

        if (arity === 2) {
            for (let i = 0; i < focusSet.length; i++) {
                for (let j = 0; j < focusSet.length; j++) {
                    if (i === j) continue;
                    yield [focusSet[i], focusSet[j]];
                }
            }
            return;
        }

        if (arity === 3) {
            for (let i = 0; i < focusSet.length; i++) {
                for (let j = 0; j < focusSet.length; j++) {
                    if (i === j) continue;
                    for (let k = 0; k < focusSet.length; k++) {
                        if (k === i || k === j) continue;
                        yield [focusSet[i], focusSet[j], focusSet[k]];
                    }
                }
            }
            return;
        }

        // A general solution for higher arities would be needed for production systems.
        // For this project, arity is not expected to be > 3.
    }
}

module.exports = BruteForceStrategy;
