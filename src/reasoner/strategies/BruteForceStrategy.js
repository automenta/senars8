class BruteForceStrategy {
    * selectCombinations(focusSet, arity) {
        if (arity <= 0 || focusSet.length < arity) {
            return;
        }

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
    }
}

module.exports = BruteForceStrategy;
