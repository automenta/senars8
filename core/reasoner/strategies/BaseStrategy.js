class BaseStrategy {
    selectCombinations(_tasks, _arity) {
        throw new Error('Method "selectCombinations" must be implemented by subclasses');
    }
}

export default BaseStrategy;
