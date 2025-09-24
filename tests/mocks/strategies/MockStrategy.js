import BaseStrategy from '../../../core/reasoner/strategies/BaseStrategy.js';

export default class MockStrategy extends BaseStrategy {
    selectCombinations(_tasks, _arity) {
        return [];
    }
}
