import BaseStrategy from '../../../core/reasoner/strategies/BaseStrategy.js';

export default class MockStrategy extends BaseStrategy {
    selectCombinations(tasks, arity) {
        return [];
    }
}
