import BaseStrategy from './BaseStrategy.js';

class BruteForceStrategy extends BaseStrategy {
    * selectCombinations(focusSet, arity) {
        if (arity <= 0 || focusSet.length < arity) {
            return;
        }

        const indices = new Array(arity).fill(0);
        const combination = new Array(arity);

        while (true) {
            for (let i = 0; i < arity; i++) {
                combination[i] = focusSet[indices[i]];
            }
            yield combination;

            let next = arity - 1;
            while (next >= 0 && (indices[next] + 1 >= focusSet.length)) {
                next--;
            }

            if (next < 0) {
                return;
            }

            indices[next]++;
            for (let i = next + 1; i < arity; i++) {
                indices[i] = 0;
            }
        }
    }
}

export default BruteForceStrategy;
